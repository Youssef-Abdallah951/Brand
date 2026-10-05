-- ============================================================================
-- LUMIERE BEAUTY — fix-checkout migration (ADDITIVE, idempotent, no data loss)
-- Run in Supabase SQL Editor AFTER supabase/migration-cod-tracking.sql.
--
-- ROOT CAUSES FIXED:
--  1. Checkout INSERT with `.select("id").single()` fails under RLS:
--     anon has INSERT-only policies on orders/order_items (no SELECT), and
--     PostgREST INSERT...RETURNING requires a SELECT policy. Result: every
--     checkout threw "Order creation failed" -> UI showed
--     "تعذر الاتصال بالخادم". Fix: atomic SECURITY DEFINER RPC
--     `create_cod_order()` performs customer-upsert + order + items +
--     best-effort stock decrement server-side and returns the order_number.
--     The browser never needs SELECT on orders/customers.
--  2. Admin guard `admin_roles` SELECT fails: no GRANT existed for the
--     anon/authenticated roles, so even real admins were bounced to login.
--
-- SAFE: no DROP TABLE, no DELETEs, no column removals. Creates one function,
-- grants one missing SELECT, grants EXECUTE. Safe to run more than once.
-- ============================================================================

-- 1. Missing grant: admin guard reads admin_roles as `authenticated`.
grant select on public.admin_roles to authenticated;

-- 2. Atomic COD order creation (anon-callable, all-or-nothing).
--    p_items: jsonb array of
--      {product_id, name_en, name_ar, price, qty, image}
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
  v_attempt int;
begin
  -- ---- validate (mirrors frontend validation; DB is the final gate) ----
  if p_first is null or btrim(p_first) = '' then
    raise exception 'first name is required';
  end if;
  if p_last is null or btrim(p_last) = '' then
    raise exception 'last name is required';
  end if;
  if p_whatsapp is null or btrim(p_whatsapp) = '' then
    raise exception 'whatsapp is required';
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

  -- ---- customer (same logic as get_or_create_customer, inline so the
  --      whole checkout is one atomic call) ----
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
        btrim(p_first), btrim(p_last), btrim(p_whatsapp),
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
  for v_item in select * from jsonb_array_elements(p_items) loop
    insert into public.order_items (order_id, product_id, name_en, name_ar, price, qty, image)
    values (
      v_order_id,
      nullif(v_item->>'product_id', ''),
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
      update public.products
      set stock = greatest(0, stock - greatest(1, (v_item->>'qty')::int))
      where id = nullif(v_item->>'product_id', '')::uuid
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

-- VERIFY (read-only checks after Run):
--   select proname from pg_proc where proname = 'create_cod_order';
--   select grantee, privilege_type from information_schema.role_table_grants
--    where table_name = 'admin_roles';
