import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, 
  Package, 
  CheckCircle, 
  AlertTriangle, 
  TrendingDown, 
  TrendingUp,
  Play,
  Clock,
  XCircle,
  Printer,
  Download,
  User,
  Calendar,
  FileText
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { 
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { 
  useStockAdjustment,
  useApproveAdjustment,
  useRejectAdjustment,
} from '@/hooks/useStockAdjustments'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { PostApprovalActions } from '@/components/inventory/adjustments/PostApprovalActions'

export function MobileAdjustmentDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: adjustment, isLoading } = useStockAdjustment(id!)
  const { mutate: approve, isPending: isApproving } = useApproveAdjustment()
  const { mutate: reject, isPending: isRejecting } = useRejectAdjustment()
  
  const [showApproveSheet, setShowApproveSheet] = useState(false)
  const [showRejectSheet, setShowRejectSheet] = useState(false)
  const [approvalNotes, setApprovalNotes] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!adjustment) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="text-center py-12">
          <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Không tìm thấy phiếu kiểm kê</p>
        </div>
      </div>
    )
  }

  const adjustmentData = adjustment as any
  const adj = adjustmentData.adjustment
  const items = adjustmentData.items || []

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      draft: { label: 'Nháp', variant: 'secondary' },
      in_progress: { label: 'Đang kiểm', variant: 'default' },
      completed: { label: 'Hoàn thành', variant: 'outline' },
      approved: { label: 'Đã duyệt', variant: 'default' },
      rejected: { label: 'Từ chối', variant: 'destructive' }
    }
    return variants[status] || { label: status, variant: 'secondary' }
  }

  const statusBadge = getStatusBadge(adj.status)
  
  const stats = {
    total: items.length,
    checked: items.filter((i: any) => i.actual_quantity !== null).length,
    matched: items.filter((i: any) => i.actual_quantity === i.system_quantity).length,
    discrepancy: items.filter((i: any) => i.actual_quantity !== null && i.actual_quantity !== i.system_quantity).length,
    pending: items.filter((i: any) => i.status === 'pending').length,
  }
  
  const totalValueDifference = items.reduce((sum: number, item: any) => {
    const diff = ((item.actual_quantity || 0) - item.system_quantity) * (item.unit_price || 0)
    return sum + diff
  }, 0)
  
  const canContinue = adj.status === 'draft' || adj.status === 'in_progress'
  const canApprove = adj.status === 'completed' && 
    (user?.role === 'hotel_manager' || user?.role === 'owner' || (user as any)?.user_level_code === 'owner' || (user as any)?.user_level_code === 'manager')
  
  const pendingItems = items.filter((i: any) => i.status === 'pending')
  
  const handleApprove = () => {
    if (!id) return
    approve(
      { adjustmentId: id, approvalNotes },
      {
        onSuccess: () => {
          setShowApproveSheet(false)
          setApprovalNotes('')
          toast.success('Đã duyệt phiếu kiểm kê')
        },
      }
    )
  }
  
  const handleReject = () => {
    if (!id) return
    reject(
      { adjustmentId: id, rejectionReason },
      {
        onSuccess: () => {
          setShowRejectSheet(false)
          setRejectionReason('')
          toast.success('Đã từ chối phiếu kiểm kê')
        },
      }
    )
  }
  
  const handlePrint = () => {
    toast.info('Chức năng in báo cáo đang phát triển')
  }
  
  const handleExport = () => {
    toast.info('Chức năng xuất Excel đang phát triển')
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="flex items-center gap-3 p-4">
          <Link to="/inventory/adjustments">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold truncate">{adj.adjustment_code}</h1>
            <p className="text-sm text-muted-foreground">{formatDate(adj.created_at)}</p>
          </div>
          <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
          {canContinue && (
            <Button 
              size="sm" 
              onClick={() => navigate(`/inventory/adjustments/${id}/check`)}
            >
              <Play className="h-4 w-4 mr-1" />
              Tiếp tục
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-80px)]">
        <div className="p-4 space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tổng mặt hàng</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Package className="h-8 w-8 text-muted-foreground" />
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Đã kiểm</p>
                  <p className="text-2xl font-bold">{stats.checked}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Khớp</p>
                  <p className="text-2xl font-bold text-green-600">{stats.matched}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Lệch</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.discrepancy}</p>
                </div>
                <TrendingDown className="h-8 w-8 text-orange-600" />
              </div>
            </Card>
          </div>
          
          {/* Value Difference Card */}
          {stats.discrepancy > 0 && (
            <Card className="p-4 border-orange-200 bg-orange-50/50 dark:bg-orange-950/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Giá trị chênh lệch</p>
                  <p className={cn(
                    "text-2xl font-bold",
                    totalValueDifference > 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {totalValueDifference > 0 ? '+' : ''}
                    {formatCurrency(Math.abs(totalValueDifference))}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-orange-500" />
              </div>
            </Card>
          )}

          {/* Detailed Info Card */}
          <Card className="p-4 space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <FileText className="h-4 w-4" />
              Thông tin chi tiết
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Loại kiểm kê</p>
                <p className="font-medium">
                  {adj.adjustment_type === 'inventory_check' && '📋 Định kỳ'}
                  {adj.adjustment_type === 'damage' && '❌ Hư hỏng'}
                  {adj.adjustment_type === 'loss' && '🚫 Mất mát'}
                  {adj.adjustment_type === 'correction' && '🔧 Điều chỉnh'}
                  {adj.adjustment_type === 'full' && '📋 Toàn bộ'}
                  {adj.adjustment_type === 'partial' && '📋 Theo danh mục'}
                </p>
              </div>
              
              {adj.scheduled_date && (
                <div>
                  <p className="text-sm text-muted-foreground">Ngày lập</p>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <p className="font-medium">
                      {format(new Date(adj.scheduled_date), 'dd/MM/yyyy', { locale: vi })}
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="border-t pt-4">
              <p className="text-sm text-muted-foreground mb-2">Người tạo</p>
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={adj.created_by_user?.avatar_url} />
                  <AvatarFallback>
                    {adj.created_by_user?.full_name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium">{adj.created_by_user?.full_name || 'N/A'}</span>
              </div>
            </div>
            
            {adj.assigned_to && adj.assigned_to.length > 0 && (
              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground mb-2">Người thực hiện</p>
                <div className="flex -space-x-2">
                  {adj.assigned_to.map((userId: string, i: number) => (
                    <Avatar key={i} className="h-8 w-8 border-2 border-background">
                      <AvatarFallback className="text-xs bg-primary/10">
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4 border-t pt-4">
              {adj.started_at && (
                <div>
                  <p className="text-sm text-muted-foreground">Bắt đầu</p>
                  <p className="font-medium text-sm">
                    {format(new Date(adj.started_at), 'dd/MM HH:mm', { locale: vi })}
                  </p>
                </div>
              )}
              
              {adj.completed_at && (
                <div>
                  <p className="text-sm text-muted-foreground">Hoàn thành</p>
                  <p className="font-medium text-sm">
                    {format(new Date(adj.completed_at), 'dd/MM HH:mm', { locale: vi })}
                  </p>
                </div>
              )}
            </div>
            
            {adj.notes && (
              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground">Ghi chú</p>
                <p className="text-sm mt-1">{adj.notes}</p>
              </div>
            )}
          </Card>
          
          {/* Approval Section for Managers/Owners */}
          {canApprove && (
            <Card className="p-4 border-yellow-300 bg-yellow-50/50 dark:bg-yellow-950/20">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-5 w-5 text-yellow-600" />
                <p className="font-medium">Phiếu cần duyệt</p>
              </div>
              <div className="text-sm text-muted-foreground mb-4">
                <p>• Chênh lệch: <span className="font-semibold text-foreground">{stats.discrepancy} items</span></p>
                <p>• Giá trị: <span className={cn(
                  "font-semibold",
                  totalValueDifference > 0 ? "text-green-600" : "text-red-600"
                )}>
                  {totalValueDifference > 0 ? '+' : ''}{formatCurrency(Math.abs(totalValueDifference))}
                </span></p>
              </div>
              <div className="flex gap-2">
                <Button 
                  className="flex-1" 
                  onClick={() => setShowApproveSheet(true)}
                  disabled={isApproving}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Duyệt
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={() => setShowRejectSheet(true)}
                  disabled={isRejecting}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Từ chối
                </Button>
              </div>
            </Card>
          )}
          
          {/* Post Approval Actions - Show after approved */}
          <PostApprovalActions
            adjustmentId={id!}
            adjustmentCode={adj.adjustment_code}
            hotelId={adj.hotel_id}
            items={items}
            status={adj.status}
            variant="mobile"
          />

          {/* Items Tabs */}
          <Tabs defaultValue="all" className="w-full">
            <TabsList className={cn(
              "w-full grid",
              adj.status === 'completed' ? "grid-cols-4" : "grid-cols-3"
            )}>
              <TabsTrigger value="all" className="text-xs">Tất cả</TabsTrigger>
              <TabsTrigger value="matched" className="text-xs">Khớp</TabsTrigger>
              <TabsTrigger value="discrepancy" className="text-xs">Lệch</TabsTrigger>
              {adj.status === 'completed' && (
                <TabsTrigger value="pending" className="text-xs">
                  Chờ duyệt
                  {stats.pending > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 text-xs">
                      {stats.pending}
                    </Badge>
                  )}
                </TabsTrigger>
              )}
            </TabsList>
            
            <TabsContent value="all" className="space-y-2 mt-4">
              {items.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Chưa có items
                </div>
              ) : (
                items.map((item: any) => (
                  <ItemCard key={item.id} item={item} />
                ))
              )}
            </TabsContent>
            
            <TabsContent value="matched" className="space-y-2 mt-4">
              {items.filter((i: any) => i.actual_quantity === i.system_quantity).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Không có items khớp
                </div>
              ) : (
                items.filter((i: any) => i.actual_quantity === i.system_quantity).map((item: any) => (
                  <ItemCard key={item.id} item={item} />
                ))
              )}
            </TabsContent>
            
            <TabsContent value="discrepancy" className="space-y-2 mt-4">
              {items.filter((i: any) => i.actual_quantity !== null && i.actual_quantity !== i.system_quantity).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Không có items lệch
                </div>
              ) : (
                items.filter((i: any) => i.actual_quantity !== null && i.actual_quantity !== i.system_quantity).map((item: any) => (
                  <ItemCard key={item.id} item={item} showDiscrepancy />
                ))
              )}
            </TabsContent>
            
            {adj.status === 'completed' && (
              <TabsContent value="pending" className="space-y-2 mt-4">
                {pendingItems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Không có items chờ duyệt
                  </div>
                ) : (
                  pendingItems.map((item: any) => (
                    <ItemCard key={item.id} item={item} showStatus />
                  ))
                )}
              </TabsContent>
            )}
          </Tabs>
        </div>
      </ScrollArea>
      
      {/* Fixed Footer Actions */}
      <div className="fixed bottom-16 left-0 right-0 p-4 bg-background border-t">
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            In báo cáo
          </Button>
          <Button variant="outline" className="flex-1" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Xuất Excel
          </Button>
        </div>
      </div>
      
      {/* Approve Sheet */}
      <Sheet open={showApproveSheet} onOpenChange={setShowApproveSheet}>
        <SheetContent side="bottom" className="rounded-t-xl">
          <SheetHeader>
            <SheetTitle>Xác nhận duyệt phiếu</SheetTitle>
            <SheetDescription>
              Sau khi duyệt, các thay đổi về số lượng sẽ được áp dụng vào hệ thống. 
              Hành động này không thể hoàn tác.
            </SheetDescription>
          </SheetHeader>
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">Ghi chú (tùy chọn)</label>
            <Textarea
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
              placeholder="Nhập ghi chú khi duyệt..."
              rows={3}
            />
          </div>
          <SheetFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowApproveSheet(false)}>
              Hủy
            </Button>
            <Button onClick={handleApprove} disabled={isApproving}>
              {isApproving ? 'Đang xử lý...' : 'Xác nhận duyệt'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      
      {/* Reject Sheet */}
      <Sheet open={showRejectSheet} onOpenChange={setShowRejectSheet}>
        <SheetContent side="bottom" className="rounded-t-xl">
          <SheetHeader>
            <SheetTitle>Từ chối phiếu kiểm kê</SheetTitle>
            <SheetDescription>
              Phiếu sẽ được chuyển về trạng thái từ chối và cần kiểm tra lại.
            </SheetDescription>
          </SheetHeader>
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">Lý do từ chối *</label>
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Vui lòng nêu rõ lý do từ chối..."
              rows={3}
            />
          </div>
          <SheetFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowRejectSheet(false)}>
              Hủy
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject} 
              disabled={isRejecting || !rejectionReason}
            >
              {isRejecting ? 'Đang xử lý...' : 'Xác nhận từ chối'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}

// ItemCard component for displaying individual items
function ItemCard({ 
  item, 
  showDiscrepancy = false,
  showStatus = false 
}: { 
  item: any
  showDiscrepancy?: boolean
  showStatus?: boolean
}) {
  const discrepancy = (item.actual_quantity ?? 0) - item.system_quantity
  const hasDiscrepancy = item.actual_quantity !== null && item.actual_quantity !== item.system_quantity
  
  return (
    <Card className="p-3">
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <p className="font-medium">{item.item_name}</p>
          <p className="text-sm text-muted-foreground">{item.item_code}</p>
        </div>
        {item.actual_quantity !== null && (
          <Badge variant={hasDiscrepancy ? 'destructive' : 'default'}>
            {hasDiscrepancy ? 'Lệch' : 'Khớp'}
          </Badge>
        )}
        {showStatus && item.status && (
          <Badge variant="secondary" className="ml-2">
            {item.status === 'pending' && 'Chờ duyệt'}
            {item.status === 'approved' && 'Đã duyệt'}
            {item.status === 'rejected' && 'Từ chối'}
          </Badge>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2 text-sm">
        <div>
          <p className="text-muted-foreground">Hệ thống</p>
          <p className="font-semibold">{item.system_quantity}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Thực tế</p>
          <p className="font-semibold">{item.actual_quantity ?? '-'}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Chênh lệch</p>
          <p className={cn(
            "font-semibold",
            hasDiscrepancy && discrepancy > 0 && "text-green-600",
            hasDiscrepancy && discrepancy < 0 && "text-red-600"
          )}>
            {item.actual_quantity !== null ? (discrepancy > 0 ? '+' : '') + discrepancy : '-'}
          </p>
        </div>
      </div>
      {showDiscrepancy && item.unit_price && hasDiscrepancy && (
        <div className="mt-2 pt-2 border-t text-sm">
          <p className="text-muted-foreground">
            Giá trị chênh lệch: 
            <span className={cn(
              "font-semibold ml-1",
              discrepancy > 0 ? "text-green-600" : "text-red-600"
            )}>
              {discrepancy > 0 ? '+' : ''}{formatCurrency(Math.abs(discrepancy * item.unit_price))}
            </span>
          </p>
        </div>
      )}
      {item.discrepancy_reason && (
        <p className="text-xs text-muted-foreground mt-2 border-t pt-2">
          Lý do: {item.discrepancy_reason}
        </p>
      )}
    </Card>
  )
}
