import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useBreakpoint } from '@/lib/breakpoints'
import { MobileAdjustmentDetail } from '@/components/inventory/MobileAdjustmentDetail'
import { 
  ArrowLeft, 
  CheckCircle, 
  XCircle,
  Clock,
  Printer,
  Download,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
  useStockAdjustment,
  useApproveAdjustment,
  useRejectAdjustment,
} from '@/hooks/useStockAdjustments'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { cn } from '@/lib/utils'

export function AdjustmentDetailPage() {
  const { isMobile } = useBreakpoint()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [showApproveDialog, setShowApproveDialog] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [approvalNotes, setApprovalNotes] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  
  const { data, isLoading } = useStockAdjustment(id)
  const { mutate: approve, isPending: isApproving } = useApproveAdjustment()
  const { mutate: reject, isPending: isRejecting } = useRejectAdjustment()
  
  if (isMobile) {
    return <MobileAdjustmentDetail />
  }
  
  if (isLoading || !data) {
    return <div>Loading...</div>
  }
  
  const adjustment = data.adjustment
  const items = data.items || []
  
  const allItems = items
  const matchedItems = items.filter((i: any) => i.system_quantity === i.actual_quantity)
  const discrepancyItems = items.filter((i: any) => i.system_quantity !== i.actual_quantity)
  const pendingItems = items.filter((i: any) => i.status === 'pending')
  
  // Calculate stats from items
  const totalItems = items.length
  const totalItemsChecked = items.filter((i: any) => i.checked_at !== null).length
  const totalDiscrepancies = discrepancyItems.length
  const totalValueDifference = items.reduce((sum: number, item: any) => {
    const diff = (item.actual_quantity - item.system_quantity) * (item.unit_price || 0)
    return sum + diff
  }, 0)
  
  const canApprove = 
    adjustment.status === 'completed' && 
    (user?.role === 'hotel_manager' || user?.role === 'owner')
  
  const handleApprove = () => {
    if (!id) return
    approve(
      { adjustmentId: id, approvalNotes },
      {
        onSuccess: () => {
          setShowApproveDialog(false)
          setApprovalNotes('')
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
          setShowRejectDialog(false)
          setRejectionReason('')
        },
      }
    )
  }
  
  return (
    <div className="space-y-6">
      <PageHeader
        title={adjustment.adjustment_code}
        description="Chi tiết phiếu kiểm kê"
      >
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/inventory/adjustments')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quay lại
          </Button>
          {(adjustment.status === 'draft' || adjustment.status === 'in_progress') && (
            <Button onClick={() => navigate(`/inventory/adjustments/${id}/check`)}>
              Tiếp tục kiểm kê
            </Button>
          )}
        </div>
      </PageHeader>
      
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Info Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Thông tin phiếu</CardTitle>
                <Badge>
                  {adjustment.status === 'draft' && 'Nháp'}
                  {adjustment.status === 'in_progress' && 'Đang kiểm'}
                  {adjustment.status === 'completed' && 'Hoàn thành'}
                  {adjustment.status === 'approved' && 'Đã duyệt'}
                  {adjustment.status === 'rejected' && 'Từ chối'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Loại kiểm kê</p>
                  <p className="font-medium">
                    {adjustment.adjustment_type === 'inventory_check' && '📋 Kiểm kê định kỳ'}
                    {adjustment.adjustment_type === 'damage' && '❌ Kiểm tra hư hỏng'}
                    {adjustment.adjustment_type === 'loss' && '🚫 Kiểm tra mất mát'}
                    {adjustment.adjustment_type === 'correction' && '🔧 Điều chỉnh số liệu'}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground">Ngày lập</p>
                  <p className="font-medium">
                    {adjustment.scheduled_date && format(new Date(adjustment.scheduled_date), 'dd/MM/yyyy', { locale: vi })}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground">Người tạo</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={adjustment.created_by_user?.avatar_url} />
                      <AvatarFallback>
                        {adjustment.created_by_user?.full_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{adjustment.created_by_user?.full_name || 'N/A'}</span>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground">Người thực hiện</p>
                  <div className="flex -space-x-2 mt-1">
                    {adjustment.assigned_to?.map((userId: string, i: number) => (
                      <Avatar key={i} className="h-6 w-6 border-2 border-background">
                        <AvatarFallback className="text-xs">U</AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                </div>
                
                {adjustment.started_at && (
                  <div>
                    <p className="text-sm text-muted-foreground">Bắt đầu</p>
                    <p className="font-medium">
                      {format(new Date(adjustment.started_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
                    </p>
                  </div>
                )}
                
                {adjustment.completed_at && (
                  <div>
                    <p className="text-sm text-muted-foreground">Hoàn thành</p>
                    <p className="font-medium">
                      {format(new Date(adjustment.completed_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
                    </p>
                  </div>
                )}
              </div>
              
              {adjustment.notes && (
                <div className="border-t pt-4">
                  <p className="text-sm text-muted-foreground mb-1">Ghi chú</p>
                  <p className="text-sm">{adjustment.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Items Table */}
          <Card>
            <CardHeader>
              <CardTitle>Chi tiết items</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="all">
                <TabsList>
                  <TabsTrigger value="all">Tất cả ({allItems.length})</TabsTrigger>
                  <TabsTrigger value="matched">Khớp ({matchedItems.length})</TabsTrigger>
                  <TabsTrigger value="discrepancy">Chênh lệch ({discrepancyItems.length})</TabsTrigger>
                  {adjustment.status === 'completed' && (
                    <TabsTrigger value="pending">Chờ duyệt ({pendingItems.length})</TabsTrigger>
                  )}
                </TabsList>
                
                <TabsContent value="all" className="mt-4">
                  <ItemsTable items={allItems} />
                </TabsContent>
                <TabsContent value="matched" className="mt-4">
                  <ItemsTable items={matchedItems} />
                </TabsContent>
                <TabsContent value="discrepancy" className="mt-4">
                  <ItemsTable items={discrepancyItems} highlightDiscrepancy />
                </TabsContent>
                <TabsContent value="pending" className="mt-4">
                  <ItemsTable items={pendingItems} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
          
          {/* Approval Section */}
          {canApprove && (
            <Card className="border-yellow-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-yellow-600" />
                  Phiếu này cần bạn duyệt
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg bg-muted p-4">
                  <p className="text-sm">
                    Tổng chênh lệch: <span className="font-bold">{totalDiscrepancies} items</span>
                  </p>
                  <p className="text-sm">
                    Giá trị: <span className={cn(
                      'font-bold',
                      totalValueDifference > 0 ? 'text-green-600' : 'text-red-600'
                    )}>
                      {totalValueDifference > 0 ? '+' : ''}
                      {formatCurrency(Math.abs(totalValueDifference))}
                    </span>
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => setShowApproveDialog(true)}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Duyệt tất cả
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => setShowRejectDialog(true)}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Từ chối
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        
        {/* Right Column */}
        <div className="space-y-6">
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Tổng kết</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Tổng items</p>
                <p className="text-3xl font-bold">{totalItems}</p>
              </div>
              
              <div className="text-center rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Đã kiểm</p>
                <p className="text-3xl font-bold text-blue-600">{totalItemsChecked}</p>
              </div>
              
              <div className="text-center rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Chênh lệch</p>
                <p className="text-3xl font-bold text-orange-600">
                  {totalDiscrepancies}
                </p>
              </div>
              
              <div className="text-center rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Giá trị chênh lệch</p>
                <p className={cn(
                  'text-2xl font-bold',
                  totalValueDifference > 0 ? 'text-green-600' : 'text-red-600'
                )}>
                  {totalValueDifference > 0 ? '+' : ''}
                  {formatCurrency(Math.abs(totalValueDifference))}
                </p>
              </div>
            </CardContent>
          </Card>
          
          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Thao tác</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full">
                <Printer className="mr-2 h-4 w-4" />
                In báo cáo
              </Button>
              <Button variant="outline" className="w-full">
                <Download className="mr-2 h-4 w-4" />
                Xuất Excel
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Approve Dialog */}
      <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận duyệt phiếu kiểm kê</AlertDialogTitle>
            <AlertDialogDescription>
              Sau khi duyệt, các thay đổi về số lượng sẽ được áp dụng vào hệ thống.
              Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Ghi chú duyệt (tùy chọn)</label>
            <Textarea
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
              placeholder="Ghi chú khi duyệt..."
              rows={3}
            />
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApprove}
              disabled={isApproving}
            >
              {isApproving ? 'Đang xử lý...' : 'Xác nhận duyệt'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Reject Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Từ chối phiếu kiểm kê</AlertDialogTitle>
            <AlertDialogDescription>
              Phiếu sẽ được chuyển về trạng thái từ chối và cần được kiểm tra lại.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Lý do từ chối *</label>
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Vui lòng nêu rõ lý do từ chối..."
              rows={3}
            />
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={isRejecting || !rejectionReason}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRejecting ? 'Đang xử lý...' : 'Xác nhận từ chối'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// Helper component for items table
function ItemsTable({ 
  items, 
  highlightDiscrepancy = false 
}: { 
  items: any[]
  highlightDiscrepancy?: boolean
}) {
  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Không có items
      </div>
    )
  }
  
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Đồ dùng</TableHead>
            <TableHead className="text-center">Hệ thống</TableHead>
            <TableHead className="text-center">Thực tế</TableHead>
            <TableHead className="text-center">Chênh lệch</TableHead>
            <TableHead>Lý do</TableHead>
            <TableHead>Trạng thái</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item: any) => {
            const discrepancy = item.actual_quantity - item.system_quantity
            const hasDiscrepancy = discrepancy !== 0
            
            return (
              <TableRow
                key={item.id}
                className={cn(
                  highlightDiscrepancy && hasDiscrepancy && 'bg-orange-50'
                )}
              >
                <TableCell>
                  <div className="flex items-center gap-2">
                    {item.item?.images?.[0] && (
                      <img
                        src={item.item.images[0]}
                        alt={item.item.name}
                        className="h-8 w-8 rounded object-cover"
                      />
                    )}
                    <div>
                      <p className="font-medium">{item.item?.name}</p>
                      <p className="text-xs text-muted-foreground">{item.item?.code}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-center font-medium">
                  {item.system_quantity}
                </TableCell>
                <TableCell className="text-center font-medium">
                  {item.actual_quantity}
                </TableCell>
                <TableCell className="text-center">
                  {hasDiscrepancy ? (
                    <span className={cn(
                      'font-bold',
                      discrepancy > 0 ? 'text-green-600' : 'text-red-600'
                    )}>
                      {discrepancy > 0 ? '+' : ''}{discrepancy}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {item.discrepancy_reason ? (
                    <p className="text-sm line-clamp-2">{item.discrepancy_reason}</p>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={item.status === 'approved' ? 'default' : 'secondary'}>
                    {item.status === 'pending' && 'Chờ duyệt'}
                    {item.status === 'approved' && 'Đã duyệt'}
                  </Badge>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
