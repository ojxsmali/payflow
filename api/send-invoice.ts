// Vercel function: emails an invoice through Resend.
//
// Security
// • The caller's Supabase access token is forwarded, so every read below runs
//   under that user's Row Level Security — no service-role key exists here.
// • The recipient is always the invoice's client email from the database, never
//   an address from the request, so this endpoint can't be used to mail strangers.
// • The Resend API key lives only in server environment variables.
//
// GET  → { configured } so the UI can say honestly whether email is available.
// POST → { invoiceId, subject, message, pdfBase64 } → sends, then marks the invoice sent.

import { createClient } from '@supabase/supabase-js'
import { renderInvoiceEmail } from '../src/lib/email-template.ts'
import { formatMoney } from '../src/lib/money.ts'
import { formatDate } from '../src/lib/dates.ts'

const env = (k: string) => process.env[k] || ''
const supabaseUrl = () => env('SUPABASE_URL') || env('VITE_SUPABASE_URL')
const supabaseAnon = () => env('SUPABASE_ANON_KEY') || env('VITE_SUPABASE_ANON_KEY')
const configured = () => Boolean(env('RESEND_API_KEY') && env('EMAIL_FROM') && supabaseUrl() && supabaseAnon())

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })

export async function GET() {
  return json({ configured: configured() })
}

export async function POST(request: Request) {
  if (!configured()) return json({ error: 'Email delivery is not set up on this deployment.' }, 503)

  const auth = request.headers.get('authorization') || ''
  if (!/^Bearer [\w-]+\.[\w-]+\.[\w-]+$/.test(auth)) return json({ error: 'Log in again to send invoices.' }, 401)

  let body: { invoiceId?: string; subject?: string; message?: string; pdfBase64?: string }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return json({ error: 'Invalid request.' }, 400)
  }
  const { invoiceId, subject = '', message = '', pdfBase64 = '' } = body
  if (!invoiceId || !/^[0-9a-f-]{36}$/i.test(invoiceId)) return json({ error: 'Invalid invoice.' }, 400)
  if (!subject.trim() || subject.length > 200) return json({ error: 'Add a subject (200 characters max).' }, 400)
  if (!message.trim() || message.length > 5000) return json({ error: 'Add a message (5,000 characters max).' }, 400)
  if (pdfBase64.length > 7_000_000 || !pdfBase64.startsWith('JVBERi0')) return json({ error: 'The PDF attachment is missing or too large.' }, 400)

  const db = createClient(supabaseUrl(), supabaseAnon(), {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: userData, error: userError } = await db.auth.getUser(auth.slice(7))
  if (userError || !userData.user) return json({ error: 'Log in again to send invoices.' }, 401)

  const { data: invoice } = await db.from('invoice_overview').select('*').eq('id', invoiceId).maybeSingle()
  if (!invoice) return json({ error: 'Invoice not found.' }, 404)
  if (invoice.status === 'cancelled') return json({ error: 'Cancelled invoices cannot be sent.' }, 400)
  if (!invoice.client_email) return json({ error: 'Add an email address to this client first.' }, 400)
  const { data: profile } = await db.from('profiles').select('*').single()
  if (!profile) return json({ error: 'Profile not found.' }, 404)

  const senderName = profile.business_name || profile.full_name || 'Your freelancer'
  const appUrl = env('APP_URL') || new URL(request.url).origin
  const { html, text } = renderInvoiceEmail({
    clientName: invoice.client_name,
    senderName,
    invoiceNumber: invoice.invoice_number,
    amount: formatMoney(invoice.balance_due, invoice.currency),
    dueDate: formatDate(invoice.due_date),
    message,
    viewUrl: `${appUrl}/i/${invoice.public_token}`,
  })

  const replyTo = profile.email || userData.user.email
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env('EMAIL_FROM'),
      to: [invoice.client_email],
      bcc: profile.email_copy_to_self && replyTo ? [replyTo] : undefined,
      reply_to: replyTo || undefined,
      subject: subject.trim(),
      html,
      text,
      attachments: [{ filename: `${invoice.invoice_number}.pdf`, content: pdfBase64 }],
    }),
  })
  const result = (await res.json().catch(() => ({}))) as { id?: string; message?: string }
  if (!res.ok) {
    const reason = typeof result?.message === 'string' ? result.message : 'unknown error'
    return json({ error: `The email service didn't accept the message (${reason}). Nothing was sent.` }, 502)
  }

  const { error: markError } = await db.rpc('mark_invoice_sent', { p_invoice: invoiceId, p_channel: 'email', p_to: invoice.client_email })
  if (markError) return json({ id: result.id, to: invoice.client_email, warning: 'Email sent, but the invoice status could not be updated.' })
  return json({ id: result.id, to: invoice.client_email })
}
