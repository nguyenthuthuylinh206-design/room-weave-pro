import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BatchAccordion } from './BatchAccordion'
import { StaffDeliveryView } from './StaffDeliveryView'
import { DeliveryStepWizard } from './DeliveryStepWizard'
import { ShiftBadge } from './ShiftBadge'
import { OrderStatusBadge } from './DistributionStatusBadge'
import { useRouteDetail, useCloseRoute, useConfirmReceiveOrder } from '@/hooks/useRouteBatch'
import { useAuth } from '@/contexts/AuthContext'
import { useQueryClient } from '@tanstack/react-query'
import type { ShiftCode, RouteStatus } from '@/types/route-batch.types'
import {
  MapPin,
  Calendar,
  User,
  Package,
  CheckCircle,
  Lock,
  ArrowLeft,
  List,
  Layers,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
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

  // View mode: 'batch' for managers, 'staff' for delivery staff
  const [viewMode, setViewMode] = useState<'batch' | 'staff'>('batch')

  // Check user roles based on user_level_code
  const isAssignee = user?.id === route?.assigned_to
  const userLevel = (user as any)?.user_level_code || ''
  const isLeader = ['tenant_owner', 'manager', 'supervisor'].includes(userLevel)
  const isStorekeeper = ['tenant_owner', 'manager', 'warehouse_manager', 'storekeeper'].includes(userLevel)

  // Auto-switch to staff view for assignees who are not managers
  useEffect(() => {
    if (route && isAssignee && !isStorekeeper && !isLeader) {
      setViewMode('staff')
    }
  }, [route, isAssignee, isStorekeeper, isLeader])

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
    <div className="space-y-6">
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
        onConfirmReceive={route.status === 'released' && isAssignee ? handleConfirmReceive : undefined}
        onCloseRoute={canClose ? () => closeRoute.mutate({ orderId: route.id }) : undefined}
        isConfirmingReceive={confirmReceive.isPending}
        isClosing={closeRoute.isPending}
      />

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tầng</p>
                <p className="text-lg font-semibold">{route.floor ?? '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ngày</p>
                <p className="text-lg font-semibold">
                  {route.shift_date 
                    ? format(new Date(route.shift_date), 'dd/MM/yyyy', { locale: vi })
                    : '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Nhân viên</p>
                <p className="text-lg font-semibold truncate">
                  {route.assigned_to_name || 'Chưa gán'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tiến độ</p>
                <p className="text-lg font-semibold">
                  {completedStops}/{totalStops} phòng
                  <span className="text-sm font-normal text-muted-foreground ml-1">
                    ({progressPercent}%)
                  </span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View Toggle */}
      <div className="flex items-center justify-between">
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'batch' | 'staff')}>
          <TabsList>
            <TabsTrigger value="staff" className="gap-2">
              <List className="h-4 w-4" />
              Danh sách phòng
            </TabsTrigger>
            <TabsTrigger value="batch" className="gap-2">
              <Layers className="h-4 w-4" />
              Xem theo Batch
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content based on view mode */}
      {viewMode === 'staff' ? (
        <StaffDeliveryView
          stops={route.stops || []}
          orderCode={route.order_code}
          tenantId={route.tenant_id}
          hotelId={route.hotel_id}
          orderStatus={route.status}
          onRefresh={handleRefresh}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Danh sách Batch</CardTitle>
          </CardHeader>
          <CardContent>
            <BatchAccordion
              orderId={route.id}
              orderCode={route.order_code}
              tenantId={route.tenant_id}
              hotelId={route.hotel_id}
              orderStatus={route.status}
              assignedTo={route.assigned_to}
              stops={route.stops || []}
              isStorekeeper={isStorekeeper}
              isAssignee={isAssignee}
              isLeader={isLeader}
            />
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {route.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ghi chú</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-wrap">{route.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
