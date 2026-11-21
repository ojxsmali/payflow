-- PayFlow schema
-- ----------------------------------------------------------------------------
-- Money is stored as bigint in the currency's minor unit (paise for INR, cents
-- for USD). Percentages are stored in basis points (1800 = 18.00%). Every
-- financial total is computed here, in the database, by pf_recompute_invoice();
-- the browser only ever displays what the database calculated.
--
-- Write model
--   * profiles, clients        — users write directly, protected by RLS.
--   * invoices, invoice_items,
--     payments, invoice_events — read-only to users (RLS). All writes go through
--     SECURITY DEFINER functions that check auth.uid(), validate input, enforce
--     the lifecycle and log an event. No user can set a total or a status.
-- ----------------------------------------------------------------------------

create extension if not exists pgcrypto;

-- ── profiles ────────────────────────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 120),
  business_name text not null default '' check (char_length(business_name) <= 160),
  email text not null default '' check (char_length(email) <= 254),
  phone text not null default '' check (char_length(phone) <= 40),
  address text not null default '' check (char_length(address) <= 400),
  city text not null default '' check (char_length(city) <= 120),
  country text not null default '' check (char_length(country) <= 120),
  website text not null default '' check (char_length(website) <= 200),
  tax_id text not null default '' check (char_length(tax_id) <= 40),
  logo_path text check (logo_path is null or char_length(logo_path) <= 300),
  payment_instructions text not null default '' check (char_length(payment_instructions) <= 1000),
  default_currency char(3) not null default 'INR' check (default_currency in ('INR','USD','EUR','GBP')),
  default_tax_rate_bp integer not null default 1800 check (default_tax_rate_bp between 0 and 10000),
  default_tax_label text not null default 'GST' check (char_length(default_tax_label) <= 20),
  default_due_days integer not null default 14 check (default_due_days between 0 and 365),
  default_payment_terms text not null default '' check (char_length(default_payment_terms) <= 1000),
  default_notes text not null default '' check (char_length(default_notes) <= 1000),
  invoice_prefix text not null default 'INV-' check (invoice_prefix ~ '^[A-Za-z0-9/_-]{0,10}$'),
  next_invoice_seq integer not null default 1 check (next_invoice_seq between 1 and 999999),
  timezone text not null default 'Asia/Kolkata' check (char_length(timezone) <= 64),
  email_copy_to_self boolean not null default true,
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── clients ─────────────────────────────────────────────────────────────────
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 160),
  company_name text not null default '' check (char_length(company_name) <= 160),
  email text not null default '' check (email = '' or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone text not null default '' check (char_length(phone) <= 40),
  address text not null default '' check (char_length(address) <= 400),
  city text not null default '' check (char_length(city) <= 120),
  country text not null default '' check (char_length(country) <= 120),
  tax_id text not null default '' check (char_length(tax_id) <= 40),
  notes text not null default '' check (char_length(notes) <= 2000),
  is_sample boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index clients_user_idx on public.clients (user_id, archived_at);

-- ── invoices ────────────────────────────────────────────────────────────────
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete restrict,
  invoice_number text not null,
  issue_date date not null,
  due_date date not null,
  currency char(3) not null check (currency in ('INR','USD','EUR','GBP')),
  discount_type text not null default 'none' check (discount_type in ('none','percent','fixed')),
  discount_value bigint not null default 0 check (discount_value >= 0),
  tax_label text not null default 'Tax' check (char_length(tax_label) <= 20),
  tax_rate_bp integer not null default 0 check (tax_rate_bp between 0 and 10000),
  subtotal bigint not null default 0 check (subtotal >= 0),
  discount_amount bigint not null default 0 check (discount_amount >= 0),
  tax_amount bigint not null default 0 check (tax_amount >= 0),
  total bigint not null default 0 check (total >= 0),
  amount_paid bigint not null default 0 check (amount_paid >= 0),
  -- Lifecycle facts the user controls. Payment progress and lateness are derived
  -- (see invoice_overview), never stored as a status.
  state text not null default 'draft' check (state in ('draft','sent','viewed','cancelled')),
  sent_at timestamptz,
  viewed_at timestamptz,
  paid_at timestamptz,
  cancelled_at timestamptz,
  payment_terms text not null default '' check (char_length(payment_terms) <= 1000),
  notes text not null default '' check (char_length(notes) <= 2000),
  public_token text not null unique default encode(gen_random_bytes(24), 'hex'),
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, invoice_number),
  check (due_date >= issue_date),
  check (amount_paid <= total),
  check (discount_type <> 'percent' or discount_value <= 10000)
);
create index invoices_user_idx on public.invoices (user_id, issue_date desc);
create index invoices_client_idx on public.invoices (client_id);

