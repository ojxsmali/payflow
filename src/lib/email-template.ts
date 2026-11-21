// Invoice email. Used by the send dialog (preview) and by api/send-invoice.ts
// (the message actually delivered), so what the user sees is what is sent.

export interface InvoiceEmailInput {
  clientName: string
  senderName: string
  invoiceNumber: string
  amount: string // already formatted, e.g. "₹1,00,300"
  dueDate: string // already formatted, e.g. "18 Dec 2026"
  message: string // the user's note
  viewUrl: string
}

export function defaultSubject(i: { invoiceNumber: string; senderName: string }) {
  return `Invoice ${i.invoiceNumber} from ${i.senderName}`
}

export function defaultMessage(i: { clientName: string; invoiceNumber: string; amount: string; dueDate: string; senderName: string; attached?: boolean }) {
  const how = i.attached === false ? 'You can view and download it using the link below.' : 'The PDF is attached, and you can also view it online using the link below.'
  return `Hello ${i.clientName},\n\nYour invoice ${i.invoiceNumber} for ${i.amount} is ready. It is due on ${i.dueDate}.\n\n${how}\n\nThank you,\n${i.senderName}`
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

export function renderInvoiceEmail(i: InvoiceEmailInput) {
  const paragraphs = i.message
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 16px">${esc(p).replace(/\n/g, '<br>')}</p>`)
    .join('')
  const html = `<!doctype html><html><body style="margin:0;background:#f5f4fa;padding:32px 16px;font-family:'IBM Plex Sans',Helvetica,Arial,sans-serif;color:#1a1a18">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fdfcfa;border:1px solid #e2ded5;border-radius:8px">
<tr><td style="padding:28px 32px 8px;font-size:15px;line-height:1.6">${paragraphs}</td></tr>
<tr><td style="padding:0 32px 8px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e2ded5;border-bottom:1px solid #e2ded5">
    <tr><td style="padding:14px 0;font-size:13px;color:#6f6d66">Invoice</td><td align="right" style="padding:14px 0;font-size:13px">${esc(i.invoiceNumber)}</td></tr>
    <tr><td style="padding:0 0 14px;font-size:13px;color:#6f6d66">Amount due</td><td align="right" style="padding:0 0 14px;font-size:18px;font-weight:600">${esc(i.amount)}</td></tr>
    <tr><td style="padding:0 0 14px;font-size:13px;color:#6f6d66">Due date</td><td align="right" style="padding:0 0 14px;font-size:13px">${esc(i.dueDate)}</td></tr>
  </table>
</td></tr>
<tr><td style="padding:20px 32px 32px"><a href="${esc(i.viewUrl)}" style="display:inline-block;background:#5b3df5;color:#fdfcfa;text-decoration:none;font-size:14px;font-weight:500;padding:11px 18px;border-radius:6px">View invoice</a></td></tr>
</table>
<p style="font-size:12px;color:#6f6d66;margin:16px 0 0">Sent by ${esc(i.senderName)} using PayFlow. Reply to this email to reach them directly.</p>
</td></tr></table></body></html>`
  const text = `${i.message}\n\nInvoice: ${i.invoiceNumber}\nAmount due: ${i.amount}\nDue date: ${i.dueDate}\n\nView invoice: ${i.viewUrl}\n\nSent by ${i.senderName} using PayFlow.`
  return { html, text }
}
