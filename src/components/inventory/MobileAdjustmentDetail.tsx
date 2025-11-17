import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Package, CheckCircle, AlertTriangle, TrendingDown, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { useStockAdjustment } from '@/hooks/useStockAdjustments'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'

export function MobileAdjustmentDetail() {
  const { id } = useParams<{ id: string }>()
  const { data: adjustment, isLoading } = useStockAdjustment(id!)

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
    checked: items.filter(i => i.actual_quantity !== null).length,
    matched: items.filter(i => i.actual_quantity === i.system_quantity).length,
    discrepancy: items.filter(i => i.actual_quantity !== null && i.actual_quantity !== i.system_quantity).length,
  }

  return (
    <div className="min-h-screen bg-background pb-20">
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

          {/* Info Card */}
          <Card className="p-4 space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Loại kiểm kê</p>
              <p className="font-medium">{adj.adjustment_type === 'full' ? 'Toàn bộ' : 'Theo danh mục'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Người tạo</p>
              <p className="font-medium">{adj.created_by_user?.full_name || adj.created_by}</p>
            </div>
            {adj.notes && (
              <div>
                <p className="text-sm text-muted-foreground">Ghi chú</p>
                <p className="text-sm">{adj.notes}</p>
              </div>
            )}
          </Card>

          {/* Items Tabs */}
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="all">Tất cả</TabsTrigger>
              <TabsTrigger value="matched">Khớp</TabsTrigger>
              <TabsTrigger value="discrepancy">Lệch</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="space-y-2 mt-4">
              {items.map((item: any) => (
                <Card key={item.id} className="p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <p className="font-medium">{item.item_name}</p>
                      <p className="text-sm text-muted-foreground">{item.item_code}</p>
                    </div>
                    {item.actual_quantity !== null && (
                      <Badge variant={item.actual_quantity === item.system_quantity ? 'default' : 'destructive'}>
                        {item.actual_quantity === item.system_quantity ? 'Khớp' : 'Lệch'}
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
                      <p className={`font-semibold ${item.actual_quantity !== null && item.actual_quantity !== item.system_quantity ? 'text-orange-600' : ''}`}>
                        {item.actual_quantity !== null ? item.actual_quantity - item.system_quantity : '-'}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </TabsContent>
            
            <TabsContent value="matched" className="space-y-2 mt-4">
              {items.filter((i: any) => i.actual_quantity === i.system_quantity).map((item: any) => (
                <Card key={item.id} className="p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <p className="font-medium">{item.item_name}</p>
                      <p className="text-sm text-muted-foreground">{item.item_code}</p>
                    </div>
                    <Badge variant="default">Khớp</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <div>
                      <p className="text-muted-foreground">Số lượng</p>
                      <p className="font-semibold">{item.system_quantity}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </TabsContent>
            
            <TabsContent value="discrepancy" className="space-y-2 mt-4">
              {items.filter((i: any) => i.actual_quantity !== null && i.actual_quantity !== i.system_quantity).map((item: any) => (
                <Card key={item.id} className="p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <p className="font-medium">{item.item_name}</p>
                      <p className="text-sm text-muted-foreground">{item.item_code}</p>
                    </div>
                    <Badge variant="destructive">Lệch</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Hệ thống</p>
                      <p className="font-semibold">{item.system_quantity}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Thực tế</p>
                      <p className="font-semibold">{item.actual_quantity}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Chênh lệch</p>
                      <p className="font-semibold text-orange-600">
                        {item.actual_quantity - item.system_quantity}
                      </p>
                    </div>
                  </div>
                  {item.discrepancy_reason && (
                    <p className="text-xs text-muted-foreground mt-2">{item.discrepancy_reason}</p>
                  )}
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </div>
  )
}