create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  position integer not null check (position >= 0),
  description text not null check (char_length(btrim(description)) between 1 and 500),
  quantity numeric(12,3) not null check (quantity > 0 and quantity <= 1000000),
  unit_price bigint not null check (unit_price >= 0 and unit_price <= 100000000000000),
  -- half-away-from-zero rounding to the minor unit; mirrored by src/lib/money.ts
  amount bigint generated always as (round(quantity * unit_price)::bigint) stored
);
create index invoice_items_invoice_idx on public.invoice_items (invoice_id, position);

-- ── payments ────────────────────────────────────────────────────────────────
-- Payments are recorded, never edited. A mistaken payment is voided (with a
-- reason) so the history stays intact.
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  amount bigint not null check (amount > 0),
  paid_on date not null,
  method text not null check (method in ('bank_transfer','upi','cash','card','paypal','cheque','other')),
  reference text not null default '' check (char_length(reference) <= 120),
  notes text not null default '' check (char_length(notes) <= 500),
  voided_at timestamptz,
  void_reason text check (void_reason is null or char_length(void_reason) <= 300),
  created_at timestamptz not null default now()
);
create index payments_invoice_idx on public.payments (invoice_id);
create index payments_user_idx on public.payments (user_id, paid_on);

-- ── activity ────────────────────────────────────────────────────────────────
create table public.invoice_events (
  id bigint generated always as identity primary key,
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('created','edited','sent','resent','viewed','payment_recorded','payment_voided','paid','cancelled')),
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index invoice_events_user_idx on public.invoice_events (user_id, created_at desc);
create index invoice_events_invoice_idx on public.invoice_events (invoice_id, created_at);

-- ── updated_at ──────────────────────────────────────────────────────────────
create function public.pf_touch() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
create trigger profiles_touch before update on public.profiles for each row execute function public.pf_touch();
create trigger clients_touch before update on public.clients for each row execute function public.pf_touch();
create trigger invoices_touch before update on public.invoices for each row execute function public.pf_touch();

-- Clients: user_id is fixed at insert and can never be reassigned.
create function public.pf_client_guard() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    new.user_id := auth.uid();
    new.is_sample := false;
  elsif new.user_id <> old.user_id then
    raise exception 'client owner cannot change';
  end if;
  return new;
end $$;
create trigger clients_guard before insert or update on public.clients for each row execute function public.pf_client_guard();

-- Profiles: users may not move their own invoice counter backwards (that would
-- produce duplicate numbers) or change their id.
create function public.pf_profile_guard() returns trigger language plpgsql as $$
begin
  if new.id <> old.id then raise exception 'profile id cannot change'; end if;
  if new.next_invoice_seq < old.next_invoice_seq and current_user in ('authenticated','anon') then
    raise exception 'The next invoice number cannot be lower than %', old.next_invoice_seq;
  end if;
  return new;
end $$;
create trigger profiles_guard before update on public.profiles for each row execute function public.pf_profile_guard();

-- New auth user → profile row.
create function public.pf_handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id,
          left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 120),
          left(coalesce(new.email, ''), 254));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.pf_handle_new_user();

