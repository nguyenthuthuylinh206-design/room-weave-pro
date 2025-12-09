import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, 
  Plus, 
  ClipboardCheck,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  CheckSquare,
  Trash2
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { DateRangePicker } from '@/components/shared/DateRangePicker'
import { useStockAdjustments } from '@/hooks/useStockAdjustments'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { useBreakpoint } from '@/lib/breakpoints'
import { PullToRefresh } from '@/components/mobile/PullToRefresh'
import { SwipeableCard } from '@/components/mobile/SwipeableCard'
import { MobileAdjustmentCard } from '@/components/inventory/MobileAdjustmentCard'
import { AdjustmentListSkeleton } from '@/components/inventory/AdjustmentCardSkeleton'
import { EmptyAdjustments } from '@/components/inventory/EmptyAdjustments'
import { toast } from 'sonner'

const statusConfig = {
  draft: {
    icon: Clock,
    label: 'Nháp',
    color: 'bg-gray-100 text-gray-800',
  },
  in_progress: {
    icon: ClipboardCheck,
    label: 'Đang kiểm',
    color: 'bg-blue-100 text-blue-800',
  },
  completed: {
    icon: Clock,
    label: 'Hoàn thành',
    color: 'bg-yellow-100 text-yellow-800',
  },
  approved: {
    icon: CheckCircle,
    label: 'Đã duyệt',
    color: 'bg-green-100 text-green-800',
  },
  rejected: {
    icon: XCircle,
    label: 'Từ chối',
    color: 'bg-red-100 text-red-800',
  },
}

const typeLabels = {
  inventory_check: '📋 Kiểm kê định kỳ',
  damage: '❌ Kiểm tra hư hỏng',
  loss: '🚫 Kiểm tra mất mát',
  correction: '🔧 Điều chỉnh số liệu',
}

