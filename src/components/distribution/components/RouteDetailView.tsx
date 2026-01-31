import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { UnifiedRoomList } from './UnifiedRoomList'
import { DeliveryStepWizard } from './DeliveryStepWizard'
import { ShiftBadge } from './ShiftBadge'
import { OrderStatusBadge } from './DistributionStatusBadge'
import { useRouteDetail, useCloseRoute, useConfirmReceiveOrder, useHandoverBatch } from '@/hooks/useRouteBatch'
import { useAuth } from '@/contexts/AuthContext'
import { useQueryClient } from '@tanstack/react-query'
import type { ShiftCode, RouteStatus } from '@/types/route-batch.types'
import {
  MapPin,
  Calendar,
  User,
  Package,
  Lock,
  ArrowLeft,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'

interface RouteDetailViewProps {
  orderId: string
  embedded?: boolean // When true, hides header (used in detail page)
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

  // Get first pending batch for handover
  const firstPendingBatch = route?.batches?.find(b => b.status === 'open')

  // Handover batch handler
  const handleHandoverFirstBatch = () => {
    if (!firstPendingBatch) return
    handoverBatch.mutate({ batchId: firstPendingBatch.id })
  }

  // Check user roles based on user_level_code
  const isAssignee = user?.id === route?.assigned_to
  const userLevel = (user as any)?.user_level_code || ''
  const isLeader = ['tenant_owner', 'manager', 'supervisor'].includes(userLevel)
  const isStorekeeper = ['tenant_owner', 'manager', 'warehouse_manager', 'storekeeper'].includes(userLevel)

  // Calculate progress
  const totalStops = route?.stops?.length || 0
  const deliveredStops = route?.stops?.filter(s => s.stop_status === 'delivered').length || 0
  const resolvedStops = route?.stops?.filter(s => s.stop_status === 'resolved').length || 0
  const completedStops = deliveredStops + resolvedStops
  const cannotAccessStops = route?.stops?.filter(s => s.stop_status === 'cannot_access').length || 0
  const pendingStops = totalStops - completedStops - cannotAccessStops
  const progressPercent = totalStops > 0 ? Math.round((completedStops / totalStops) * 100) : 0

  // Can close route?
  const canClose = isLeader && 
    route?.status === 'completed' || 
    (route?.status === 'in_progress' && pendingStops === 0 && cannotAccessStops === 0)

  // Confirm receive handler
  const handleConfirmReceive = () => {
    if (!route) return
    confirmReceive.mutate({ orderId: route.id })
  }

  // Refresh data handler
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
      <Card className="p-6">
        <p className="text-destructive">Không thể tải thông tin route</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Quay lại
        </Button>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header - only show when not embedded */}
      {!embedded && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{route.order_code}</h1>
              <div className="flex items-center gap-2 mt-1">
                <OrderStatusBadge status={route.status as any} />
                {route.shift_code && <ShiftBadge shift={route.shift_code as ShiftCode} />}
              </div>
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

      {/* Shift badge when embedded - show separately */}
      {embedded && route.shift_code && (
        <div className="flex items-center gap-2">
          <ShiftBadge shift={route.shift_code as ShiftCode} />
        </div>
      )}

      {/* Step Wizard - shows current step and action */}
      <DeliveryStepWizard
        status={route.status as RouteStatus}
        assignedToName={route.assigned_to_name}
        totalStops={totalStops}
        completedStops={completedStops}
        pendingStops={pendingStops}
        isWarehouseManager={isStorekeeper}
        isAssignee={isAssignee}
        onHandoverBatch={
          route.status === 'pending' && isStorekeeper && firstPendingBatch
            ? handleHandoverFirstBatch
            : undefined
        }
        onConfirmReceive={route.status === 'released' && isAssignee ? handleConfirmReceive : undefined}
        onCloseRoute={canClose ? () => closeRoute.mutate({ orderId: route.id }) : undefined}
        isHandingOver={handoverBatch.isPending}
        isConfirmingReceive={confirmReceive.isPending}
        isClosing={closeRoute.isPending}
      />

      {/* Compact Info Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 border rounded-lg bg-muted/30">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          {route.floor !== null && (
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Tầng {route.floor}</span>
            </span>
          )}
          {route.shift_date && (
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{format(new Date(route.shift_date), 'dd/MM/yyyy', { locale: vi })}</span>
            </span>
          )}
          {route.assigned_to_name && (
            <span className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{route.assigned_to_name}</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold">{completedStops}/{totalStops}</span>
            <span className="text-muted-foreground">({progressPercent}%)</span>
          </div>
        </div>
      </div>

      {/* Unified Room List - single view */}
      <UnifiedRoomList
        stops={route.stops || []}
        orderCode={route.order_code}
        tenantId={route.tenant_id}
        hotelId={route.hotel_id}
        orderStatus={route.status}
        isAssignee={isAssignee}
        onRefresh={handleRefresh}
      />

      {/* Notes */}
      {route.notes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Ghi chú</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{route.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
