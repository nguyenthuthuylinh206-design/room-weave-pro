import { 
  Copy, 
  Printer, 
  Trash2,
  Download,
  Upload,
  Settings,
  AlertCircle,
  User,
  MapPin,
  Calendar,
  FileText,
  Image as ImageIcon,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useState } from 'react'
import { useInventoryTransaction, useDeleteTransaction } from '@/hooks/useInventoryTransactions'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface TransactionDetailDialogProps {
  transactionId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount)
}

const transactionIcons: Record<string, any> = {
  in: Download,
  out: Upload,
  adjust: Settings,
  damaged: AlertCircle,
  lost: AlertCircle,
}

const transactionLabels: Record<string, string> = {
  in: 'NHẬP KHO',
  out: 'XUẤT KHO',
  transfer: 'CHUYỂN KHO',
  adjust: 'ĐIỀU CHỈNH',
  damaged: 'HƯ HỎNG',
  lost: 'MẤT MÁT',
}

const transactionColors: Record<string, string> = {
  in: 'bg-success/10 text-success',
  out: 'bg-warning/10 text-warning',
  adjust: 'bg-yellow-100 text-yellow-800',
  damaged: 'bg-destructive/10 text-destructive',
  lost: 'bg-destructive/10 text-destructive',
}

export function TransactionDetailDialog({
  transactionId,
  open,
  onOpenChange,
}: TransactionDetailDialogProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const { data: transaction, isLoading } = useInventoryTransaction(transactionId || undefined)
  const { mutate: deleteTransaction, isPending: isDeleting } = useDeleteTransaction()
  
  if (!transaction || isLoading) {
    return null
  }
  
  const Icon = transactionIcons[transaction.transaction_type]
  const label = transactionLabels[transaction.transaction_type]
  const colorClass = transactionColors[transaction.transaction_type]
  
  const canDelete = 
    (Date.now() - new Date(transaction.created_at).getTime()) / (1000 * 60 * 60) < 24
  
  const handleCopy = () => {
    navigator.clipboard.writeText(transaction.transaction_code)
    toast.success('Đã sao chép mã giao dịch')
  }
  
  const handlePrint = () => {
    window.print()
  }
  
  const handleDelete = () => {
    if (transactionId) {
      deleteTransaction(transactionId, {
        onSuccess: () => {
          setShowDeleteConfirm(false)
          onOpenChange(false)
        },
      })
    }
  }
  
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn('rounded-lg p-2', colorClass)}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="flex items-center gap-2">
                    {transaction.transaction_code}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopy}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </DialogTitle>
                  <Badge className={colorClass}>{label}</Badge>
                </div>
              </div>
            </div>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="space-y-3">
              <h3 className="font-semibold">Thông tin giao dịch</h3>
              <div className="grid gap-3 rounded-lg border p-4">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Thời gian:</span>
                  <span className="font-medium">
                    {format(new Date(transaction.created_at), 'PPP HH:mm', { locale: vi })}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Người thực hiện:</span>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={transaction.created_by_user?.avatar_url} />
                      <AvatarFallback>
                        {transaction.created_by_user?.full_name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">
                      {transaction.created_by_user?.full_name}
                    </span>
                  </div>
                </div>
                
                {transaction.from_location && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Từ:</span>
                    <span className="font-medium">{transaction.from_location}</span>
                  </div>
                )}
                
                {transaction.to_location && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Đến:</span>
                    <span className="font-medium">{transaction.to_location}</span>
                  </div>
                )}
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-3">
              <h3 className="font-semibold">Chi tiết đồ dùng</h3>
              <div className="rounded-lg border p-4">
                <div className="flex items-start gap-4">
                  {transaction.item?.images?.[0] && (
                    <img
                      src={transaction.item.images[0]}
                      alt={transaction.item.name}
                      className="h-20 w-20 rounded-lg object-cover"
                    />
                  )}
                  <div className="flex-1 space-y-2">
                    <div>
                      <p className="font-semibold">{transaction.item?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {transaction.item?.code}
                      </p>
                      {transaction.item?.category && (
                        <Badge variant="outline" className="mt-1">
                          {transaction.item.category.name}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Số lượng:</p>
                        <p className={cn(
                          'text-lg font-bold',
                          transaction.quantity > 0 ? 'text-success' : 'text-destructive'
                        )}>
                          {transaction.quantity > 0 ? '+' : ''}{transaction.quantity}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Đơn giá:</p>
                        <p className="text-lg font-bold">
                          {formatCurrency(transaction.unit_price || 0)}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-muted-foreground">Tổng giá trị:</p>
                        <p className="text-xl font-bold">
                          {formatCurrency(transaction.total_value || 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-3">
              <h3 className="font-semibold">Số lượng trước/sau</h3>
              <div className="grid grid-cols-3 gap-4 rounded-lg border p-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Trước giao dịch</p>
                  <p className="text-2xl font-bold">{transaction.quantity_before}</p>
                </div>
                <div className="flex items-center justify-center">
                  <div className={cn(
                    'rounded-full p-2',
                    transaction.quantity > 0 ? 'bg-success/10' : 'bg-destructive/10'
                  )}>
                    {transaction.quantity > 0 ? (
                      <Download className="h-5 w-5 text-success" />
                    ) : (
                      <Upload className="h-5 w-5 text-destructive" />
                    )}
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Sau giao dịch</p>
                  <p className="text-2xl font-bold">{transaction.quantity_after}</p>
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Thay đổi</p>
                <p className={cn(
                  'text-xl font-bold',
                  transaction.quantity > 0 ? 'text-success' : 'text-destructive'
                )}>
                  {transaction.quantity > 0 ? '+' : ''}{transaction.quantity}
                </p>
              </div>
            </div>
            
            {transaction.notes && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h3 className="font-semibold">Ghi chú</h3>
                  <p className="text-sm text-muted-foreground">{transaction.notes}</p>
                </div>
              </>
            )}
            
            {transaction.documents && transaction.documents.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h3 className="font-semibold">Tài liệu</h3>
                  <div className="flex flex-wrap gap-2">
                    {transaction.documents.map((doc, index) => (
                      <Button key={index} variant="outline" size="sm" asChild>
                        <a href={doc} target="_blank" rel="noopener noreferrer">
                          <FileText className="mr-2 h-4 w-4" />
                          Tài liệu {index + 1}
                        </a>
                      </Button>
                    ))}
                  </div>
                </div>
              </>
            )}
            
            {transaction.photos && transaction.photos.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h3 className="font-semibold">Hình ảnh</h3>
                  <div className="grid grid-cols-4 gap-2">
                    {transaction.photos.map((photo, index) => (
                      <a
                        key={index}
                        href={photo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group relative aspect-square overflow-hidden rounded-lg border"
                      >
                        <img
                          src={photo}
                          alt={`Photo ${index + 1}`}
                          className="h-full w-full object-cover transition-transform group-hover:scale-110"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                          <ImageIcon className="h-6 w-6 text-white" />
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              </>
            )}
            
            <div className="flex justify-between border-t pt-4">
              <div className="flex gap-2">
                <Button variant="outline" onClick={handlePrint}>
                  <Printer className="mr-2 h-4 w-4" />
                  In phiếu
                </Button>
              </div>
              
              {canDelete && (
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Hủy giao dịch
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận hủy giao dịch</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn hủy giao dịch này? Số lượng sẽ được hoàn về trạng thái trước đó.
              Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Đang xử lý...' : 'Xác nhận hủy'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
