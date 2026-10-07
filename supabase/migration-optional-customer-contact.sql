-- ============================================================================
-- LUMIÈRE BEAUTY — optional customer contact migration
-- Run in Supabase SQL Editor AFTER supabase/migration-fix-product-id-uuid.sql.
--
-- CONTEXT: checkout no longer collects customer WhatsApp/phone numbers.
-- The columns STAY (legacy rows + admin display keep working) but become
-- optional for new COD orders. No data is touched, RLS is unchanged.
--
-- WHAT THIS DOES (all additive + idempotent, safe to rerun):
--  1. orders.whatsapp becomes nullable (was NOT NULL).
--  2. get_or_create_customer() returns NULL instead of raising when no
--     WhatsApp is given (checkout then stores customer_id = NULL).
--  3. create_cod_order() accepts empty p_whatsapp/p_phone: skips the
--     customer upsert, stores NULL contact fields. All other validation
--     (name, address, delivery method, items, total) is unchanged, and the
--     UUID-safe product_id handling from migration-fix-product-id-uuid.sql
--     is preserved verbatim.
--
-- SAFE: no DROP TABLE, no DELETEs, no column removals, no RLS changes.
-- ============================================================================

-- 1. New COD orders may omit the customer WhatsApp number.
alter table public.orders alter column whatsapp drop not null;

-- 2. Customer upsert: empty WhatsApp → NULL (no row), never an error.
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
  -- No contact collected (new checkout) → order stays guest (customer_id NULL).
  if p_whatsapp is null or btrim(p_whatsapp) = '' then
    return null;
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

-- 3. Atomic COD order creation with optional customer contact.
create or replace function public.create_cod_order(
  p_first text,
  p_last text,
  p_whatsapp text,
  p_whatsapp_norm text,
  p_phone text,
  p_governorate text,
  p_area text,
  p_city text,
  p_address text,
  p_building text,
  p_apartment text,
  p_notes text,
  p_delivery_method text,
  p_subtotal numeric,
  p_delivery_fee numeric,
  p_discount numeric,
  p_total numeric,
  p_items jsonb
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid := null;
  v_order_id uuid;
  v_order_number text;
  v_item jsonb;
  v_pid text;
  v_attempt int;
begin
  -- ---- validate (mirrors frontend validation; DB is the final gate) ----
  -- NOTE: p_whatsapp / p_phone are intentionally NOT validated: new
  -- checkouts send "" and legacy clients may still send numbers.
  if p_first is null or btrim(p_first) = '' then
    raise exception 'first name is required';
  end if;
  if p_last is null or btrim(p_last) = '' then
    raise exception 'last name is required';
  end if;
  if p_governorate is null or btrim(p_governorate) = '' then
    raise exception 'governorate is required';
  end if;
  if p_area is null or btrim(p_area) = '' then
    raise exception 'area is required';
  end if;
  if p_address is null or btrim(p_address) = '' then
    raise exception 'address is required';
  end if;
  if p_delivery_method not in ('standard', 'express') then
    raise exception 'invalid delivery method';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'cart is empty';
  end if;
  if p_total is null or p_total < 0 then
    raise exception 'invalid total';
  end if;

  -- ---- customer (skipped when no WhatsApp collected) ----
  if p_whatsapp is not null and btrim(p_whatsapp) <> '' then
    insert into public.customers (whatsapp, whatsapp_normalized, first_name, last_name, phone)
    values (
      btrim(p_whatsapp),
      nullif(p_whatsapp_norm, ''),
      nullif(btrim(coalesce(p_first, ''), ''), ''),
      nullif(btrim(coalesce(p_last, ''), ''), ''),
      nullif(btrim(coalesce(p_phone, '')), '')
    )
    on conflict (whatsapp) do update set
      first_name = excluded.first_name,
      last_name = excluded.last_name,
      phone = excluded.phone,
      whatsapp_normalized = excluded.whatsapp_normalized
    returning id into v_customer_id;
  end if;

  -- ---- order (server-generated number, retry on the ~1/900k collision) ----
  v_attempt := 0;
  loop
    v_attempt := v_attempt + 1;
    v_order_number := 'LM-' || lpad(floor(random() * 900000 + 100000)::int::text, 6, '0');
    begin
      insert into public.orders (
        order_number, customer_id,
        first_name, last_name, whatsapp, whatsapp_normalized, phone,
        governorate, area, city, address, building, apartment, notes,
        delivery_method, payment_method, payment_status,
        subtotal, delivery_fee, discount, total, status
      ) values (
        v_order_number, v_customer_id,
        btrim(p_first), btrim(p_last),
        nullif(btrim(coalesce(p_whatsapp, '')), ''),
        nullif(p_whatsapp_norm, ''), nullif(btrim(coalesce(p_phone, '')), ''),
        btrim(p_governorate), btrim(p_area),
        nullif(btrim(coalesce(p_city, '')), ''),
        btrim(p_address),
        nullif(btrim(coalesce(p_building, '')), ''),
        nullif(btrim(coalesce(p_apartment, '')), ''),
        nullif(p_notes, ''),
        p_delivery_method, 'cod', 'pending',
        p_subtotal, p_delivery_fee, coalesce(p_discount, 0), p_total, 'pending'
      )
      returning id into v_order_id;
      exit; -- success
    exception when unique_violation then
      if v_attempt >= 5 then raise; end if;
      -- else loop and generate a fresh number
    end;
  end loop;

  -- ---- items ----
  -- product_id column is uuid; the JSON payload carries text. Cast ONLY
  -- validated UUID strings — anything else becomes NULL (nullable FK) so a
  -- seed/demo id can never fail checkout. Name/price/qty/image snapshot kept.
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_pid := nullif(v_item->>'product_id', '');
    insert into public.order_items (order_id, product_id, name_en, name_ar, price, qty, image)
    values (
      v_order_id,
      case
        when v_pid ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          then v_pid::uuid
        else null
      end,
      nullif(v_item->>'name_en', ''),
      nullif(v_item->>'name_ar', ''),
      (v_item->>'price')::numeric,
      greatest(1, (v_item->>'qty')::int),
      nullif(v_item->>'image', '')
    );
  end loop;

  -- ---- best-effort stock decrement (never fails the order) ----
  begin
    for v_item in select * from jsonb_array_elements(p_items) loop
      v_pid := nullif(v_item->>'product_id', '');
      continue when v_pid is null
        or v_pid !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
      update public.products
      set stock = greatest(0, stock - greatest(1, (v_item->>'qty')::int))
      where id = v_pid::uuid
        and stock > 0;
    end loop;
  exception when others then
    -- stock is informational; a bad product_id must not fail checkout
    null;
  end;

  return v_order_number;
end;
$$;

grant execute on function public.create_cod_order(
  text, text, text, text, text, text, text, text, text, text, text, text, text,
  numeric, numeric, numeric, numeric, jsonb
) to anon, authenticated;

grant execute on function public.get_or_create_customer(text, text, text, text, text) to anon, authenticated;

-- VERIFY (read-only checks after Run):
--   select proname from pg_proc where proname in ('create_cod_order', 'get_or_create_customer');
--   select is_nullable from information_schema.columns
--    where table_name = 'orders' and column_name = 'whatsapp';
--   -- is_nullable must be "YES".
