import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { BatchAccordion } from './BatchAccordion'
import { ShiftBadge } from './ShiftBadge'
import { OrderStatusBadge } from './DistributionStatusBadge'
import { useRouteDetail, useCloseRoute } from '@/hooks/useRouteBatch'
import { useAuth } from '@/contexts/AuthContext'
import type { ShiftCode, RouteStatus } from '@/types/route-batch.types'
import {
  MapPin,
  Calendar,
  User,
  Package,
  CheckCircle,
  Lock,
  ArrowLeft,
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
  const { data: route, isLoading, error } = useRouteDetail(orderId)
  const closeRoute = useCloseRoute()

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
          {canClose && (
            <Button
              size="sm"
              onClick={() => closeRoute.mutate({ orderId: route.id })}
              disabled={closeRoute.isPending}
              className="ml-auto gap-2"
            >
              <Lock className="h-4 w-4" />
              {closeRoute.isPending ? 'Đang đóng...' : 'Đóng Route'}
            </Button>
          )}
        </div>
      )}

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

      {/* Progress Bar */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Tiến độ giao hàng</span>
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle className="h-4 w-4" />
                {deliveredStops} đã giao
              </span>
              {resolvedStops > 0 && (
                <span className="text-purple-600">{resolvedStops} đã xử lý</span>
              )}
              {cannotAccessStops > 0 && (
                <span className="text-destructive">{cannotAccessStops} không vào được</span>
              )}
              {pendingStops > 0 && (
                <span className="text-muted-foreground">{pendingStops} chờ giao</span>
              )}
            </div>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Batches & Stops */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Danh sách Batch</CardTitle>
        </CardHeader>
        <CardContent>
          <BatchAccordion
            orderId={route.id}
            orderStatus={route.status}
            assignedTo={route.assigned_to}
            stops={route.stops || []}
            isStorekeeper={isStorekeeper}
            isAssignee={isAssignee}
            isLeader={isLeader}
          />
        </CardContent>
      </Card>

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
