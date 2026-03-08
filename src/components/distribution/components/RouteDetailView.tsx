import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { UnifiedRoomList } from './UnifiedRoomList'
import { DeliveryStepWizard } from './DeliveryStepWizard'
import { ShiftBadge } from './ShiftBadge'
import { AdjustQuantityDialog, type InsufficientItem, type ItemAdjustment } from './AdjustQuantityDialog'
import { useRouteDetail, useCloseRoute, useConfirmReceiveOrder, useHandoverBatch } from '@/hooks/useRouteBatch'
import { useAuth } from '@/contexts/AuthContext'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { ShiftCode, RouteStatus } from '@/types/route-batch.types'
import {
  MapPin,
  Calendar,
  User,
  Package,
  Lock,
  ArrowLeft,
  FileText,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

interface RouteDetailViewProps {
  orderId: string
  embedded?: boolean
}

export function RouteDetailView({ orderId, embedded = false }: RouteDetailViewProps) {
  const { t } = useTranslation('distribution')
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: route, isLoading, error } = useRouteDetail(orderId)
  const closeRoute = useCloseRoute()
  const confirmReceive = useConfirmReceiveOrder()
  const handoverBatch = useHandoverBatch()

  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false)
  const [insufficientItems, setInsufficientItems] = useState<InsufficientItem[]>([])

  const firstPendingBatch = route?.batches?.find(b => b.status === 'open')

  const isSelfAssignFlow = !!(user?.id && user.id === route?.created_by && user.id === route?.assigned_to)

  const handleHandoverFirstBatch = useCallback(async () => {
    if (!firstPendingBatch || !route) return
    
    const result = await handoverBatch.mutateAsync({ batchId: firstPendingBatch.id })
    
    if (!result.success && result.error === 'INSUFFICIENT_STOCK' && result.insufficient_items) {
      setInsufficientItems(result.insufficient_items)
      setAdjustDialogOpen(true)
      return
    }
    
    if (result.success && isSelfAssignFlow) {
      await confirmReceive.mutateAsync({ orderId: route.id })
      // Single toast for the entire self-assign flow (suppress individual mutation toasts via setSelfAssignActive)
    }
  }, [firstPendingBatch, handoverBatch, route, isSelfAssignFlow, confirmReceive])

  const handleHandoverWithAdjustments = useCallback(async (adjustments: ItemAdjustment[], reason: string) => {
    if (!firstPendingBatch || !route) return
    
    try {
      const result = await handoverBatch.mutateAsync({ 
        batchId: firstPendingBatch.id, 
        adjustments 
      })
      
      if (result.success) {
        setAdjustDialogOpen(false)
        setInsufficientItems([])
        
        if (user?.id === route.created_by && user?.id === route.assigned_to) {
          await confirmReceive.mutateAsync({ orderId: route.id })
          toast.success('Đã kiểm tra kho & bắt đầu giao hàng (đã điều chỉnh)')
        } else {
          toast.success('Đã giao hàng cho nhân viên với số lượng điều chỉnh')
        }
      }
    } catch (error) {
      toast.error('Không thể giao hàng')
    }
  }, [firstPendingBatch, handoverBatch, route, user, confirmReceive])

  const isAssignee = user?.id === route?.assigned_to
  const userLevel = (user as any)?.user_level_code || ''
  const isLeader = ['tenant_owner', 'manager', 'supervisor'].includes(userLevel)
  const isStorekeeper = 
    ['tenant_owner', 'manager', 'warehouse_manager', 'storekeeper'].includes(userLevel) ||
    user?.id === route?.created_by
  const isCreatorSameAsAssignee = !!(user?.id && user.id === route?.created_by && user.id === route?.assigned_to)

  const totalStops = route?.stops?.length || 0
  const deliveredStops = route?.stops?.filter(s => s.stop_status === 'delivered').length || 0
  const resolvedStops = route?.stops?.filter(s => s.stop_status === 'resolved').length || 0
  const completedStops = deliveredStops + resolvedStops
  const cannotAccessStops = route?.stops?.filter(s => s.stop_status === 'cannot_access').length || 0
  const pendingStops = totalStops - completedStops - cannotAccessStops
  const progressPercent = totalStops > 0 ? Math.round((completedStops / totalStops) * 100) : 0

  const canClose = isLeader && (
    route?.status === 'completed' || 
    (route?.status === 'in_progress' && pendingStops === 0 && cannotAccessStops === 0)
  )

  const handleConfirmReceive = useCallback(async () => {
    if (!route) return
    await confirmReceive.mutateAsync({ orderId: route.id })
  }, [route, confirmReceive])

  const handleEditOrder = useCallback(() => {
    setAdjustDialogOpen(false)
    toast.info('Vui lòng chỉnh sửa phiếu và thử lại')
  }, [])

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['route-detail', orderId] })
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error || !route) {
    return (
      <div className="border rounded-lg p-6">
        <p className="text-destructive">Không thể tải thông tin route</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Quay lại
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Header - only show when not embedded */}
      {!embedded && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{route.order_code}</h1>
            </div>
          </div>
          {canClose && (
            <Button
              onClick={() => closeRoute.mutate({ orderId: route.id })}
              disabled={closeRoute.isPending}
              className="gap-2"
            >
              <Lock className="h-4 w-4" />
              {closeRoute.isPending ? 'Đang đóng...' : 'Đóng Route'}
            </Button>
          )}
        </div>
      )}

      {/* Step Wizard */}
      <DeliveryStepWizard
        status={route.status as RouteStatus}
        assignedToName={route.assigned_to_name}
        totalStops={totalStops}
        completedStops={completedStops}
        pendingStops={pendingStops}
        isWarehouseManager={isStorekeeper}
        isAssignee={isAssignee}
        hasAssignee={!!route.assigned_to}
        isCreatorSameAsAssignee={isCreatorSameAsAssignee}
        onHandoverBatch={
          route.status === 'pending' && isStorekeeper && firstPendingBatch && route.assigned_to
            ? handleHandoverFirstBatch
            : undefined
        }
        onConfirmReceive={route.status === 'released' && isAssignee ? handleConfirmReceive : undefined}
        onCloseRoute={canClose ? () => closeRoute.mutate({ orderId: route.id }) : undefined}
        isHandingOver={handoverBatch.isPending}
        isConfirmingReceive={confirmReceive.isPending}
        isClosing={closeRoute.isPending}
      />

      {/* Compact Info Bar - merged shift + info + progress */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-2.5 border rounded-lg text-sm">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 flex-1">
          {route.shift_code && <ShiftBadge shift={route.shift_code as ShiftCode} />}
          {route.floor !== null && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Tầng {route.floor}</span>
            </span>
          )}
          {route.shift_date && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{format(new Date(route.shift_date), 'dd/MM', { locale: vi })}</span>
            </span>
          )}
          {route.assigned_to_name && (
            <span className="flex items-center gap-1">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{route.assigned_to_name}</span>
            </span>
          )}
        </div>
      {/* Inline progress - only show when wizard doesn't show it */}
        {route.status !== 'in_progress' && (
          <div className="flex items-center gap-2 min-w-[120px]">
            <Progress value={progressPercent} className="h-1.5 flex-1" />
            <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">
              {completedStops}/{totalStops}
            </span>
          </div>
        )}
      </div>

      {/* Room List */}
      <UnifiedRoomList
        stops={route.stops || []}
        orderCode={route.order_code}
        tenantId={route.tenant_id}
        hotelId={route.hotel_id}
        orderStatus={route.status}
        isAssignee={isAssignee}
        onRefresh={handleRefresh}
      />

      {/* Notes - design spec: div border rounded-lg */}
      {route.notes && (
        <div className="border rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Ghi chú</span>
          </div>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{route.notes}</p>
        </div>
      )}

      {/* Adjust Quantity Dialog */}
      <AdjustQuantityDialog
        open={adjustDialogOpen}
        onOpenChange={setAdjustDialogOpen}
        insufficientItems={insufficientItems}
        onConfirm={handleHandoverWithAdjustments}
        onEditOrder={handleEditOrder}
        isConfirming={handoverBatch.isPending}
      />
    </div>
  )
}
