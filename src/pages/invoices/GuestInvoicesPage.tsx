import { useState } from 'react'
import { Search, FileText, Download, Plus, MoreHorizontal, CheckCircle, XCircle, Eye, Edit, Copy, Printer, Mail, FileSpreadsheet } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useGuestInvoices, useUpdateGuestInvoice, useCreateGuestInvoice, GuestInvoice } from '@/hooks/useGuestInvoices'
import { useTenant } from '@/hooks/useTenant'
import { useHotelContext } from '@/contexts/HotelContext'
import { useUser } from '@/hooks/useUser'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { generateInvoicePDF, printInvoice, buildVatClaimUrl } from '@/components/invoices/InvoicePDFTemplate'
import { useEnsureVatClaimToken } from '@/hooks/useVatClaimToken'
import { toast } from 'sonner'
import { exportToExcel } from '@/utils/exportUtils'
import CreateInvoiceDialog from '@/components/invoices/CreateInvoiceDialog'
import InvoicePreviewDialog from '@/components/invoices/InvoicePreviewDialog'
import EditInvoiceDialog from '@/components/invoices/EditInvoiceDialog'
import SendInvoiceEmailDialog from '@/components/invoices/SendInvoiceEmailDialog'

const STATUS_OPTIONS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'draft', label: 'Nháp' },
  { value: 'issued', label: 'Đã xuất' },
  { value: 'cancelled', label: 'Đã hủy' },
]

const STATUS_COLORS: Record<string, string> = {
  draft: 'text-amber-600',
  issued: 'text-green-600',
  cancelled: 'text-red-600',
}

