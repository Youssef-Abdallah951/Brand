-- LUMIÈRE Beauty — Supabase schema (fresh install, COD-only)
-- Run in Supabase SQL editor.
-- Existing project? Run supabase/migration-cod-tracking.sql instead.

-- Categories
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name_en text not null,
  name_ar text not null,
  image text,
  active boolean default true,
  created_at timestamptz default now()
);

-- Products
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  category_id uuid references categories(id) on delete set null,
  name_en text not null,
  name_ar text not null,
  desc_en text,
  desc_ar text,
  price numeric(10,2) not null check (price >= 0),
  compare_at numeric(10,2),
  stock int default 0 check (stock >= 0),
  rating numeric(2,1) default 4.5,
  reviews_count int default 0,
  featured boolean default false,
  bestseller boolean default false,
  active boolean default true,
  ingredients text,
  created_at timestamptz default now()
);
create index if not exists idx_products_cat on products(category_id);
create index if not exists idx_products_slug on products(slug);
create index if not exists idx_products_active on products(active);

create table if not exists product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  url text not null,
  sort int default 0
);

-- Customers (keyed by WhatsApp, no email)
create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  whatsapp text unique not null,
  whatsapp_normalized text,
  first_name text,
  last_name text,
  phone text,
  created_at timestamptz default now()
);
create index if not exists idx_customers_whatsapp_norm
  on customers (whatsapp_normalized);

-- Orders — COD ONLY
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique not null,
  customer_id uuid references customers(id) on delete set null,
  first_name text not null,
  last_name text not null,
  whatsapp text not null,
  whatsapp_normalized text,
  phone text,
  governorate text not null,
  area text not null,
  city text,
  address text not null,
  building text,
  apartment text,
  notes text,
  delivery_method text not null check (delivery_method in ('standard','express')),
  payment_method text not null default 'cod' check (payment_method = 'cod'),
  payment_status text default 'pending' check (payment_status in ('pending','paid','rejected')),
  payment_proof text,
  subtotal numeric(10,2) not null,
  delivery_fee numeric(10,2) default 0,
  discount numeric(10,2) default 0,
  total numeric(10,2) not null,
  status text default 'pending' check (status in ('pending','confirmed','preparing','out_for_delivery','delivered','cancelled')),
  created_at timestamptz default now()
);
create index if not exists idx_orders_number on orders(order_number);
create index if not exists idx_orders_number_upper on orders (upper(order_number));
create index if not exists idx_orders_whatsapp on orders(whatsapp);
create index if not exists idx_orders_whatsapp_norm on orders (whatsapp_normalized);
create index if not exists idx_orders_status on orders(status);
create index if not exists idx_orders_created_at on orders (created_at desc);
create index if not exists idx_orders_customer_id on orders (customer_id);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  name_en text, name_ar text,
  price numeric(10,2) not null,
  qty int not null check (qty > 0),
  image text
);

create table if not exists addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete cascade,
  governorate text, area text, city text, address text,
  building text, apartment text,
  is_default boolean default false
);

-- Kept for legacy records only — COD checkout never writes here.
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  method text not null,
  status text default 'pending',
  proof_url text,
  amount numeric(10,2),
  created_at timestamptz default now()
);

create table if not exists delivery_zones (
  id uuid primary key default gen_random_uuid(),
  governorate_en text not null,
  governorate_ar text not null,
  standard_fee numeric(10,2) default 60,
  express_fee numeric(10,2) default 120,
  eta_en text, eta_ar text,
  active boolean default true
);

create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  customer_name text,
  rating int check (rating between 1 and 5),
  comment text,
  created_at timestamptz default now()
);

create table if not exists site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz default now()
);

insert into site_settings(key, value) values
  ('admin_phone', '{"local":"01018340567","intl":"201018340567"}'::jsonb),
  ('delivery', '{"standardFee":60,"expressFee":120,"freeThreshold":1500}'::jsonb)
on conflict (key) do nothing;

-- Admin roles (Supabase Auth only)
create table if not exists admin_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','owner')),
  created_at timestamptz default now()
);