-- ── calculations ────────────────────────────────────────────────────────────
-- The single source of truth for invoice money. Mirrored (for live preview only)
-- by src/lib/money.ts; tests assert the two agree.
create function public.pf_recompute_invoice(p_invoice uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  inv public.invoices;
  v_sub bigint; v_disc bigint; v_tax bigint; v_paid bigint;
begin
  select * into inv from public.invoices where id = p_invoice for update;
  select coalesce(sum(amount), 0) into v_sub from public.invoice_items where invoice_id = p_invoice;
  v_disc := case inv.discount_type
    when 'percent' then round(v_sub::numeric * inv.discount_value / 10000)::bigint
    when 'fixed' then least(inv.discount_value, v_sub)
    else 0 end;
  v_tax := round((v_sub - v_disc)::numeric * inv.tax_rate_bp / 10000)::bigint;
  select coalesce(sum(amount), 0) into v_paid from public.payments where invoice_id = p_invoice and voided_at is null;
  update public.invoices set
    subtotal = v_sub, discount_amount = v_disc, tax_amount = v_tax,
    total = v_sub - v_disc + v_tax, amount_paid = v_paid,
    paid_at = case when v_paid >= v_sub - v_disc + v_tax and v_paid > 0 then coalesce(paid_at, now()) else null end
  where id = p_invoice;
end $$;

create function public.pf_today(p_user uuid) returns date
language sql stable security definer set search_path = public as $$
  select (now() at time zone coalesce((select timezone from public.profiles where id = p_user), 'UTC'))::date
$$;

create function public.pf_log(p_invoice uuid, p_user uuid, p_kind text, p_detail jsonb default '{}'::jsonb)
returns void language sql security definer set search_path = public as $$
  insert into public.invoice_events (invoice_id, user_id, kind, detail) values (p_invoice, p_user, p_kind, p_detail)
$$;

-- ── derived status ──────────────────────────────────────────────────────────
-- Precedence: cancelled > draft > paid > overdue > partially_paid > viewed > sent
create view public.invoice_overview with (security_invoker = true) as
select
  i.*,
  c.name as client_name,
  c.company_name as client_company,
  c.email as client_email,
  (i.total - i.amount_paid) as balance_due,
  case
    when i.state = 'cancelled' then 'cancelled'
    when i.state = 'draft' then 'draft'
    when i.amount_paid >= i.total then 'paid'
    when i.due_date < public.pf_today(i.user_id) then 'overdue'
    when i.amount_paid > 0 then 'partially_paid'
    when i.state = 'viewed' then 'viewed'
    else 'sent'
  end as status,
  (i.due_date - public.pf_today(i.user_id)) as days_until_due
from public.invoices i
join public.clients c on c.id = i.client_id;

-- ── invoice writes ──────────────────────────────────────────────────────────
-- p jsonb: { id?, client_id, issue_date, due_date, currency, discount_type,
--            discount_value, tax_label, tax_rate_bp, payment_terms, notes,
--            items: [{ description, quantity, unit_price }] }
create function public.save_invoice(p jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  v_id uuid := nullif(p ->> 'id', '')::uuid;
  inv public.invoices;
  prof public.profiles;
  v_client uuid := (p ->> 'client_id')::uuid;
  v_items jsonb := coalesce(p -> 'items', '[]'::jsonb);
  v_item jsonb;
  v_pos int := 0;
  v_dtype text := coalesce(p ->> 'discount_type', 'none');
  v_dval bigint := coalesce((p ->> 'discount_value')::bigint, 0);
begin
  if uid is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  if not exists (select 1 from public.clients where id = v_client and user_id = uid and archived_at is null) then
    raise exception 'Choose an active client for this invoice' using errcode = '22023';
  end if;
  if jsonb_typeof(v_items) <> 'array' or jsonb_array_length(v_items) = 0 then
    raise exception 'Add at least one line item' using errcode = '22023';
  end if;
  if jsonb_array_length(v_items) > 200 then
    raise exception 'An invoice can have at most 200 line items' using errcode = '22023';
  end if;
  if v_dtype = 'none' then v_dval := 0; end if;

  if v_id is null then
    update public.profiles set next_invoice_seq = next_invoice_seq + 1
      where id = uid returning * into prof;
    if prof.id is null then raise exception 'Profile missing' using errcode = '22023'; end if;
    insert into public.invoices (user_id, client_id, invoice_number, issue_date, due_date, currency,
      discount_type, discount_value, tax_label, tax_rate_bp, payment_terms, notes)
    values (uid, v_client,
      prof.invoice_prefix || lpad((prof.next_invoice_seq - 1)::text, 4, '0'),
      (p ->> 'issue_date')::date, (p ->> 'due_date')::date, upper(p ->> 'currency'),
      v_dtype, v_dval, coalesce(nullif(p ->> 'tax_label', ''), 'Tax'), coalesce((p ->> 'tax_rate_bp')::int, 0),
      coalesce(p ->> 'payment_terms', ''), coalesce(p ->> 'notes', ''))
    returning * into inv;
    perform public.pf_log(inv.id, uid, 'created', jsonb_build_object('number', inv.invoice_number));
  else
    select * into inv from public.invoices where id = v_id and user_id = uid for update;
    if inv.id is null then raise exception 'Invoice not found' using errcode = 'P0002'; end if;
    if inv.state = 'cancelled' then raise exception 'Cancelled invoices cannot be edited' using errcode = '22023'; end if;
    if inv.amount_paid > 0 then
      raise exception 'This invoice has payments recorded, so it can no longer be edited' using errcode = '22023';
    end if;
    update public.invoices set
      client_id = v_client,
      issue_date = (p ->> 'issue_date')::date,
      due_date = (p ->> 'due_date')::date,
      currency = upper(p ->> 'currency'),
      discount_type = v_dtype, discount_value = v_dval,
      tax_label = coalesce(nullif(p ->> 'tax_label', ''), 'Tax'),
      tax_rate_bp = coalesce((p ->> 'tax_rate_bp')::int, 0),
      payment_terms = coalesce(p ->> 'payment_terms', ''),
      notes = coalesce(p ->> 'notes', '')
    where id = v_id;
    delete from public.invoice_items where invoice_id = v_id;
    if inv.state <> 'draft' then
      perform public.pf_log(v_id, uid, 'edited', '{}'::jsonb);
    end if;
  end if;

  for v_item in select * from jsonb_array_elements(v_items) loop
    insert into public.invoice_items (invoice_id, user_id, position, description, quantity, unit_price)
    values (inv.id, uid, v_pos, btrim(v_item ->> 'description'),
            (v_item ->> 'quantity')::numeric, (v_item ->> 'unit_price')::bigint);
    v_pos := v_pos + 1;
  end loop;

  perform public.pf_recompute_invoice(inv.id);
  select * into inv from public.invoices where id = inv.id;
  if inv.discount_type = 'fixed' and inv.discount_value > inv.subtotal then
    raise exception 'The discount is larger than the subtotal' using errcode = '22023';
  end if;
  return inv.id;
end $$;

-- channel: 'email' (sent by PayFlow through Resend) or 'manual' (user sent it themselves)
create function public.mark_invoice_sent(p_invoice uuid, p_channel text default 'manual', p_to text default null)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); inv public.invoices;
begin
  if p_channel not in ('email','manual') then raise exception 'Unknown channel' using errcode = '22023'; end if;
  select * into inv from public.invoices where id = p_invoice and user_id = uid for update;
  if inv.id is null then raise exception 'Invoice not found' using errcode = 'P0002'; end if;
  if inv.state = 'cancelled' then raise exception 'Cancelled invoices cannot be sent' using errcode = '22023'; end if;
  if inv.total = 0 then raise exception 'This invoice totals zero. Add an amount before sending.' using errcode = '22023'; end if;
  if inv.state = 'draft' then
    update public.invoices set state = 'sent', sent_at = now() where id = p_invoice;
    perform public.pf_log(p_invoice, uid, 'sent', jsonb_build_object('channel', p_channel, 'to', p_to));
  else
    perform public.pf_log(p_invoice, uid, 'resent', jsonb_build_object('channel', p_channel, 'to', p_to));
  end if;
end $$;

create function public.cancel_invoice(p_invoice uuid, p_reason text default '')
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); inv public.invoices;
begin
  select * into inv from public.invoices where id = p_invoice and user_id = uid for update;
  if inv.id is null then raise exception 'Invoice not found' using errcode = 'P0002'; end if;
  if inv.state = 'cancelled' then return; end if;
  if inv.state = 'draft' then raise exception 'Drafts are deleted, not cancelled' using errcode = '22023'; end if;
  if inv.amount_paid > 0 then
    raise exception 'Void the recorded payments before cancelling this invoice' using errcode = '22023';
  end if;
  update public.invoices set state = 'cancelled', cancelled_at = now() where id = p_invoice;
  perform public.pf_log(p_invoice, uid, 'cancelled', jsonb_build_object('reason', left(coalesce(p_reason, ''), 300)));
