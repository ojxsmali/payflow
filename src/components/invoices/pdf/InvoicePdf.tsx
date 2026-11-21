// A real, text-based PDF (selectable, searchable) built with @react-pdf/renderer —
// not a screenshot. Rows never split across pages, the totals block stays
// together, and every page carries the sender and invoice number.
import { Document, Font, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import type { InvoiceDocumentData } from '../../../types'
import { formatMoney, formatQuantity } from '../../../lib/money'
import { formatDate } from '../../../lib/dates'
import { discountLabel, fromLines, taxLine, toLines } from '../document'

export interface PdfFontSources {
  sans400: string; sans500: string; sans600: string
  sansExt400: string; sansExt600: string
  mono400: string
  serif400: string
}

let registered = false
export function registerPdfFonts(src: PdfFontSources) {
  if (registered) return
  registered = true
  Font.register({ family: 'Plex', fonts: [{ src: src.sans400 }, { src: src.sans500, fontWeight: 500 }, { src: src.sans600, fontWeight: 600 }] })
  // latin-ext subset carries ₹ and other currency signs; used as a glyph fallback
  Font.register({ family: 'PlexExt', fonts: [{ src: src.sansExt400 }, { src: src.sansExt400, fontWeight: 500 }, { src: src.sansExt600, fontWeight: 600 }] })
  Font.register({ family: 'PlexMono', src: src.mono400 })
  Font.register({ family: 'Newsreader', src: src.serif400 })
  Font.registerHyphenationCallback((word) => [word])
}

const C = { ink: '#1a1a18', ink2: '#4a4944', muted: '#6f6d66', line: '#e2ded5', success: '#2b6a4a' }
const SANS = ['Plex', 'PlexExt'] as unknown as string

const s = StyleSheet.create({
  page: { paddingTop: 48, paddingBottom: 64, paddingHorizontal: 52, fontFamily: 'Plex', fontSize: 9.5, color: C.ink, lineHeight: 1.45 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  sender: { fontSize: 12, fontWeight: 600, maxWidth: 260 },
  title: { fontFamily: 'Newsreader', fontSize: 30, textAlign: 'right', lineHeight: 1 },
  number: { fontFamily: 'PlexMono', fontSize: 10, color: C.ink2, textAlign: 'right', marginTop: 6 },
  stamp: { marginTop: 14, alignSelf: 'flex-start', borderWidth: 1, borderColor: C.success, color: C.success, fontSize: 8, fontWeight: 600, letterSpacing: 1.5, paddingHorizontal: 6, paddingVertical: 2 },
  meta: { flexDirection: 'row', marginTop: 22, paddingVertical: 12, borderTopWidth: 0.75, borderBottomWidth: 0.75, borderColor: C.line },
  metaCell: { flex: 1 },
  label: { fontSize: 7.5, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 3 },
  parties: { flexDirection: 'row', marginTop: 22, gap: 24 },
  party: { flex: 1 },
  partyName: { fontWeight: 500, marginBottom: 1 },
  partyLine: { color: C.ink2 },
  thead: { flexDirection: 'row', marginTop: 24, paddingBottom: 5, borderBottomWidth: 1, borderColor: C.ink, fontWeight: 500 },
  row: { flexDirection: 'row', paddingVertical: 7, borderBottomWidth: 0.75, borderColor: C.line },
  cDesc: { flex: 1, paddingRight: 12 },
  cQty: { width: 44, textAlign: 'right' },
  cRate: { width: 88, textAlign: 'right' },
  cAmt: { width: 96, textAlign: 'right' },
  totals: { marginTop: 12, marginLeft: 'auto', width: 230 },
  tRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2.5 },
  tTotal: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, paddingTop: 6, borderTopWidth: 1, borderColor: C.ink, fontSize: 11.5, fontWeight: 600 },
  extra: { marginTop: 22, paddingTop: 14, borderTopWidth: 0.75, borderColor: C.line },
  extraRow: { flexDirection: 'row' },
  extraBlock: { flex: 1, paddingRight: 18 },
  extraText: { color: C.ink2 },
  footer: { fontFamily: 'Plex', position: 'absolute', bottom: 28, left: 52, right: 52, fontSize: 7.5, color: C.muted },
})