-- Normalization (mirrors src/lib/egypt.ts)
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

-- Secure customer upsert for checkout (anon has no direct read/update)
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

-- RLS
alter table categories enable row level security;
alter table products enable row level security;
alter table product_images enable row level security;
alter table customers enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table addresses enable row level security;
alter table payments enable row level security;
alter table delivery_zones enable row level security;
alter table reviews enable row level security;
alter table site_settings enable row level security;
alter table admin_roles enable row level security;

-- Public catalog reads
create policy "public read categories" on categories for select using (active = true);
create policy "public read products" on products for select using (active = true);
create policy "public read images" on product_images for select using (true);
create policy "public read zones" on delivery_zones for select using (active = true);
create policy "public read settings" on site_settings for select using (true);
create policy "public read reviews" on reviews for select using (true);

-- Checkout INSERTs only. Order reads happen ONLY via the track-order
-- Edge Function (service role). No public SELECT on orders/customers/payments.
create policy "checkout insert orders" on orders for insert with check (true);
create policy "checkout insert order_items" on order_items for insert with check (true);
create policy "checkout upsert customers" on customers for insert with check (true);

-- Admin full access via admin_roles
create policy "admin all categories" on categories for all using (exists (select 1 from admin_roles where user_id = auth.uid()));
create policy "admin all products" on products for all using (exists (select 1 from admin_roles where user_id = auth.uid()));
create policy "admin all images" on product_images for all using (exists (select 1 from admin_roles where user_id = auth.uid()));
create policy "admin all customers" on customers for all using (exists (select 1 from admin_roles where user_id = auth.uid()));
create policy "admin all orders" on orders for all using (exists (select 1 from admin_roles where user_id = auth.uid()));
create policy "admin all items" on order_items for all using (exists (select 1 from admin_roles where user_id = auth.uid()));
create policy "admin all addresses" on addresses for all using (exists (select 1 from admin_roles where user_id = auth.uid()));
create policy "admin all payments" on payments for all using (exists (select 1 from admin_roles where user_id = auth.uid()));
create policy "admin all zones" on delivery_zones for all using (exists (select 1 from admin_roles where user_id = auth.uid()));
create policy "admin all reviews" on reviews for all using (exists (select 1 from admin_roles where user_id = auth.uid()));
create policy "admin all settings" on site_settings for all using (exists (select 1 from admin_roles where user_id = auth.uid()));
create policy "admin read roles" on admin_roles for select using (user_id = auth.uid());

-- GRANTs (required for RLS policies to take effect)
grant select on categories to anon, authenticated;
grant select on products to anon, authenticated;
grant select on product_images to anon, authenticated;
grant select on delivery_zones to anon, authenticated;
grant select on site_settings to anon, authenticated;
grant select on reviews to anon, authenticated;
grant insert on customers to anon, authenticated;
grant insert on orders to anon, authenticated;
grant insert on order_items to anon, authenticated;
grant execute on function normalize_whatsapp(text) to anon, authenticated;
grant execute on function get_or_create_customer(text, text, text, text, text) to anon, authenticated;
grant all on categories to authenticated;
grant all on products to authenticated;
grant all on product_images to authenticated;
grant all on customers to authenticated;
grant all on orders to authenticated;
grant all on order_items to authenticated;
grant all on addresses to authenticated;
grant all on payments to authenticated;
grant all on delivery_zones to authenticated;
grant all on reviews to authenticated;
grant all on site_settings to authenticated;

-- Seed zones
insert into delivery_zones(governorate_en, governorate_ar, standard_fee, express_fee, eta_en, eta_ar) values
  ('Cairo','القاهرة',60,110,'2-4 days','2-4 أيام'),
  ('Giza','الجيزة',60,110,'2-4 days','2-4 أيام'),
  ('Alexandria','الإسكندرية',70,130,'3-5 days','3-5 أيام'),
  ('Other','أخرى',80,150,'3-6 days','3-6 أيام')
on conflict do nothing;
