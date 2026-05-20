import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Download, Printer, Mail, QrCode, Loader2 } from 'lucide-react'
import { GuestInvoice } from '@/hooks/useGuestInvoices'
import { useVatClaimToken } from '@/hooks/useVatClaimToken'
import PaperSizeSelector, { PaperSize } from './PaperSizeSelector'
import {
  buildInvoiceHTMLAsync,
  buildVatClaimUrl,
  generateInvoicePDF,
  printInvoice,
  printVatQrSlip,
} from './InvoicePDFTemplate'

interface Props {
  invoice: GuestInvoice | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSendEmail?: (invoice: GuestInvoice) => void
  hotelInfo?: { name?: string; address?: string; phone?: string; taxCode?: string }
}

export default function InvoicePreviewDialog({ invoice, open, onOpenChange, onSendEmail, hotelInfo }: Props) {
  const [paperSize, setPaperSize] = useState<PaperSize>('K80')
  const [html, setHtml] = useState('')
  const [loading, setLoading] = useState(false)
  const { data: tokenData } = useVatClaimToken(open ? invoice?.id : null)

  const qrPayload = invoice
    ? { url: buildVatClaimUrl(invoice, tokenData?.token), label: 'Quét để lấy hoá đơn VAT' }
    : undefined

  useEffect(() => {
    if (!invoice || !open) return
    let cancelled = false
    setLoading(true)
    buildInvoiceHTMLAsync(invoice, paperSize, hotelInfo, qrPayload)
      .then(h => { if (!cancelled) setHtml(h) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoice?.id, paperSize, open])

  if (!invoice) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] flex flex-col p-0">
        <DialogHeader className="flex-shrink-0 px-4 pt-4 pb-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <DialogTitle className="text-sm">Xem hóa đơn {invoice.invoice_number}</DialogTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <PaperSizeSelector value={paperSize} onChange={setPaperSize} />
              <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => printInvoice(invoice, paperSize, hotelInfo, qrPayload)}>
                <Printer className="h-3.5 w-3.5 mr-1" /> In
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => printVatQrSlip(invoice, qrPayload!, hotelInfo)}>
                <QrCode className="h-3.5 w-3.5 mr-1" /> In QR VAT
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => generateInvoicePDF(invoice, paperSize, hotelInfo, qrPayload)}>
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
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Đang dựng hoá đơn…
            </div>
          ) : (
            <div className="mx-auto bg-white shadow-md rounded" style={{ maxWidth: '820px' }}>
              <div dangerouslySetInnerHTML={{ __html: html }} />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