end $$;

-- Drafts were never seen by a client, so they can be removed outright.
create function public.delete_draft_invoice(p_invoice uuid)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); inv public.invoices;
begin
  select * into inv from public.invoices where id = p_invoice and user_id = uid for update;
  if inv.id is null then raise exception 'Invoice not found' using errcode = 'P0002'; end if;
  if inv.state <> 'draft' then raise exception 'Only drafts can be deleted. Cancel sent invoices instead.' using errcode = '22023'; end if;
  delete from public.invoices where id = p_invoice;
end $$;

create function public.duplicate_invoice(p_invoice uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); inv public.invoices; prof public.profiles; v_new uuid; v_today date;
begin
  select * into inv from public.invoices where id = p_invoice and user_id = uid;
  if inv.id is null then raise exception 'Invoice not found' using errcode = 'P0002'; end if;
  v_today := public.pf_today(uid);
  update public.profiles set next_invoice_seq = next_invoice_seq + 1 where id = uid returning * into prof;
  insert into public.invoices (user_id, client_id, invoice_number, issue_date, due_date, currency,
    discount_type, discount_value, tax_label, tax_rate_bp, payment_terms, notes)
  values (uid, inv.client_id, prof.invoice_prefix || lpad((prof.next_invoice_seq - 1)::text, 4, '0'),
    v_today, v_today + (inv.due_date - inv.issue_date), inv.currency, inv.discount_type, inv.discount_value,
    inv.tax_label, inv.tax_rate_bp, inv.payment_terms, inv.notes)
  returning id into v_new;
  insert into public.invoice_items (invoice_id, user_id, position, description, quantity, unit_price)
    select v_new, uid, position, description, quantity, unit_price from public.invoice_items where invoice_id = p_invoice;
  perform public.pf_recompute_invoice(v_new);
  perform public.pf_log(v_new, uid, 'created', jsonb_build_object('duplicated_from', inv.invoice_number));
  return v_new;
