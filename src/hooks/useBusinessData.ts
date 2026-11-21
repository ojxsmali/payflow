import { clientService, invoiceService, paymentService } from '../services'
import { useLoad } from './useLoad'

/** Invoices (with derived status) + payments: everything the metrics need. */
export function useBusinessData() {
  return useLoad(async () => {
    const [invoices, payments, clients] = await Promise.all([invoiceService.list(), paymentService.listAll(), clientService.list()])
    return { invoices, payments, hasClient: clients.some((c) => !c.archived_at) }
  })
}
