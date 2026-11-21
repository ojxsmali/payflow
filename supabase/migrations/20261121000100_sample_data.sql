-- Optional sample workspace. Everything it creates is flagged is_sample = true,
-- shown with a "Sample" tag in the UI, and removable in one step from Settings.
-- The businesses below are invented placeholders, not real customers.

create function public.pf_sample_invoice(p_user uuid, p_client uuid, p_issue date, p_due_days int,
  p_items jsonb, p_tax_bp int, p_state text, p_payments text, p_discount_type text default 'none',
  p_discount_value bigint default 0)
returns uuid language plpgsql security definer set search_path = public as $$
declare prof public.profiles; v_id uuid; v_item jsonb; v_pos int := 0; v_pay jsonb;
begin
  update public.profiles set next_invoice_seq = next_invoice_seq + 1 where id = p_user returning * into prof;
  insert into public.invoices (user_id, client_id, invoice_number, issue_date, due_date, currency, discount_type,
    discount_value, tax_label, tax_rate_bp, payment_terms, notes, is_sample, state, sent_at, created_at)
  values (p_user, p_client, prof.invoice_prefix || lpad((prof.next_invoice_seq - 1)::text, 4, '0'),
    p_issue, p_issue + p_due_days, prof.default_currency, p_discount_type, p_discount_value,
    prof.default_tax_label, p_tax_bp,
    'Payment due within ' || p_due_days || ' days of the invoice date.', 'Thank you for the work together.',
    true, case when p_state = 'draft' then 'draft' else p_state end,
    case when p_state <> 'draft' then p_issue::timestamptz + interval '10 hours' end,
    p_issue::timestamptz + interval '9 hours')
  returning id into v_id;
  for v_item in select * from jsonb_array_elements(p_items) loop
    insert into public.invoice_items (invoice_id, user_id, position, description, quantity, unit_price)
    values (v_id, p_user, v_pos, v_item ->> 0, (v_item ->> 1)::numeric, (v_item ->> 2)::bigint);
    v_pos := v_pos + 1;
  end loop;
  perform public.pf_recompute_invoice(v_id);
  insert into public.invoice_events (invoice_id, user_id, kind, created_at)
    values (v_id, p_user, 'created', p_issue::timestamptz + interval '9 hours');
  if p_state <> 'draft' then
    insert into public.invoice_events (invoice_id, user_id, kind, detail, created_at)
      values (v_id, p_user, 'sent', '{"channel":"manual"}', p_issue::timestamptz + interval '10 hours');
  end if;
  for v_pay in select * from jsonb_array_elements(coalesce(p_payments, '[]')::jsonb) loop
    insert into public.payments (invoice_id, user_id, amount, paid_on, method, reference, created_at)
    values (v_id, p_user,
      case when (v_pay ->> 'amount') = 'full' then (select total - amount_paid from public.invoices where id = v_id)
           else (v_pay ->> 'amount')::bigint end,
      (v_pay ->> 'on')::date, v_pay ->> 'method', coalesce(v_pay ->> 'ref', ''), (v_pay ->> 'on')::timestamptz + interval '12 hours');
    perform public.pf_recompute_invoice(v_id);
    insert into public.invoice_events (invoice_id, user_id, kind, created_at)
      values (v_id, p_user, 'payment_recorded', (v_pay ->> 'on')::timestamptz + interval '12 hours');
  end loop;
  return v_id;
end $$;

create function public.load_sample_data() returns void
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  t date;
  c1 uuid; c2 uuid; c3 uuid; c4 uuid;
