-- paid_at should be when the client actually paid (the date of the payment that
-- cleared the balance), not when the payment was typed into PayFlow. Otherwise
-- "average days to pay" measures bookkeeping delay instead of client behaviour.
create or replace function public.pf_recompute_invoice(p_invoice uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  inv public.invoices;
  v_sub bigint; v_disc bigint; v_tax bigint; v_paid bigint; v_total bigint;
  v_cleared date;
begin
  select * into inv from public.invoices where id = p_invoice for update;
  select coalesce(sum(amount), 0) into v_sub from public.invoice_items where invoice_id = p_invoice;
  v_disc := case inv.discount_type
    when 'percent' then round(v_sub::numeric * inv.discount_value / 10000)::bigint
    when 'fixed' then least(inv.discount_value, v_sub)
    else 0 end;
  v_tax := round((v_sub - v_disc)::numeric * inv.tax_rate_bp / 10000)::bigint;
  v_total := v_sub - v_disc + v_tax;
  select coalesce(sum(amount), 0), max(paid_on) into v_paid, v_cleared
    from public.payments where invoice_id = p_invoice and voided_at is null;
  update public.invoices set
    subtotal = v_sub, discount_amount = v_disc, tax_amount = v_tax,
    total = v_total, amount_paid = v_paid,
    paid_at = case when v_paid >= v_total and v_paid > 0 then v_cleared::timestamptz else null end
  where id = p_invoice;
end $$;

-- backfill invoices that are already paid
select public.pf_recompute_invoice(id) from public.invoices where paid_at is not null;
