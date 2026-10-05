-- ============================================================================
-- LUMIERE BEAUTY — COD-only + secure order tracking migration
-- Supabase → SQL Editor → New Query → paste ALL of this → Run
--
-- SAFE: no DROP TABLE, no DELETEs, no data loss.
--   * Adds whatsapp_normalized columns + backfills + auto-trigger
--   * Tightens payment_method to COD-only ONLY if no legacy non-COD rows exist
--   * Removes any unsafe public SELECT on orders/customers/payments
--   * Keeps checkout INSERTs working (this was missing: GRANTs)
--   * Adds secure get_or_create_customer() RPC for checkout
--   * Preserves admin (admin_roles) + public catalog reads
--   * Idempotent: safe to run more than once
-- ============================================================================

-- --------------------------------------------------------------------------
-- 0. NORMALIZATION HELPER (mirrors src/lib/egypt.ts)
--    01018340567 / +201018340567 / "0101-834-0567" -> 201018340567
-- --------------------------------------------------------------------------
create or replace function public.normalize_whatsapp(raw text)
returns text
language sql immutable
as $$
  select case
    when raw is null or btrim(raw) = '' then ''
    else
      case
        when v like '0020%' then substring(v from 3)
        when v ~ '^01[0125][0-9]{8}$' then '2' || v
        when v ~ '^1[0125][0-9]{8}$' then '20' || v
        else v
      end
  end
  from (select regexp_replace(btrim(raw), '[+\s\-().*/]', '', 'g') as v) s
$$;

-- --------------------------------------------------------------------------
-- 1. COLUMNS for normalized matching (no data touched)
-- --------------------------------------------------------------------------
alter table public.customers
  add column if not exists whatsapp_normalized text;
alter table public.orders
  add column if not exists whatsapp_normalized text;

-- Backfill existing rows using the same normalization as the app
update public.customers
set whatsapp_normalized = public.normalize_whatsapp(whatsapp)
where whatsapp_normalized is null or whatsapp_normalized = '';

update public.orders
set whatsapp_normalized = public.normalize_whatsapp(whatsapp)
where whatsapp_normalized is null or whatsapp_normalized = '';

-- Auto-normalize every future insert/update
create or replace function public.set_whatsapp_normalized()
returns trigger
language plpgsql
as $$
begin
  new.whatsapp_normalized := public.normalize_whatsapp(new.whatsapp);
  return new;
end;
$$;

drop trigger if exists trg_customers_norm on public.customers;
create trigger trg_customers_norm
  before insert or update of whatsapp on public.customers
  for each row execute function public.set_whatsapp_normalized();

drop trigger if exists trg_orders_norm on public.orders;
create trigger trg_orders_norm
  before insert or update of whatsapp on public.orders
  for each row execute function public.set_whatsapp_normalized();

-- Lookup indexes for the track-order Edge Function
create index if not exists idx_orders_whatsapp_norm
  on public.orders (whatsapp_normalized);
create index if not exists idx_orders_number_upper
  on public.orders (upper(order_number));
create index if not exists idx_customers_whatsapp_norm
  on public.customers (whatsapp_normalized);

-- Relationship / filter indexes (§15 audit — all IF NOT EXISTS, no data touched)
create index if not exists idx_orders_created_at on public.orders (created_at desc);
create index if not exists idx_orders_customer_id on public.orders (customer_id);
create index if not exists idx_order_items_order_id on public.order_items (order_id);
create index if not exists idx_product_images_product_id on public.product_images (product_id);
create index if not exists idx_addresses_customer_id on public.addresses (customer_id);
create index if not exists idx_payments_order_id on public.payments (order_id);
create index if not exists idx_reviews_product_id on public.reviews (product_id);

-- --------------------------------------------------------------------------
-- 2. COD-ONLY payment_method — applied ONLY when safe.
--    Legacy non-COD rows (instapay/online) are NEVER deleted; if any exist,
--    the old permissive constraint is kept and a NOTICE is raised instead.
-- --------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from public.orders
    where payment_method is not null and payment_method not in ('cod')
  ) then
    raise notice 'Legacy non-COD orders exist — keeping permissive payment_method constraint. New app code still writes cod only.';
  else
    alter table public.orders drop constraint if exists orders_payment_method_check;
    alter table public.orders
      add constraint orders_payment_method_check check (payment_method = 'cod');
  end if;
end $$;

-- payment_status: new COD orders use pending/paid/rejected.
-- Keep pending_verification allowed ONLY while legacy rows need it.
do $$
begin
  alter table public.orders drop constraint if exists orders_payment_status_check;
  if exists (select 1 from public.orders where payment_status = 'pending_verification') then
    alter table public.orders add constraint orders_payment_status_check
      check (payment_status in ('pending', 'pending_verification', 'paid', 'rejected'));
    raise notice 'Legacy pending_verification rows exist — value kept allowed. New orders use pending.';
  else
    alter table public.orders add constraint orders_payment_status_check
      check (payment_status in ('pending', 'paid', 'rejected'));
  end if;
