import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Download, Printer, Mail, X } from 'lucide-react'
import { GuestInvoice } from '@/hooks/useGuestInvoices'
import PaperSizeSelector, { PaperSize } from './PaperSizeSelector'
import { buildInvoiceHTML, generateInvoicePDF, printInvoice } from './InvoicePDFTemplate'

interface Props {
  invoice: GuestInvoice | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSendEmail?: (invoice: GuestInvoice) => void
  hotelInfo?: { name?: string; address?: string; phone?: string; taxCode?: string }
}

export default function InvoicePreviewDialog({ invoice, open, onOpenChange, onSendEmail, hotelInfo }: Props) {
  const [paperSize, setPaperSize] = useState<PaperSize>('A4')

  if (!invoice) return null

  const html = buildInvoiceHTML(invoice, paperSize, hotelInfo)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] flex flex-col p-0">
        <DialogHeader className="flex-shrink-0 px-4 pt-4 pb-2">
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="text-sm">Xem hóa đơn {invoice.invoice_number}</DialogTitle>
            <div className="flex items-center gap-2">
              <PaperSizeSelector value={paperSize} onChange={setPaperSize} />
              <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => printInvoice(invoice, paperSize, hotelInfo)}>
                <Printer className="h-3.5 w-3.5 mr-1" /> In
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => generateInvoicePDF(invoice, paperSize, hotelInfo)}>
                <Download className="h-3.5 w-3.5 mr-1" /> PDF
              </Button>
              {onSendEmail && (
                <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => onSendEmail(invoice)}>
                  <Mail className="h-3.5 w-3.5 mr-1" /> Email
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-y-auto bg-muted/30 p-4">
          <div className="mx-auto bg-white shadow-md rounded" style={{ maxWidth: '820px' }}>
            <div dangerouslySetInnerHTML={{ __html: html }} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
