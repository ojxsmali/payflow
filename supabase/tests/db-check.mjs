// Runs the real migrations on an in-process Postgres (PGlite) and checks the
// financial rules, the invoice lifecycle and Row Level Security.
// Supabase's auth schema is stubbed: auth.users plus auth.uid() reading the JWT
// `sub` claim the way Supabase does. Storage policies are not exercised here.
//   npm run test:db
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { calcInvoice } from '../../src/lib/money.ts'

const here = path.dirname(fileURLToPath(import.meta.url))
const read = (f) => readFileSync(path.join(here, '../migrations', f), 'utf8')
const { pgcrypto } = await import('@electric-sql/pglite/contrib/pgcrypto')
const db = new PGlite({ extensions: { pgcrypto } })
let failures = 0
let count = 0
const ok = (cond, label) => {
  count++
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}`)
  if (!cond) failures++
}
async function expectError(sql, params, label, pattern) {
  try {
    await db.query(sql, params)
    ok(false, `${label} (expected an error)`)
  } catch (e) {
    ok(!pattern || pattern.test(e.message), `${label} → ${e.message.split('\n')[0]}`)
  }
}

await db.exec(`
  create role anon nologin; create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}'::jsonb);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  grant usage on schema public to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on functions to anon, authenticated;
`)
await db.exec(read('20261121000000_init.sql'))
await db.exec(read('20261121000100_sample_data.sql'))
await db.exec(read('20261121000300_paid_at_from_payment_date.sql'))
ok(true, 'migrations applied cleanly')

const A = '11111111-1111-1111-1111-111111111111'
const B = '22222222-2222-2222-2222-222222222222'
await db.query(`insert into auth.users (id, email, raw_user_meta_data) values ($1,'a@x.test','{"full_name":"Asha Rao"}'), ($2,'b@x.test','{}')`, [A, B])
const prof = (await db.query(`select full_name, email, invoice_prefix, next_invoice_seq from public.profiles where id=$1`, [A])).rows[0]
ok(prof.full_name === 'Asha Rao' && prof.email === 'a@x.test' && prof.next_invoice_seq === 1, 'signup creates a profile')

async function as(uid) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid ?? ''}', false); set role ${uid ? 'authenticated' : 'anon'};`)
}
const one = async (sql, p) => (await db.query(sql, p)).rows[0]
const rows = async (sql, p) => (await db.query(sql, p)).rows
const iso = (d) => d.toISOString().slice(0, 10)
const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
const daysFromToday = (n) => { const d = new Date(today); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

const save = async (payload) => (await one(`select public.save_invoice($1::jsonb) id`, [JSON.stringify(payload)])).id

// ── user B creates private data
await as(B)
const bClient = (await one(`insert into public.clients (name, email) values ('B secret client','x@b.test') returning id`)).id
const bInv = await save({ client_id: bClient, issue_date: daysFromToday(0), due_date: daysFromToday(14), currency: 'INR', tax_rate_bp: 0, items: [{ description: 'Secret', quantity: 1, unit_price: 100000 }] })

// ── user A
await as(A)
const acme = (await one(`insert into public.clients (name, email, company_name) values ('Acme Studio','acme@example.com','Acme Studio LLP') returning id, user_id`))
ok(acme.user_id === A, 'client owner is set from the session, not the request')
await expectError(`insert into public.clients (name, email) values ('Bad','not-an-email')`, [], 'client email is validated', /check/)
await expectError(`insert into public.clients (name) values ('   ')`, [], 'client name cannot be blank', /check/)

// Spec example: 50,000 + 20,000 + 3×5,000 = 85,000; 18% GST = 15,300; total 1,00,300
const inv1 = await save({
  client_id: acme.id, issue_date: daysFromToday(0), due_date: daysFromToday(15), currency: 'INR',
  tax_label: 'GST', tax_rate_bp: 1800, discount_type: 'none',
  items: [
    { description: 'Website development', quantity: 1, unit_price: 5000000 },
    { description: 'UI design', quantity: 1, unit_price: 2000000 },
    { description: 'Maintenance', quantity: 3, unit_price: 500000 },
  ],
})
let r = await one(`select invoice_number, subtotal, tax_amount, total, status from public.invoice_overview where id=$1`, [inv1])
ok(r.invoice_number === 'INV-0001', `first invoice is numbered INV-0001 (${r.invoice_number})`)
ok(Number(r.subtotal) === 8500000 && Number(r.tax_amount) === 1530000 && Number(r.total) === 10030000, 'subtotal ₹85,000, GST ₹15,300, total ₹1,00,300')
ok(r.status === 'draft', 'new invoice is a draft')

// Spec example: 50,000 − 10% = 45,000; 18% = 8,100; total 53,100
const inv2 = await save({
  client_id: acme.id, issue_date: daysFromToday(0), due_date: daysFromToday(15), currency: 'INR',
  tax_rate_bp: 1800, discount_type: 'percent', discount_value: 1000,
  items: [{ description: 'Design sprint', quantity: 1, unit_price: 5000000 }],
})
r = await one(`select invoice_number, discount_amount, tax_amount, total from public.invoices where id=$1`, [inv2])
ok(r.invoice_number === 'INV-0002', 'numbers increase per user (INV-0002)')
ok(Number(r.discount_amount) === 500000 && Number(r.tax_amount) === 810000 && Number(r.total) === 5310000, '10% discount then 18% tax → ₹53,100')

await expectError(`select public.save_invoice($1::jsonb)`, [JSON.stringify({ client_id: acme.id, issue_date: daysFromToday(0), due_date: daysFromToday(1), currency: 'INR', discount_type: 'fixed', discount_value: 999999999, items: [{ description: 'x', quantity: 1, unit_price: 100 }] })], 'fixed discount larger than subtotal is rejected', /larger than the subtotal/)
await expectError(`select public.save_invoice($1::jsonb)`, [JSON.stringify({ client_id: acme.id, issue_date: daysFromToday(5), due_date: daysFromToday(1), currency: 'INR', items: [{ description: 'x', quantity: 1, unit_price: 100 }] })], 'due date before issue date is rejected', /check/)
await expectError(`select public.save_invoice($1::jsonb)`, [JSON.stringify({ client_id: acme.id, issue_date: daysFromToday(0), due_date: daysFromToday(1), currency: 'INR', items: [] })], 'invoice needs at least one item', /at least one line item/)
await expectError(`select public.save_invoice($1::jsonb)`, [JSON.stringify({ client_id: acme.id, issue_date: daysFromToday(0), due_date: daysFromToday(1), currency: 'INR', items: [{ description: 'x', quantity: -2, unit_price: 100 }] })], 'negative quantity is rejected', /check/)
await expectError(`select public.save_invoice($1::jsonb)`, [JSON.stringify({ client_id: acme.id, issue_date: daysFromToday(0), due_date: daysFromToday(1), currency: 'XYZ', items: [{ description: 'x', quantity: 1, unit_price: 100 }] })], 'unknown currency is rejected', /check/)

// Rounding parity between the database and the browser preview
let mismatches = 0
for (let k = 0; k < 60; k++) {
  const items = Array.from({ length: 1 + (k % 5) }, (_, j) => ({
    description: `Line ${j}`, quantity: ((k * 7 + j * 13) % 2000 + 1) / 1000 * (1 + (j % 3)), unit_price: (k * 99991 + j * 7919) % 5000000 + 1,
  })).map((i) => ({ ...i, quantity: Number(i.quantity.toFixed(3)) }))
  const discount_type = ['none', 'percent', 'fixed'][k % 3]
  const discount_value = discount_type === 'percent' ? (k * 137) % 10001 : discount_type === 'fixed' ? (k * 333) % 1000 : 0
  const tax_rate_bp = (k * 457) % 3000
  const id = await save({ client_id: acme.id, issue_date: daysFromToday(0), due_date: daysFromToday(1), currency: 'INR', discount_type, discount_value, tax_rate_bp, items })
  const dbr = await one(`select subtotal, discount_amount, tax_amount, total from public.invoices where id=$1`, [id])
  const js = calcInvoice({ items: items.map((i) => ({ quantityMilli: Math.round(i.quantity * 1000), unitPrice: i.unit_price })), discountType: discount_type, discountValue: discount_value, taxRateBp: tax_rate_bp })
  if (Number(dbr.subtotal) !== js.subtotal || Number(dbr.discount_amount) !== js.discount || Number(dbr.tax_amount) !== js.tax || Number(dbr.total) !== js.total) mismatches++
  await db.query(`select public.delete_draft_invoice($1)`, [id])
}
ok(mismatches === 0, `database totals equal browser preview on 60 mixed invoices (${mismatches} mismatches)`)

// Users cannot write totals or statuses directly
await expectError(`update public.invoices set total = 1 where id=$1`, [inv1], 'direct UPDATE of invoices is denied', /permission denied/)
await expectError(`insert into public.payments (invoice_id, user_id, amount, paid_on, method) values ($1,$2,100,'2026-01-01','cash')`, [inv1, A], 'direct INSERT into payments is denied', /permission denied/)
await expectError(`delete from public.invoice_events`, [], 'activity log cannot be deleted', /permission denied/)

// ── lifecycle
await expectError(`select public.record_payment($1, 1000, current_date, 'upi')`, [inv1], 'cannot record payment on a draft', /Send the invoice/)
await db.query(`select public.mark_invoice_sent($1, 'manual')`, [inv1])
ok((await one(`select status from public.invoice_overview where id=$1`, [inv1])).status === 'sent', 'draft → sent')
await db.query(`select public.record_payment($1, 4000000, $2::date, 'bank_transfer', 'TXN12345')`, [inv1, daysFromToday(0)])
r = await one(`select status, amount_paid, balance_due from public.invoice_overview where id=$1`, [inv1])
ok(r.status === 'partially_paid' && Number(r.balance_due) === 6030000, 'partial payment → partially paid, balance ₹60,300')
await expectError(`select public.record_payment($1, 6030001, $2::date, 'upi')`, [inv1, daysFromToday(0)], 'payment above balance is rejected', /more than the balance/)
await expectError(`select public.record_payment($1, 100, $2::date, 'upi')`, [inv1, daysFromToday(3)], 'future-dated payment is rejected', /future/)
await expectError(`select public.save_invoice($1::jsonb)`, [JSON.stringify({ id: inv1, client_id: acme.id, issue_date: daysFromToday(0), due_date: daysFromToday(1), currency: 'INR', items: [{ description: 'x', quantity: 1, unit_price: 1 }] })], 'invoice with payments cannot be edited', /no longer be edited/)
await expectError(`select public.cancel_invoice($1)`, [inv1], 'invoice with payments cannot be cancelled', /Void the recorded payments/)
await db.query(`select public.record_payment($1, 6030000, $2::date, 'upi')`, [inv1, daysFromToday(0)])
r = await one(`select status, balance_due, paid_at from public.invoice_overview where id=$1`, [inv1])
ok(r.status === 'paid' && Number(r.balance_due) === 0 && r.paid_at, 'second payment clears balance → paid')
const pay = await one(`select id from public.payments where invoice_id=$1 order by created_at desc limit 1`, [inv1])
await expectError(`select public.void_payment($1, '')`, [pay.id], 'voiding needs a reason', /reason/)
await db.query(`select public.void_payment($1, 'Bank reversed the transfer')`, [pay.id])
r = await one(`select status, paid_at from public.invoice_overview where id=$1`, [inv1])
ok(r.status === 'partially_paid' && !r.paid_at, 'voiding a payment re-derives status (paid → partially paid)')
ok((await rows(`select 1 from public.payments where invoice_id=$1`, [inv1])).length === 2, 'voided payment is kept in history')
const kinds = (await rows(`select kind from public.invoice_events where invoice_id=$1 order by id`, [inv1])).map((x) => x.kind).join(',')
ok(kinds === 'created,sent,payment_recorded,payment_recorded,paid,payment_voided', `activity log: ${kinds}`)

// overdue is derived from the due date
const late = await save({ client_id: acme.id, issue_date: daysFromToday(-30), due_date: daysFromToday(-8), currency: 'INR', tax_rate_bp: 0, items: [{ description: 'Old work', quantity: 1, unit_price: 4200000 }] })
await db.query(`select public.mark_invoice_sent($1)`, [late])
r = await one(`select status, days_until_due from public.invoice_overview where id=$1`, [late])
ok(r.status === 'overdue' && r.days_until_due === -8, 'past due with balance → overdue (8 days)')
await db.query(`select public.cancel_invoice($1, 'Client project dropped')`, [late])
ok((await one(`select status from public.invoice_overview where id=$1`, [late])).status === 'cancelled', 'cancelled overrides overdue')
await expectError(`select public.record_payment($1, 100, current_date, 'upi')`, [late], 'cancelled invoice cannot take payments', /Cancelled/)

// zero-value invoice
const zero = await save({ client_id: acme.id, issue_date: daysFromToday(0), due_date: daysFromToday(1), currency: 'INR', items: [{ description: 'Pro bono', quantity: 1, unit_price: 0 }] })
await expectError(`select public.mark_invoice_sent($1)`, [zero], 'zero-value invoice cannot be sent', /totals zero/)

// counter cannot be rewound
await expectError(`update public.profiles set next_invoice_seq = 1 where id=$1`, [A], 'invoice counter cannot go backwards', /cannot be lower/)

// ── isolation: A looks at B
ok((await rows(`select * from public.clients where id=$1`, [bClient])).length === 0, "A cannot read B's clients")
ok((await rows(`select * from public.invoices where id=$1`, [bInv])).length === 0, "A cannot read B's invoices")
ok((await rows(`select * from public.invoice_overview where id=$1`, [bInv])).length === 0, "A cannot read B's invoice overview")
ok((await rows(`select * from public.invoice_items where invoice_id=$1`, [bInv])).length === 0, "A cannot read B's line items")
ok((await rows(`select * from public.profiles where id=$1`, [B])).length === 0, "A cannot read B's profile")
r = await db.query(`update public.clients set name='hacked' where id=$1`, [bClient])
ok(r.affectedRows === 0, "A cannot update B's client")
r = await db.query(`delete from public.clients where id=$1`, [bClient])
ok(r.affectedRows === 0, "A cannot delete B's client")
await expectError(`select public.save_invoice($1::jsonb)`, [JSON.stringify({ client_id: bClient, issue_date: daysFromToday(0), due_date: daysFromToday(1), currency: 'INR', items: [{ description: 'x', quantity: 1, unit_price: 1 }] })], "A cannot invoice B's client", /active client/)
await expectError(`select public.save_invoice($1::jsonb)`, [JSON.stringify({ id: bInv, client_id: acme.id, issue_date: daysFromToday(0), due_date: daysFromToday(1), currency: 'INR', items: [{ description: 'x', quantity: 1, unit_price: 1 }] })], "A cannot edit B's invoice", /not found/)
await expectError(`select public.mark_invoice_sent($1)`, [bInv], "A cannot send B's invoice", /not found/)
await expectError(`select public.record_payment($1, 1, current_date, 'upi')`, [bInv], "A cannot record payment on B's invoice", /not found/)
await expectError(`select public.delete_draft_invoice($1)`, [bInv], "A cannot delete B's draft", /not found/)
await expectError(`insert into public.clients (user_id, name) values ($1, 'spoof')`, [B], 'A cannot create a client owned by B', /permission denied/)

// ── public link
const token = (await one(`select public_token from public.invoices where id=$1`, [inv2])).public_token
const draftToken = token
await as(null)
ok((await one(`select public.get_public_invoice($1) j`, [draftToken])).j === null, 'public link does not reveal drafts')
await as(A)
await db.query(`select public.mark_invoice_sent($1, 'email', 'acme@example.com')`, [inv2])
await as(null)
const pub = (await one(`select public.get_public_invoice($1) j`, [token])).j
ok(pub && pub.invoice_number === 'INV-0002' && pub.total === 5310000 && pub.items.length === 1, 'anon with token sees the invoice')
ok(!JSON.stringify(pub).includes(A) && !('id' in pub) && !('user_id' in pub), 'public payload contains no internal ids')
ok((await one(`select public.get_public_invoice($1) j`, ['0'.repeat(48)])).j === null, 'unknown token returns nothing')
await expectError(`select * from public.invoices`, [], 'anon cannot query invoices', /permission denied/)
await expectError(`select * from public.clients`, [], 'anon cannot query clients', /permission denied/)
await expectError(`select public.save_invoice('{}'::jsonb)`, [], 'anon cannot call save_invoice', /permission denied/)
await expectError(`select public.load_sample_data()`, [], 'anon cannot load sample data', /permission denied/)
await as(A)
ok((await one(`select status, viewed_at from public.invoice_overview where id=$1`, [inv2])).status === 'viewed', 'opening the public link marks sent → viewed')

// ── sample data
await as(B)
await db.query(`select public.load_sample_data()`)
r = await one(`select count(*)::int n, count(*) filter (where is_sample)::int s from public.invoices`)
const statuses = (await rows(`select status, count(*)::int n from public.invoice_overview where is_sample group by 1 order by 1`)).map((x) => `${x.status}:${x.n}`).join(' ')
ok(r.s === 12, `sample data creates 12 flagged invoices (${statuses})`)
await expectError(`select public.load_sample_data()`, [], 'sample data cannot be loaded twice', /already loaded/)
const lag = await one(`select count(*)::int n from public.invoices i where is_sample and paid_at is not null and paid_at::date <> (select max(paid_on) from public.payments p where p.invoice_id = i.id and voided_at is null)`)
ok(lag.n === 0, 'paid_at is the date of the payment that cleared the balance')
await db.query(`select public.remove_sample_data()`)
r = await one(`select (select count(*) from public.invoices where is_sample)::int i, (select count(*) from public.clients where is_sample)::int c, (select count(*) from public.invoices)::int all_inv`)
ok(r.i === 0 && r.c === 0 && r.all_inv === 1, "removing samples leaves the user's own invoice")
await as(A)
ok((await rows(`select * from public.invoices where is_sample`)).length === 0, "B's sample data is invisible to A")

console.log(`\n${count - failures}/${count} checks passed`)
process.exit(failures ? 1 : 0)
