import { useState } from 'react'
import { Search, FileText, Download, Plus, MoreHorizontal, CheckCircle, XCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useGuestInvoices, useUpdateGuestInvoice } from '@/hooks/useGuestInvoices'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { generateInvoicePDF } from '@/components/invoices/InvoicePDFTemplate'
import CreateInvoiceDialog from '@/components/invoices/CreateInvoiceDialog'

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

  const { data: invoices = [], isLoading } = useGuestInvoices({ status: statusFilter, search })
  const updateInvoice = useUpdateGuestInvoice()

  const handleExportPDF = (invoice: any) => {
    generateInvoicePDF(invoice)
  }

  const handleIssue = (id: string) => {
    updateInvoice.mutate({ id, status: 'issued', issued_at: new Date().toISOString() })
  }

  const handleCancel = (id: string) => {
    updateInvoice.mutate({ id, status: 'cancelled' })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          <h1 className="text-lg font-semibold">Hóa đơn khách</h1>
          <Badge variant="secondary" className="text-xs">{invoices.length}</Badge>
        </div>
        <Button type="button" size="sm" className="h-8" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-1" /> Tạo hóa đơn
        </Button>
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
            <div key={inv.id} className="flex items-center gap-3 p-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-medium">{inv.invoice_number}</span>
                  <span className={`text-xs font-medium ${STATUS_COLORS[inv.status] || ''}`}>
                    {STATUS_OPTIONS.find(s => s.value === inv.status)?.label}
                  </span>
                </div>
                <div className="text-sm">{inv.guest_name} {inv.room_number && `• P.${inv.room_number}`}</div>
                <div className="text-xs text-muted-foreground">
                  {inv.created_at && format(new Date(inv.created_at), 'dd/MM/yyyy HH:mm')}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="font-mono text-sm font-medium">{formatCurrency(inv.total_amount)}</div>
              </div>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleExportPDF(inv)}>
                <Download className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
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
    </div>
  )
}