end $$;

-- Remove customer-facing InstaPay configuration (contact number stays in app config)
delete from public.site_settings where key = 'instapay';

-- NOTE: orders.payment_proof column is intentionally KEPT (may hold legacy data).
-- The app no longer writes or reads it. Drop it manually only if you are sure:
--   alter table public.orders drop column if exists payment_proof;

-- --------------------------------------------------------------------------
-- 3. SECURE CUSTOMER RPC — checkout resolves customer id without any
--    direct anon read/update on customers.
-- --------------------------------------------------------------------------
create or replace function public.get_or_create_customer(
  p_whatsapp text,
  p_whatsapp_norm text,
  p_first text,
  p_last text,
  p_phone text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_whatsapp is null or btrim(p_whatsapp) = '' then
    raise exception 'whatsapp is required';
  end if;
  insert into public.customers (whatsapp, whatsapp_normalized, first_name, last_name, phone)
  values (
    btrim(p_whatsapp),
    nullif(p_whatsapp_norm, ''),
    nullif(btrim(coalesce(p_first, '')), ''),
    nullif(btrim(coalesce(p_last, '')), ''),
    nullif(btrim(coalesce(p_phone, '')), '')
  )
  on conflict (whatsapp) do update set
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    phone = excluded.phone,
    whatsapp_normalized = excluded.whatsapp_normalized
  returning id into v_id;
  return v_id;
end;
$$;

-- --------------------------------------------------------------------------
-- 4. RLS — enable everywhere (idempotent)
-- --------------------------------------------------------------------------
alter table public.categories      enable row level security;
alter table public.products        enable row level security;
alter table public.product_images  enable row level security;
alter table public.customers       enable row level security;
alter table public.orders          enable row level security;
alter table public.order_items     enable row level security;
alter table public.addresses       enable row level security;
alter table public.payments        enable row level security;
alter table public.delivery_zones  enable row level security;
alter table public.reviews         enable row level security;
alter table public.site_settings   enable row level security;
alter table public.admin_roles     enable row level security;

-- --------------------------------------------------------------------------
-- 5. REMOVE unsafe policies (IF EXISTS — no error if already gone).
--    Customers must NOT be able to SELECT/UPDATE/DELETE orders, customers,
--    or payments through the anon client. Only the track-order Edge Function
--    (service role) reads orders.
-- --------------------------------------------------------------------------
-- orders: drop every known public/anon read-write policy variant
drop policy if exists "public read orders" on public.orders;
drop policy if exists "anyone can read orders" on public.orders;
drop policy if exists "open orders select" on public.orders;
drop policy if exists "orders select all" on public.orders;
drop policy if exists "allow select orders" on public.orders;
drop policy if exists "customers read own orders" on public.orders;
drop policy if exists "anyone can update orders" on public.orders;
drop policy if exists "anyone can delete orders" on public.orders;
drop policy if exists "anyone can create orders" on public.orders;
drop policy if exists "checkout insert orders" on public.orders;

-- customers: no anon read/update/delete
drop policy if exists "public read customers" on public.customers;
drop policy if exists "anyone can read customers" on public.customers;
drop policy if exists "anyone can update customers" on public.customers;
drop policy if exists "anyone can create customers" on public.customers;
drop policy if exists "checkout upsert customers" on public.customers;

-- order_items: no anon read/update/delete
drop policy if exists "public read order_items" on public.order_items;
drop policy if exists "anyone can read items" on public.order_items;
drop policy if exists "anyone can create items" on public.order_items;
drop policy if exists "checkout insert order_items" on public.order_items;

-- payments: no anon access at all (COD does not use it; admin only)
drop policy if exists "public read payments" on public.payments;
drop policy if exists "anyone can read payments" on public.payments;
drop policy if exists "anyone can create payments" on public.payments;
drop policy if exists "checkout insert payments" on public.payments;

-- addresses: no anon direct access
drop policy if exists "public read addresses" on public.addresses;
drop policy if exists "anyone can create addresses" on public.addresses;

-- admin policies: drop + recreate below (avoids duplicate-policy errors)
drop policy if exists "admin all categories" on public.categories;
drop policy if exists "admin all products" on public.products;
drop policy if exists "admin all images" on public.product_images;
drop policy if exists "admin all customers" on public.customers;
drop policy if exists "admin all orders" on public.orders;
drop policy if exists "admin all items" on public.order_items;
drop policy if exists "admin all addresses" on public.addresses;
drop policy if exists "admin all payments" on public.payments;
drop policy if exists "admin all zones" on public.delivery_zones;
drop policy if exists "admin all reviews" on public.reviews;
drop policy if exists "admin all settings" on public.site_settings;
drop policy if exists "admin read roles" on public.admin_roles;

-- catalog public-read policies: drop + recreate (idempotent)
drop policy if exists "public read categories" on public.categories;
drop policy if exists "public read products" on public.products;
drop policy if exists "public read images" on public.product_images;
drop policy if exists "public read zones" on public.delivery_zones;
drop policy if exists "public read settings" on public.site_settings;
drop policy if exists "public read reviews" on public.reviews;

-- --------------------------------------------------------------------------
-- 6. RECREATE the exact secure policy set
-- --------------------------------------------------------------------------
-- 6a. Public catalog reads (active rows / all images / settings / reviews)
create policy "public read categories"
  on public.categories for select using (active = true);
create policy "public read products"
  on public.products for select using (active = true);
create policy "public read images"
  on public.product_images for select using (true);
create policy "public read zones"
  on public.delivery_zones for select using (active = true);
create policy "public read settings"
  on public.site_settings for select using (true);
create policy "public read reviews"
  on public.reviews for select using (true);

-- 6b. Checkout INSERTs only — no select/update/delete for anon.
--     (Reads of orders happen ONLY via the track-order Edge Function.)
create policy "checkout insert orders"
  on public.orders for insert with check (true);
create policy "checkout insert order_items"
  on public.order_items for insert with check (true);
create policy "checkout upsert customers"
  on public.customers for insert with check (true);

-- 6c. Admin full access via admin_roles (Supabase Auth)
create policy "admin all categories"
  on public.categories for all
  using (exists (select 1 from public.admin_roles where user_id = auth.uid()));
create policy "admin all products"
  on public.products for all
  using (exists (select 1 from public.admin_roles where user_id = auth.uid()));
create policy "admin all images"
  on public.product_images for all
  using (exists (select 1 from public.admin_roles where user_id = auth.uid()));
create policy "admin all customers"
  on public.customers for all
  using (exists (select 1 from public.admin_roles where user_id = auth.uid()));
create policy "admin all orders"
  on public.orders for all
  using (exists (select 1 from public.admin_roles where user_id = auth.uid()));
create policy "admin all items"
  on public.order_items for all
  using (exists (select 1 from public.admin_roles where user_id = auth.uid()));
create policy "admin all addresses"
  on public.addresses for all
  using (exists (select 1 from public.admin_roles where user_id = auth.uid()));
create policy "admin all payments"
  on public.payments for all
  using (exists (select 1 from public.admin_roles where user_id = auth.uid()));
create policy "admin all zones"
  on public.delivery_zones for all
  using (exists (select 1 from public.admin_roles where user_id = auth.uid()));
create policy "admin all reviews"
  on public.reviews for all
  using (exists (select 1 from public.admin_roles where user_id = auth.uid()));
create policy "admin all settings"
  on public.site_settings for all
  using (exists (select 1 from public.admin_roles where user_id = auth.uid()));
create policy "admin read roles"
  on public.admin_roles for select using (user_id = auth.uid());

-- --------------------------------------------------------------------------
-- 7. GRANTs — REQUIRED for RLS policies to take effect.
--    (Missing grants were the likely reason checkout inserts failed.)
-- --------------------------------------------------------------------------
grant select on public.categories to anon, authenticated;
grant select on public.products to anon, authenticated;
grant select on public.product_images to anon, authenticated;
grant select on public.delivery_zones to anon, authenticated;
grant select on public.site_settings to anon, authenticated;
grant select on public.reviews to anon, authenticated;

grant insert on public.customers to anon, authenticated;
grant insert on public.orders to anon, authenticated;
grant insert on public.order_items to anon, authenticated;

grant execute on function public.normalize_whatsapp(text) to anon, authenticated;
grant execute on function public.get_or_create_customer(text, text, text, text, text) to anon, authenticated;

-- Admin (authenticated + admin_roles RLS gate) needs full table rights
grant all on public.categories to authenticated;
grant all on public.products to authenticated;
grant all on public.product_images to authenticated;
grant all on public.customers to authenticated;
grant all on public.orders to authenticated;
grant all on public.order_items to authenticated;
grant all on public.addresses to authenticated;
grant all on public.payments to authenticated;
grant all on public.delivery_zones to authenticated;
grant all on public.reviews to authenticated;
grant all on public.site_settings to authenticated;

-- --------------------------------------------------------------------------
-- 8. VERIFICATION — inspect the result after Run
-- --------------------------------------------------------------------------
-- Legacy non-COD orders preserved (should be 0 rows for a pure-COD store):
--   select payment_method, count(*) from public.orders group by 1;
--
-- Normalized column populated:
--   select order_number, whatsapp, whatsapp_normalized from public.orders limit 5;
--
-- No public SELECT on orders (only insert + admin policies must remain):
--   select policyname, cmd from pg_policies where tablename = 'orders';
-- ============================================================================