begin
  if uid is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  if exists (select 1 from public.clients where user_id = uid and is_sample) then
    raise exception 'Sample data is already loaded' using errcode = '22023';
  end if;
  t := public.pf_today(uid);

  insert into public.clients (user_id, name, company_name, email, city, country, notes) values
    (uid, 'Acme Studio', 'Acme Studio LLP', 'accounts@acme-studio.example', 'Pune', 'India', 'Retainer for product design.')
    returning id into c1;
  insert into public.clients (user_id, name, company_name, email, city, country) values
    (uid, 'Nova Labs', 'Nova Labs Pvt Ltd', 'finance@novalabs.example', 'Bengaluru', 'India') returning id into c2;
  insert into public.clients (user_id, name, company_name, email, city, country) values
    (uid, 'Northstar Media', '', 'hello@northstar.example', 'Mumbai', 'India') returning id into c3;
  insert into public.clients (user_id, name, company_name, email, city, country) values
    (uid, 'Orbit Systems', 'Orbit Systems', 'ap@orbit.example', 'Hyderabad', 'India') returning id into c4;
  update public.clients set is_sample = true where id in (c1, c2, c3, c4);

  -- amounts in paise
  perform public.pf_sample_invoice(uid, c1, t - 190, 15, '[["Brand identity refresh", 1, 6500000]]', 1800, 'sent',
    '[{"amount":"full","on":"' || (t - 178) || '","method":"bank_transfer","ref":"NEFT 4471"}]');
  perform public.pf_sample_invoice(uid, c2, t - 160, 30, '[["Website development — phase 1", 1, 9000000],["Hosting setup", 1, 450000]]', 1800, 'sent',
    '[{"amount":"full","on":"' || (t - 135) || '","method":"bank_transfer","ref":"IMPS 99012"}]');
  perform public.pf_sample_invoice(uid, c3, t - 128, 15, '[["Editorial illustrations", 6, 850000]]', 1800, 'sent',
    '[{"amount":"full","on":"' || (t - 117) || '","method":"upi","ref":"UPI 6620"}]');
  perform public.pf_sample_invoice(uid, c1, t - 98, 15, '[["Product design retainer — month 1", 1, 7500000]]', 1800, 'sent',
    '[{"amount":"full","on":"' || (t - 86) || '","method":"bank_transfer","ref":"NEFT 5120"}]');
  perform public.pf_sample_invoice(uid, c4, t - 75, 30, '[["API integration", 40, 250000],["Code review", 6, 250000]]', 1800, 'sent',
    '[{"amount":"full","on":"' || (t - 50) || '","method":"bank_transfer","ref":"RTGS 220"}]', 'percent', 500);
  perform public.pf_sample_invoice(uid, c1, t - 68, 15, '[["Product design retainer — month 2", 1, 7500000]]', 1800, 'sent',
    '[{"amount":"full","on":"' || (t - 49) || '","method":"bank_transfer","ref":"NEFT 5544"}]');
  perform public.pf_sample_invoice(uid, c2, t - 45, 60, '[["Website development — phase 2", 1, 12000000],["Content migration", 18, 150000]]', 1800, 'sent',
    '[{"amount":4000000,"on":"' || (t - 30) || '","method":"bank_transfer","ref":"IMPS 10441"}]');
  perform public.pf_sample_invoice(uid, c1, t - 38, 15, '[["Product design retainer — month 3", 1, 7500000]]', 1800, 'sent', '[]');
  perform public.pf_sample_invoice(uid, c3, t - 20, 15, '[["Podcast cover art", 3, 1200000],["Social templates", 1, 1800000]]', 1800, 'viewed',
    '[{"amount":"full","on":"' || (t - 6) || '","method":"upi","ref":"UPI 7731"}]');
  perform public.pf_sample_invoice(uid, c4, t - 9, 14, '[["Dashboard UI audit", 1, 3600000]]', 1800, 'viewed', '[]');
  perform public.pf_sample_invoice(uid, c1, t - 4, 15, '[["Product design retainer — month 4", 1, 7500000]]', 1800, 'sent', '[]');
  perform public.pf_sample_invoice(uid, c2, t, 30, '[["Maintenance — monthly", 3, 500000]]', 1800, 'draft', '[]');
  update public.invoices set viewed_at = sent_at + interval '1 day' where user_id = uid and is_sample and state = 'viewed';
end $$;

create function public.remove_sample_data() returns void
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  delete from public.invoices where user_id = uid and is_sample;
  delete from public.clients c where c.user_id = uid and c.is_sample
    and not exists (select 1 from public.invoices i where i.client_id = c.id);
end $$;

revoke all on function public.pf_sample_invoice(uuid, uuid, date, int, jsonb, int, text, text, text, bigint) from public, anon, authenticated;
revoke all on function public.load_sample_data() from public, anon;
revoke all on function public.remove_sample_data() from public, anon;
grant execute on function public.load_sample_data() to authenticated;
grant execute on function public.remove_sample_data() to authenticated;
