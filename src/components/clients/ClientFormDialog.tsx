import { useEffect, useState, type FormEvent } from 'react'
import { Dialog } from '../ui/Dialog'
import { Button, Field, Input, Textarea } from '../ui'
import type { Client, ClientInput } from '../../types'
import { clientService } from '../../services'
import { humanError } from '../../lib/errors'

const EMPTY: ClientInput = { name: '', company_name: '', email: '', phone: '', address: '', city: '', country: '', tax_id: '', notes: '' }
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export function validateClient(c: ClientInput) {
  const errors: Partial<Record<keyof ClientInput, string>> = {}
  if (!c.name.trim()) errors.name = 'Add a name.'
  else if (c.name.length > 160) errors.name = 'Keep it under 160 characters.'
  if (c.email && !EMAIL.test(c.email.trim())) errors.email = 'Enter a valid email address, like name@company.com.'
  if (c.notes.length > 2000) errors.notes = 'Notes are limited to 2,000 characters.'
  return errors
}

export function ClientFormDialog({ open, onClose, client, onSaved }: {
  open: boolean
  onClose: () => void
  client?: Client | null
  onSaved: (c: Client) => void
}) {
  const [form, setForm] = useState<ClientInput>(EMPTY)
  const [errors, setErrors] = useState<ReturnType<typeof validateClient>>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(client ? { name: client.name, company_name: client.company_name, email: client.email, phone: client.phone, address: client.address, city: client.city, country: client.country, tax_id: client.tax_id, notes: client.notes } : EMPTY)
      setErrors({})
      setServerError(null)
    }
  }, [open, client])

  const bind = (k: keyof ClientInput) => ({
    value: form[k],
    onChange: (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value })),
  })

  async function submit(e: FormEvent) {
    e.preventDefault()
    const clean = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim()])) as ClientInput
    const errs = validateClient(clean)
    setErrors(errs)
    if (Object.keys(errs).length) return
    setBusy(true)
    setServerError(null)
    try {
      const saved = client ? await clientService.update(client.id, clean) : await clientService.create(clean)
      onSaved(saved)
    } catch (err) {
      setServerError(humanError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={client ? 'Edit client' : 'New client'}
      description={client ? undefined : 'Only the name is required. Everything else appears on invoices when filled in.'}
      wide
      footer={
        <>
          <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="client-form" loading={busy}>{client ? 'Save changes' : 'Add client'}</Button>
        </>
      }
    >
      <form id="client-form" onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        {serverError && <p role="alert" className="text-sm text-danger sm:col-span-2">{serverError}</p>}
        <Field label="Client name" error={errors.name}>{({ id, describedBy, invalid }) => <Input id={id} aria-describedby={describedBy} invalid={invalid} autoFocus required {...bind('name')} />}</Field>
        <Field label="Company" optional>{({ id }) => <Input id={id} autoComplete="organization" {...bind('company_name')} />}</Field>
        <Field label="Email" optional hint="Invoices are emailed here." error={errors.email}>{({ id, describedBy, invalid }) => <Input id={id} type="email" aria-describedby={describedBy} invalid={invalid} {...bind('email')} />}</Field>
        <Field label="Phone" optional>{({ id }) => <Input id={id} type="tel" {...bind('phone')} />}</Field>
        <Field label="Address" optional className="sm:col-span-2">{({ id }) => <Input id={id} autoComplete="street-address" {...bind('address')} />}</Field>
        <Field label="City" optional>{({ id }) => <Input id={id} {...bind('city')} />}</Field>
        <Field label="Country" optional>{({ id }) => <Input id={id} autoComplete="country-name" {...bind('country')} />}</Field>
        <Field label="Tax ID" optional hint="GSTIN, VAT or similar.">{({ id, describedBy }) => <Input id={id} aria-describedby={describedBy} {...bind('tax_id')} />}</Field>
        <Field label="Private notes" optional hint="Only you see these." error={errors.notes} className="sm:col-span-2">
          {({ id, describedBy, invalid }) => <Textarea id={id} aria-describedby={describedBy} invalid={invalid} rows={2} {...bind('notes')} />}
        </Field>
      </form>
    </Dialog>
  )
}