end $$;

-- ── payments ────────────────────────────────────────────────────────────────
create function public.record_payment(p_invoice uuid, p_amount bigint, p_paid_on date, p_method text,
  p_reference text default '', p_notes text default '')
returns uuid language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); inv public.invoices; v_id uuid; v_balance bigint;
begin
  select * into inv from public.invoices where id = p_invoice and user_id = uid for update;
  if inv.id is null then raise exception 'Invoice not found' using errcode = 'P0002'; end if;
  if inv.state = 'draft' then raise exception 'Send the invoice before recording a payment' using errcode = '22023'; end if;
  if inv.state = 'cancelled' then raise exception 'Cancelled invoices cannot take payments' using errcode = '22023'; end if;
  v_balance := inv.total - inv.amount_paid;
  if p_amount is null or p_amount <= 0 then raise exception 'Enter a payment amount above zero' using errcode = '22023'; end if;
  if p_amount > v_balance then
    raise exception 'The payment is more than the balance due' using errcode = '22023';
  end if;
  if p_paid_on is null or p_paid_on > public.pf_today(uid) then
    raise exception 'The payment date cannot be in the future' using errcode = '22023';
  end if;
  insert into public.payments (invoice_id, user_id, amount, paid_on, method, reference, notes)
  values (p_invoice, uid, p_amount, p_paid_on, p_method, left(coalesce(p_reference, ''), 120), left(coalesce(p_notes, ''), 500))
  returning id into v_id;
  perform public.pf_recompute_invoice(p_invoice);
  perform public.pf_log(p_invoice, uid, 'payment_recorded',
    jsonb_build_object('payment_id', v_id, 'amount', p_amount, 'method', p_method));
  if p_amount = v_balance then
    perform public.pf_log(p_invoice, uid, 'paid', '{}'::jsonb);
  end if;
  return v_id;
end $$;

create function public.void_payment(p_payment uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); pay public.payments;
begin
  select * into pay from public.payments where id = p_payment and user_id = uid for update;
  if pay.id is null then raise exception 'Payment not found' using errcode = 'P0002'; end if;
  if pay.voided_at is not null then return; end if;
  if char_length(btrim(coalesce(p_reason, ''))) = 0 then
    raise exception 'Give a reason for voiding this payment' using errcode = '22023';
  end if;
  update public.payments set voided_at = now(), void_reason = left(btrim(p_reason), 300) where id = p_payment;
  perform public.pf_recompute_invoice(pay.invoice_id);
  perform public.pf_log(pay.invoice_id, uid, 'payment_voided',
    jsonb_build_object('payment_id', pay.id, 'amount', pay.amount, 'reason', left(btrim(p_reason), 300)));
end $$;