export default function GuestInvoicesPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showCreate, setShowCreate] = useState(false)
  const [previewInvoice, setPreviewInvoice] = useState<GuestInvoice | null>(null)
  const [editInvoice, setEditInvoice] = useState<GuestInvoice | null>(null)
  const [emailInvoice, setEmailInvoice] = useState<GuestInvoice | null>(null)

  const { tenant } = useTenant()
  const { selectedHotel } = useHotelContext()
  const { user } = useUser()
  const { data: invoices = [], isLoading } = useGuestInvoices({ status: statusFilter, search })
  const updateInvoice = useUpdateGuestInvoice()
  const createInvoice = useCreateGuestInvoice()
  const ensureToken = useEnsureVatClaimToken()

  const hotelInfo = selectedHotel ? {
    name: selectedHotel.name,
    address: (selectedHotel as any).address,
    phone: (selectedHotel as any).phone,
    taxCode: (selectedHotel as any).tax_code,
  } : undefined

  const buildQrPayload = async (inv: GuestInvoice) => {
    try {
      const t = await ensureToken(inv.id)
      const url = buildVatClaimUrl(inv, t?.token)
      if (!url) return undefined
      return { url, label: `${url.replace(/^https?:\/\//, '')} · Hạn 7 ngày` }
    } catch (e: any) {
      toast.error('Không tạo được mã QR VAT', { description: e?.message })
      return undefined
    }
  }

  const handlePrint = async (inv: GuestInvoice) => {
    const qr = await buildQrPayload(inv)
    printInvoice(inv, 'K80', hotelInfo, qr)
  }

  const handleDownloadPDF = async (inv: GuestInvoice) => {
    const qr = await buildQrPayload(inv)
    generateInvoicePDF(inv, 'K80', hotelInfo, qr)
  }

  const handleIssue = (id: string) => {
    updateInvoice.mutate({ id, status: 'issued', issued_at: new Date().toISOString() })
  }

  const handleCancel = (id: string) => {
    updateInvoice.mutate({ id, status: 'cancelled' })
  }

  const handleDuplicate = async (inv: GuestInvoice) => {
    if (!tenant?.id || !selectedHotel?.id) return
    await createInvoice.mutateAsync({
      tenant_id: tenant.id,
      hotel_id: selectedHotel.id,
      guest_name: inv.guest_name,
      guest_phone: inv.guest_phone,
      guest_address: inv.guest_address,
      guest_tax_code: inv.guest_tax_code,
      company_name: inv.company_name,
      room_number: inv.room_number,
      check_in_date: inv.check_in_date,
      check_out_date: inv.check_out_date,
      line_items: inv.line_items,
      subtotal: inv.subtotal,
      vat_rate: inv.vat_rate,
      vat_amount: inv.vat_amount,
      service_fee_rate: inv.service_fee_rate,
      service_fee_amount: inv.service_fee_amount,
      total_amount: inv.total_amount,
      deposit_amount: inv.deposit_amount,
      amount_paid: 0,
      payment_method: inv.payment_method,
      notes: `Nhân bản từ ${inv.invoice_number}`,
      status: 'draft',
      created_by: user?.id || null,
    })
  }

  const handleExportExcel = () => {
    const data = invoices.map(inv => ({
      'Số HĐ': inv.invoice_number,
      'Khách hàng': inv.guest_name,
      'Phòng': inv.room_number || '',
      'Tổng tiền': inv.total_amount,
      'Đã TT': inv.amount_paid,
      'Trạng thái': STATUS_OPTIONS.find(s => s.value === inv.status)?.label || inv.status,
      'Ngày tạo': inv.created_at ? format(new Date(inv.created_at), 'dd/MM/yyyy HH:mm') : '',
    }))
    exportToExcel(data, `hoa-don-khach-${format(new Date(), 'yyyy-MM-dd')}`, 'Hóa đơn')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          <h1 className="text-lg font-semibold">Hóa đơn khách</h1>
          <Badge variant="secondary" className="text-xs">{invoices.length}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" className="h-8" onClick={handleExportExcel} disabled={invoices.length === 0}>
            <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
          </Button>
          <Button type="button" size="sm" className="h-8" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-1" /> Tạo hóa đơn
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Tìm số HĐ, tên khách..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[120px] h-8"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />)}</div>
      ) : invoices.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
          <FileText className="h-10 w-10" />
          <p className="text-sm">Chưa có hóa đơn nào</p>
        </div>
      ) : (
        <div className="border rounded-lg divide-y">
          {invoices.map((inv) => (
            <div key={inv.id} className="flex items-center gap-3 p-3 hover:bg-muted/30 cursor-pointer" onClick={() => setPreviewInvoice(inv)}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-medium">{inv.invoice_number}</span>
                  <span className={`text-xs font-medium ${STATUS_COLORS[inv.status] || ''}`}>
                    {STATUS_OPTIONS.find(s => s.value === inv.status)?.label}
                  </span>
                  {inv.email_sent_at && <Mail className="h-3 w-3 text-muted-foreground" />}
                </div>
                <div className="text-sm">{inv.guest_name} {inv.room_number && `• P.${inv.room_number}`}</div>
                <div className="text-xs text-muted-foreground">
                  {inv.created_at && format(new Date(inv.created_at), 'dd/MM/yyyy HH:mm')}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="font-mono text-sm font-medium">{formatCurrency(inv.total_amount)}</div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuItem onClick={() => setPreviewInvoice(inv)}>
                    <Eye className="h-4 w-4 mr-2" /> Xem trước
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => generateInvoicePDF(inv)}>
                    <Download className="h-4 w-4 mr-2" /> Tải PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => printInvoice(inv)}>
                    <Printer className="h-4 w-4 mr-2" /> In
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setEmailInvoice(inv)}>
                    <Mail className="h-4 w-4 mr-2" /> Gửi email
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {inv.status === 'draft' && (
                    <DropdownMenuItem onClick={() => setEditInvoice(inv)}>
                      <Edit className="h-4 w-4 mr-2" /> Chỉnh sửa
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => handleDuplicate(inv)}>
                    <Copy className="h-4 w-4 mr-2" /> Nhân bản
                  </DropdownMenuItem>
                  {inv.status === 'draft' && (
                    <DropdownMenuItem onClick={() => handleIssue(inv.id)}>
                      <CheckCircle className="h-4 w-4 mr-2" /> Xuất chính thức
                    </DropdownMenuItem>
                  )}
                  {inv.status !== 'cancelled' && (
                    <DropdownMenuItem onClick={() => handleCancel(inv.id)} className="text-red-600">
                      <XCircle className="h-4 w-4 mr-2" /> Hủy hóa đơn
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}

      <CreateInvoiceDialog open={showCreate} onOpenChange={setShowCreate} />
      <InvoicePreviewDialog
        invoice={previewInvoice}
        open={!!previewInvoice}
        onOpenChange={(v) => { if (!v) setPreviewInvoice(null) }}
        onSendEmail={(inv) => { setPreviewInvoice(null); setEmailInvoice(inv) }}
        hotelInfo={selectedHotel ? {
          name: selectedHotel.name,
          address: (selectedHotel as any).address,
          phone: (selectedHotel as any).phone,
          taxCode: (selectedHotel as any).tax_code,
        } : undefined}
      />
      <EditInvoiceDialog
        invoice={editInvoice}
        open={!!editInvoice}
        onOpenChange={(v) => { if (!v) setEditInvoice(null) }}
      />
      <SendInvoiceEmailDialog
        invoice={emailInvoice}
        open={!!emailInvoice}
        onOpenChange={(v) => { if (!v) setEmailInvoice(null) }}
        hotelInfo={selectedHotel ? {
          name: selectedHotel.name,
          address: (selectedHotel as any).address,
          phone: (selectedHotel as any).phone,
          taxCode: (selectedHotel as any).tax_code,
        } : undefined}
      />
    </div>
  )
}
