import { useState } from 'react'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
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
import {
  Package,
  DoorOpen,
  User,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  Truck,
} from 'lucide-react'
import {
  useSupplementRequest,
  useApproveSupplementRequest,
  useRejectSupplementRequest,
  type SupplementRequestItem,
} from '@/hooks/useSupplementRequests'
import { cn } from '@/lib/utils'

interface SupplementRequestSheetProps {
  requestId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: 'Chờ duyệt', color: 'text-amber-600 bg-amber-100' },
  approved: { label: 'Đã duyệt', color: 'text-blue-600 bg-blue-100' },
  completed: { label: 'Hoàn thành', color: 'text-green-600 bg-green-100' },
  rejected: { label: 'Từ chối', color: 'text-red-600 bg-red-100' },
  cancelled: { label: 'Đã hủy', color: 'text-muted-foreground bg-muted' },
}

const TYPE_LABELS: Record<string, string> = {
  lost: 'Đồ mất',
  consumed: 'Đồ tiêu hao',
  damaged: 'Đồ hỏng',
  mixed: 'Hỗn hợp',
}

export function SupplementRequestSheet({ 
  requestId, 
  open, 
  onOpenChange 
}: SupplementRequestSheetProps) {
  const { data: request, isLoading } = useSupplementRequest(requestId || undefined)
  const approveRequest = useApproveSupplementRequest()
  const rejectRequest = useRejectSupplementRequest()
  
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  
  const handleApprove = async (createOutbound: boolean) => {
    if (!requestId) return
    await approveRequest.mutateAsync({
      requestId,
      createOutbound,
    })
    onOpenChange(false)
  }
  
  const handleReject = async () => {
    if (!requestId || !rejectReason.trim()) return
    await rejectRequest.mutateAsync({
      requestId,
      reason: rejectReason,
    })
    setShowRejectDialog(false)
    setRejectReason('')
    onOpenChange(false)
  }
  
  const statusConfig = STATUS_CONFIG[request?.status || 'pending']
  const items = (request?.items || []) as SupplementRequestItem[]
  const isPending = request?.status === 'pending'
  
  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Chi tiết yêu cầu bổ sung
            </SheetTitle>
            <SheetDescription>
              {isLoading ? (
                <Skeleton className="h-4 w-32" />
              ) : (
                request?.request_code
              )}
            </SheetDescription>
          </SheetHeader>
          
          {isLoading ? (
            <div className="space-y-4 mt-6">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : request ? (
            <div className="space-y-6 mt-6">
              {/* Status and Type */}
              <div className="flex items-center gap-2">
                <Badge className={statusConfig.color}>
                  {statusConfig.label}
                </Badge>
                <Badge variant="outline">
                  {TYPE_LABELS[request.request_type]}
                </Badge>
              </div>
              
              {/* Room and Requester Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <DoorOpen className="h-4 w-4 text-muted-foreground" />
                  <span>Phòng {request.room?.room_number || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{request.requester?.full_name || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2 col-span-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {format(new Date(request.created_at), "HH:mm dd/MM/yyyy", { locale: vi })}
                  </span>
                </div>
              </div>
              
              <Separator />
              
              {/* Items List */}
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Danh sách đồ dùng ({items.length})
                </h4>
                <div className="space-y-2">
                  {items.map((item, index) => (
                    <div 
                      key={`${item.item_id}-${index}`}
                      className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                    >
                      <div>
                        <div className="font-medium text-sm">{item.item_name}</div>
                        {item.item_code && (
                          <div className="text-xs text-muted-foreground font-mono">
                            {item.item_code}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-medium">x{item.quantity}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Intl.NumberFormat('vi-VN').format(item.unit_price * item.quantity)}đ
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Total Value */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary/20">
                <span className="font-medium">Tổng giá trị</span>
                <span className="text-lg font-bold text-primary">
                  {new Intl.NumberFormat('vi-VN').format(request.total_value)}đ
                </span>
              </div>
              
              {/* Notes */}
              {request.notes && (
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Ghi chú
                  </h4>
                  <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                    {request.notes}
                  </p>
                </div>
              )}
              
              {/* Rejection Reason */}
              {request.status === 'rejected' && request.rejection_reason && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                  <h4 className="text-sm font-medium text-red-800 mb-1">Lý do từ chối</h4>
                  <p className="text-sm text-red-700">{request.rejection_reason}</p>
                </div>
              )}
              
              {/* Approval Info */}
              {request.approved_by && request.approved_at && (
                <div className="text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CheckCircle className="h-3.5 w-3.5" />
                    Duyệt bởi {request.approver?.full_name} lúc{' '}
                    {format(new Date(request.approved_at), "HH:mm dd/MM/yyyy", { locale: vi })}
                  </span>
                </div>
              )}
              
              {/* Action Buttons */}
              {isPending && (
                <div className="space-y-2 pt-4">
                  <Button
                    className="w-full"
                    onClick={() => handleApprove(true)}
                    disabled={approveRequest.isPending}
                  >
                    <Truck className="h-4 w-4 mr-2" />
                    Duyệt & Xuất kho
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handleApprove(false)}
                      disabled={approveRequest.isPending}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Chỉ duyệt
                    </Button>
                    <Button
                      variant="outline"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => setShowRejectDialog(true)}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Từ chối
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Không tìm thấy yêu cầu
            </div>
          )}
        </SheetContent>
      </Sheet>
      
      {/* Reject Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Từ chối yêu cầu bổ sung</AlertDialogTitle>
            <AlertDialogDescription>
              Vui lòng nhập lý do từ chối yêu cầu này.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Lý do từ chối..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="min-h-[100px]"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={!rejectReason.trim() || rejectRequest.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              Xác nhận từ chối
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