-- ── public invoice link ─────────────────────────────────────────────────────
-- Anyone with the 48-hex-char token can read a single sent invoice. Internal
-- ids, the freelancer's account email and other invoices are never exposed.
create function public.get_public_invoice(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare inv public.invoices; prof public.profiles; cl public.clients; v_status text;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{48}$' then return null; end if;
  select * into inv from public.invoices where public_token = p_token;
  if inv.id is null or inv.state = 'draft' then return null; end if;
  if inv.state = 'sent' then
    update public.invoices set state = 'viewed', viewed_at = now() where id = inv.id;
    perform public.pf_log(inv.id, inv.user_id, 'viewed', '{}'::jsonb);
  end if;
  select * into prof from public.profiles where id = inv.user_id;
  select * into cl from public.clients where id = inv.client_id;
  select status into v_status from public.invoice_overview where id = inv.id;
  return jsonb_build_object(
    'invoice_number', inv.invoice_number, 'issue_date', inv.issue_date, 'due_date', inv.due_date,
    'currency', inv.currency, 'discount_type', inv.discount_type, 'discount_value', inv.discount_value,
    'tax_label', inv.tax_label, 'tax_rate_bp', inv.tax_rate_bp,
    'subtotal', inv.subtotal, 'discount_amount', inv.discount_amount, 'tax_amount', inv.tax_amount,
    'total', inv.total, 'amount_paid', inv.amount_paid, 'status', v_status,
    'payment_terms', inv.payment_terms, 'notes', inv.notes,
    'from', jsonb_build_object('name', prof.full_name, 'business_name', prof.business_name, 'email', prof.email,
      'phone', prof.phone, 'address', prof.address, 'city', prof.city, 'country', prof.country,
      'website', prof.website, 'tax_id', prof.tax_id, 'logo_path', prof.logo_path,
      'payment_instructions', prof.payment_instructions),
    'to', jsonb_build_object('name', cl.name, 'company_name', cl.company_name, 'email', cl.email,
      'address', cl.address, 'city', cl.city, 'country', cl.country, 'tax_id', cl.tax_id),
    'items', coalesce((select jsonb_agg(jsonb_build_object('description', description, 'quantity', quantity,
      'unit_price', unit_price, 'amount', amount) order by position) from public.invoice_items where invoice_id = inv.id), '[]'::jsonb)
  );
end $$;

-- ── row level security ──────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.payments enable row level security;
alter table public.invoice_events enable row level security;

create policy "own profile: read" on public.profiles for select to authenticated using (id = auth.uid());
create policy "own profile: update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "own clients: read" on public.clients for select to authenticated using (user_id = auth.uid());
create policy "own clients: insert" on public.clients for insert to authenticated with check (user_id = auth.uid());
create policy "own clients: update" on public.clients for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
-- hard delete only when the client has no invoices (FK restrict enforces that)
create policy "own clients: delete" on public.clients for delete to authenticated using (user_id = auth.uid());

create policy "own invoices: read" on public.invoices for select to authenticated using (user_id = auth.uid());
create policy "own items: read" on public.invoice_items for select to authenticated using (user_id = auth.uid());
create policy "own payments: read" on public.payments for select to authenticated using (user_id = auth.uid());
create policy "own events: read" on public.invoice_events for select to authenticated using (user_id = auth.uid());

-- ── privileges ──────────────────────────────────────────────────────────────
-- Start from nothing (Supabase projects may auto-grant), then add back exactly
-- what the app uses.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;

grant select, update (full_name, business_name, email, phone, address, city, country, website, tax_id,
  logo_path, payment_instructions, default_currency, default_tax_rate_bp, default_tax_label, default_due_days,
  default_payment_terms, default_notes, invoice_prefix, next_invoice_seq, timezone, email_copy_to_self, onboarded_at)
  on public.profiles to authenticated;
grant select, delete, insert (name, company_name, email, phone, address, city, country, tax_id, notes),
  update (name, company_name, email, phone, address, city, country, tax_id, notes, archived_at)
  on public.clients to authenticated;
grant select on public.invoices, public.invoice_items, public.payments, public.invoice_events, public.invoice_overview to authenticated;

grant execute on function public.save_invoice(jsonb) to authenticated;
grant execute on function public.mark_invoice_sent(uuid, text, text) to authenticated;
grant execute on function public.cancel_invoice(uuid, text) to authenticated;
grant execute on function public.delete_draft_invoice(uuid) to authenticated;
grant execute on function public.duplicate_invoice(uuid) to authenticated;
grant execute on function public.record_payment(uuid, bigint, date, text, text, text) to authenticated;
grant execute on function public.void_payment(uuid, text) to authenticated;
grant execute on function public.get_public_invoice(text) to anon, authenticated;
-- the view calls pf_today with the caller's rights
grant execute on function public.pf_today(uuid) to authenticated, anon;
-- trigger functions run as table owner but need to be callable from user statements
grant execute on function public.pf_touch() to authenticated;
grant execute on function public.pf_client_guard() to authenticated;
grant execute on function public.pf_profile_guard() to authenticated;
