import type { Client, InvoiceDocumentData, InvoiceItem, InvoiceRow, Profile } from '../../types'
import { formatRate } from '../../lib/money'

/** Owner-side: assemble the same shape the public link returns, so one renderer serves both. */
export function toDocumentData(inv: InvoiceRow, items: Pick<InvoiceItem, 'description' | 'quantity' | 'unit_price' | 'amount'>[], profile: Profile, client: Client): InvoiceDocumentData {
  return {
    invoice_number: inv.invoice_number,
    issue_date: inv.issue_date,
    due_date: inv.due_date,
    currency: inv.currency,
    discount_type: inv.discount_type,
    discount_value: inv.discount_value,
    tax_label: inv.tax_label,
    tax_rate_bp: inv.tax_rate_bp,
    subtotal: inv.subtotal,
    discount_amount: inv.discount_amount,
    tax_amount: inv.tax_amount,
    total: inv.total,
    amount_paid: inv.amount_paid,
    status: inv.status,
    payment_terms: inv.payment_terms,
    notes: inv.notes,
    from: {
      name: profile.full_name, business_name: profile.business_name, email: profile.email, phone: profile.phone,
      address: profile.address, city: profile.city, country: profile.country, website: profile.website,
      tax_id: profile.tax_id, logo_path: profile.logo_path, payment_instructions: profile.payment_instructions,
    },
    to: {
      name: client.name, company_name: client.company_name, email: client.email, address: client.address,
      city: client.city, country: client.country, tax_id: client.tax_id,
    },
    items: items.map((i) => ({ description: i.description, quantity: Number(i.quantity), unit_price: i.unit_price, amount: i.amount })),
  }
}

export function discountLabel(d: Pick<InvoiceDocumentData, 'discount_type' | 'discount_value'>) {
  return d.discount_type === 'percent' ? `Discount (${formatRate(d.discount_value)})` : 'Discount'
}
export function taxLine(d: Pick<InvoiceDocumentData, 'tax_label' | 'tax_rate_bp'>) {
  return `${d.tax_label || 'Tax'} (${formatRate(d.tax_rate_bp)})`
}
export function fromLines(f: InvoiceDocumentData['from']) {
  return [f.business_name && f.name && f.business_name !== f.name ? f.name : '', f.address, [f.city, f.country].filter(Boolean).join(', '), f.email, f.phone, f.website, f.tax_id && `Tax ID ${f.tax_id}`].filter(Boolean) as string[]
}
export function toLines(t: InvoiceDocumentData['to']) {
  return [t.company_name && t.company_name !== t.name ? t.company_name : '', t.address, [t.city, t.country].filter(Boolean).join(', '), t.email, t.tax_id && `Tax ID ${t.tax_id}`].filter(Boolean) as string[]
}
