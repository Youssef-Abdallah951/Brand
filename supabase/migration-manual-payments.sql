-- ============================================================================
-- LUMIERE BEAUTY — manual payments (InstaPay + Vodafone Cash) migration
-- Run in Supabase SQL Editor AFTER migration-fix-checkout.sql.
-- SAFE: additive only. No DROP TABLE, no DELETEs, no data loss.
-- ============================================================================

-- 1. New columns on orders (manual-payment details).
alter table public.orders
  add column if not exists payment_recipient_number text;
alter table public.orders
  add column if not exists sender_phone text;
alter table public.orders
  add column if not exists transaction_ref text;
alter table public.orders
  add column if not exists payment_screenshot text;

-- 2. payment_method: allow COD + InstaPay + Vodafone Cash.
alter table public.orders drop constraint if exists orders_payment_method_check;
alter table public.orders
  add constraint orders_payment_method_check
  check (payment_method in ('cod', 'instapay', 'vodafone_cash'));

-- 3. payment_status: allow pending verification for manual payments.
alter table public.orders drop constraint if exists orders_payment_status_check;
alter table public.orders
  add constraint orders_payment_status_check
  check (payment_status in ('pending', 'pending_verification', 'paid', 'rejected'));

-- 4. Atomic order creation supporting all payment methods.
create or replace function public.create_order(
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
  p_payment_method text,
  p_recipient_number text,
  p_sender_phone text,
  p_transaction_ref text,
  p_payment_screenshot text,
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
  v_payment_status text;
begin
  -- validate
  if p_first is null or btrim(p_first) = '' then raise exception 'first name is required'; end if;
  if p_last is null or btrim(p_last) = '' then raise exception 'last name is required'; end if;
  if p_whatsapp is null or btrim(p_whatsapp) = '' then raise exception 'whatsapp is required'; end if;
  if p_governorate is null or btrim(p_governorate) = '' then raise exception 'governorate is required'; end if;
  if p_area is null or btrim(p_area) = '' then raise exception 'area is required'; end if;
  if p_address is null or btrim(p_address) = '' then raise exception 'address is required'; end if;
  if p_delivery_method not in ('standard', 'express') then raise exception 'invalid delivery method'; end if;
  if p_payment_method not in ('cod', 'instapay', 'vodafone_cash') then raise exception 'invalid payment method'; end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then raise exception 'cart is empty'; end if;
  if p_total is null or p_total < 0 then raise exception 'invalid total'; end if;
  if (p_payment_method in ('instapay', 'vodafone_cash')) and (p_recipient_number is null or btrim(p_recipient_number) = '') then
    raise exception 'recipient number is required';
  end if;
  if (p_payment_method in ('instapay', 'vodafone_cash')) and (p_sender_phone is null or btrim(p_sender_phone) = '') then
    raise exception 'sender phone is required';
  end if;

  v_payment_status := case when p_payment_method in ('instapay', 'vodafone_cash') then 'pending_verification' else 'pending' end;

  -- customer
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
  returning id into v_customer_id;

  -- order
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
        payment_recipient_number, sender_phone, transaction_ref, payment_screenshot,
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
        p_delivery_method, p_payment_method, v_payment_status,
        nullif(btrim(coalesce(p_recipient_number, '')), ''),
        nullif(btrim(coalesce(p_sender_phone, '')), ''),
        nullif(btrim(coalesce(p_transaction_ref, '')), ''),
        nullif(p_payment_screenshot, ''),
        p_subtotal, p_delivery_fee, coalesce(p_discount, 0), p_total, 'pending'
      )
      returning id into v_order_id;
      exit;
    exception when unique_violation then
      if v_attempt >= 5 then raise; end if;
    end;
  end loop;

  -- items
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

  -- best-effort stock decrement
  begin
    for v_item in select * from jsonb_array_elements(p_items) loop
      update public.products
      set stock = greatest(0, stock - greatest(1, (v_item->>'qty')::int))
      where id = nullif(v_item->>'product_id', '')::uuid
        and stock > 0;
    end loop;
  exception when others then null;
  end;

  return v_order_number;
end;
$$;

grant execute on function public.create_order(
  text, text, text, text, text, text, text, text, text, text, text, text, text,
  numeric, numeric, numeric, numeric, text, text, text, text, text, jsonb
) to anon, authenticated;

-- 5. Admin RLS already covers orders (admin all orders). No new policies needed.
-- 6. Verification queries:
-- select column_name from information_schema.columns where table_name='orders' and column_name in ('payment_recipient_number','sender_phone','transaction_ref','payment_screenshot');
-- select proname from pg_proc where proname='create_order';