export function AdjustmentListPage() {
  const navigate = useNavigate()
  const { isMobile } = useBreakpoint()
  const [status, setStatus] = useState<string>('all')
  const [filters, setFilters] = useState({
    date_from: null as Date | null,
    date_to: null as Date | null,
  })
  const [page, setPage] = useState(1)
  
  const { data, isLoading, refetch } = useStockAdjustments(
    {
      status: status === 'all' ? undefined : (status as any),
      date_from: filters.date_from || undefined,
      date_to: filters.date_to || undefined,
    },
    page,
    25
  )
  
  const adjustments = data?.adjustments || []

  const handleRefresh = async () => {
    await refetch()
  }

  const handleViewAdjustment = (adjustmentId: string) => {
    navigate(`/inventory/adjustments/${adjustmentId}`)
  }

  const handleCheckAdjustment = (adjustmentId: string) => {
    navigate(`/inventory/adjustments/${adjustmentId}/check`)
  }

  const handleDeleteAdjustment = (adjustmentId: string) => {
    // TODO: Implement delete functionality
    toast.info('Chức năng xóa đang được phát triển')
  }

  const getSwipeActions = (adjustment: any) => {
    const status = adjustment.status
    
    if (status === 'draft') {
      return {
        left: () => handleCheckAdjustment(adjustment.id),
        right: () => handleDeleteAdjustment(adjustment.id),
        leftLabel: 'Bắt đầu',
        rightLabel: 'Xóa'
      }
    }
    
    if (status === 'in_progress') {
      return {
        left: () => handleCheckAdjustment(adjustment.id),
        leftLabel: 'Tiếp tục'
      }
    }
    
    return null
  }

  // Mobile view
  if (isMobile) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <PullToRefresh onRefresh={handleRefresh}>
          <div className="space-y-4">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background border-b px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => navigate('/inventory')}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <h1 className="text-lg font-semibold">Kiểm kê kho</h1>
                <Button 
                  size="icon"
                  onClick={() => navigate('/inventory/adjustments/new')}
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Horizontal Tabs */}
            <div className="overflow-x-auto px-4 -mx-4">
              <Tabs value={status} onValueChange={setStatus} className="w-full">
                <TabsList className="inline-flex w-auto min-w-full">
                  <TabsTrigger value="all" className="flex-shrink-0">Tất cả</TabsTrigger>
                  <TabsTrigger value="draft" className="flex-shrink-0">Nháp</TabsTrigger>
                  <TabsTrigger value="in_progress" className="flex-shrink-0">Đang kiểm</TabsTrigger>
                  <TabsTrigger value="completed" className="flex-shrink-0">Hoàn thành</TabsTrigger>
                  <TabsTrigger value="approved" className="flex-shrink-0">Đã duyệt</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Date Filter */}
            <div className="px-4">
              <DateRangePicker
                value={{
                  from: filters.date_from,
                  to: filters.date_to,
                }}
                onChange={(range) => 
                  setFilters({
                    date_from: range?.from || null,
                    date_to: range?.to || null,
                  })
                }
              />
            </div>

            {/* Adjustment Cards */}
            <div className="px-4 space-y-2">
              {isLoading ? (
                <AdjustmentListSkeleton count={5} />
              ) : adjustments.length === 0 ? (
                <EmptyAdjustments />
              ) : (
                adjustments.map((adjustment) => {
                  const actions = getSwipeActions(adjustment)
                  
                  return actions ? (
                    <SwipeableCard
                      key={adjustment.id}
                      onSwipeLeft={actions.left}
                      onSwipeRight={actions.right}
                      swipeThreshold={100}
                    >
                      <MobileAdjustmentCard
                        adjustment={adjustment}
                        onClick={() => handleViewAdjustment(adjustment.id)}
                      />
                    </SwipeableCard>
                  ) : (
                    <MobileAdjustmentCard
                      key={adjustment.id}
                      adjustment={adjustment}
                      onClick={() => handleViewAdjustment(adjustment.id)}
                    />
                  )
                })
              )}
            </div>
          </div>
        </PullToRefresh>
      </div>
    )
  }
  
  // Desktop view
  return (
    <div className="space-y-6">
      <PageHeader
        title="Kiểm kê kho"
        description="Quản lý phiếu kiểm kê và điều chỉnh tồn kho"
      >
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/inventory')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quay lại
          </Button>
          <Button onClick={() => navigate('/inventory/adjustments/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Tạo phiếu kiểm kê
          </Button>
        </div>
      </PageHeader>
      
      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <Tabs value={status} onValueChange={setStatus}>
              <TabsList>
                <TabsTrigger value="all">Tất cả</TabsTrigger>
                <TabsTrigger value="draft">Nháp</TabsTrigger>
                <TabsTrigger value="in_progress">Đang kiểm</TabsTrigger>
                <TabsTrigger value="completed">Hoàn thành</TabsTrigger>
                <TabsTrigger value="approved">Đã duyệt</TabsTrigger>
              </TabsList>
            </Tabs>
            
            <DateRangePicker
              value={{
                from: filters.date_from,
                to: filters.date_to,
              }}
              onChange={(range) => 
                setFilters({
                  date_from: range?.from || null,
                  date_to: range?.to || null,
                })
              }
            />
          </div>
        </CardContent>
      </Card>
      
      {/* Adjustments Table */}
      <Card>
        <CardContent className="pt-6">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã phiếu</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Ngày lập</TableHead>
                  <TableHead>Người tạo</TableHead>
                  <TableHead>Người thực hiện</TableHead>
                  <TableHead className="text-center">Tổng items</TableHead>
                  <TableHead className="text-center">Chênh lệch</TableHead>
                  <TableHead className="text-right">Giá trị CL</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      Đang tải...
                    </TableCell>
                  </TableRow>
                ) : adjustments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      Không có phiếu kiểm kê nào
                    </TableCell>
                  </TableRow>
                ) : (
                  adjustments.map((adjustment: any) => {
                    const statusInfo = statusConfig[adjustment.status as keyof typeof statusConfig]
                    const StatusIcon = statusInfo.icon
                    
                    return (
                      <TableRow
                        key={adjustment.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/inventory/adjustments/${adjustment.id}`)}
                      >
                        <TableCell className="font-medium">
                          {adjustment.adjustment_code}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {typeLabels[adjustment.adjustment_type as keyof typeof typeLabels]}
                          </span>
                        </TableCell>
                        <TableCell>
                          {adjustment.scheduled_date && format(new Date(adjustment.scheduled_date), 'dd/MM/yyyy', { locale: vi })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{adjustment.created_by_name || 'N/A'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex -space-x-2">
                            {adjustment.assigned_to?.slice(0, 3).map((userId: string, i: number) => (
                              <Avatar key={i} className="h-6 w-6 border-2 border-background">
                                <AvatarFallback className="text-xs">
                                  {userId.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            ))}
                            {adjustment.assigned_to && adjustment.assigned_to.length > 3 && (
                              <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-muted text-xs">
                                +{adjustment.assigned_to.length - 3}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="text-sm">
                            <span className="font-bold">{adjustment.total_items_checked || 0}</span>
                            <span className="text-muted-foreground">/{adjustment.total_items || 0}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {adjustment.total_discrepancies > 0 ? (
                            <Badge variant="destructive">
                              {adjustment.total_discrepancies}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {adjustment.total_value_difference !== 0 ? (
                            <span className={cn(
                              'font-bold',
                              adjustment.total_value_difference > 0 ? 'text-green-600' : 'text-red-600'
                            )}>
                              {adjustment.total_value_difference > 0 ? '+' : ''}
                              {formatCurrency(Math.abs(adjustment.total_value_difference))}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={statusInfo.color}>
                            <StatusIcon className="mr-1 h-3 w-3" />
                            {statusInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              if (adjustment.status === 'draft' || adjustment.status === 'in_progress') {
                                navigate(`/inventory/adjustments/${adjustment.id}/check`)
                              } else {
                                navigate(`/inventory/adjustments/${adjustment.id}`)
                              }
                            }}
                          >
                            {adjustment.status === 'draft' || adjustment.status === 'in_progress' ? (
                              <ClipboardCheck className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