export function InvoicePdfDocument({ data, logoUrl }: { data: InvoiceDocumentData; logoUrl?: string | null }) {
  const m = (v: number) => formatMoney(v, data.currency, { cents: true })
  const sender = data.from.business_name || data.from.name
  const paid = data.status === 'paid'
  const balance = data.total - data.amount_paid
  const columns = [
    data.from.payment_instructions && { label: 'How to pay', text: data.from.payment_instructions },
    data.payment_terms && { label: 'Payment terms', text: data.payment_terms },
  ].filter(Boolean) as { label: string; text: string }[]

  return (
    <Document title={`Invoice ${data.invoice_number}`} author={sender} subject={`Invoice for ${data.to.name}`} creator="PayFlow" producer="PayFlow">
      <Page size="A4" style={s.page}>
        {/* glyph fallback (₹ etc.) on the content only: react-pdf drops render-prop text under a font array */}
        <View style={{ fontFamily: SANS }}>
        <View style={s.header}>
          <View>
            {logoUrl ? <Image src={logoUrl} style={{ maxHeight: 40, maxWidth: 150, marginBottom: 8, objectFit: 'contain' }} /> : null}
            <Text style={s.sender}>{sender}</Text>
          </View>
          <View>
            <Text style={s.title}>Invoice</Text>
            <Text style={s.number}>{data.invoice_number}</Text>
          </View>
        </View>
        {paid && <Text style={s.stamp}>PAID</Text>}

        <View style={s.meta}>
          <View style={s.metaCell}><Text style={s.label}>Issued</Text><Text>{formatDate(data.issue_date)}</Text></View>
          <View style={s.metaCell}><Text style={s.label}>Due</Text><Text>{formatDate(data.due_date)}</Text></View>
          <View style={[s.metaCell, { alignItems: 'flex-end' }]}>
            <Text style={s.label}>{paid ? 'Total paid' : 'Amount due'}</Text>
            <Text style={{ fontSize: 12, fontWeight: 600 }}>{m(paid ? data.total : balance)}</Text>
          </View>
        </View>

        <View style={s.parties}>
          <View style={s.party}>
            <Text style={s.label}>From</Text>
            <Text style={s.partyName}>{sender}</Text>
            {fromLines(data.from).map((l, i) => <Text key={i} style={s.partyLine}>{l}</Text>)}
          </View>
          <View style={s.party}>
            <Text style={s.label}>Bill to</Text>
            <Text style={s.partyName}>{data.to.name}</Text>
            {toLines(data.to).map((l, i) => <Text key={i} style={s.partyLine}>{l}</Text>)}
          </View>
        </View>

        <View style={s.thead}>
          <Text style={s.cDesc}>Description</Text>
          <Text style={s.cQty}>Qty</Text>
          <Text style={s.cRate}>Rate</Text>
          <Text style={s.cAmt}>Amount</Text>
        </View>
        {data.items.map((it, i) => (
          <View key={i} style={s.row} wrap={false}>
            <Text style={s.cDesc}>{it.description}</Text>
            <Text style={[s.cQty, { color: C.ink2 }]}>{formatQuantity(it.quantity)}</Text>
            <Text style={[s.cRate, { color: C.ink2 }]}>{m(it.unit_price)}</Text>
            <Text style={s.cAmt}>{m(it.amount)}</Text>
          </View>
        ))}

        <View style={s.totals} wrap={false}>
          <View style={s.tRow}><Text style={{ color: C.ink2 }}>Subtotal</Text><Text>{m(data.subtotal)}</Text></View>
          {data.discount_amount > 0 && <View style={s.tRow}><Text style={{ color: C.ink2 }}>{discountLabel(data)}</Text><Text>−{m(data.discount_amount)}</Text></View>}
          {data.tax_rate_bp > 0 && <View style={s.tRow}><Text style={{ color: C.ink2 }}>{taxLine(data)}</Text><Text>{m(data.tax_amount)}</Text></View>}
          <View style={s.tTotal}><Text>Total</Text><Text>{m(data.total)}</Text></View>
          {data.amount_paid > 0 && (
            <>
              <View style={[s.tRow, { marginTop: 4 }]}><Text style={{ color: C.ink2 }}>Paid</Text><Text>−{m(data.amount_paid)}</Text></View>
              <View style={s.tRow}><Text style={{ fontWeight: 600 }}>Balance due</Text><Text style={{ fontWeight: 600 }}>{m(balance)}</Text></View>
            </>
          )}
        </View>

        {(columns.length > 0 || data.notes) && (
          <View style={s.extra}>
            {columns.length > 0 && (
              <View style={s.extraRow} wrap={false}>
                {columns.map((e) => (
                  <View key={e.label} style={s.extraBlock}>
                    <Text style={s.label}>{e.label}</Text>
                    <Text style={s.extraText}>{e.text}</Text>
                  </View>
                ))}
              </View>
            )}
            {data.notes ? (
              <View style={{ marginTop: columns.length ? 14 : 0 }} wrap={false}>
                <Text style={s.label}>Notes</Text>
                <Text style={s.extraText}>{data.notes}</Text>
              </View>
            ) : null}
          </View>
        )}

        </View>
        <Text style={s.footer} fixed>{`${sender}  ·  ${data.invoice_number}`}</Text>
      </Page>
    </Document>
  )
}
