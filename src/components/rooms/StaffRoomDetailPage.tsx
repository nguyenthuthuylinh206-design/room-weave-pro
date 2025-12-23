import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { 
  ArrowLeft,
  ClipboardCheck, 
  AlertCircle,
  CheckCircle2,
  Package,
  Calendar,
  User,
  Phone,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { RoomStatusBadge } from '@/components/rooms/RoomStatusBadge'
import { PullToRefresh } from '@/components/mobile/PullToRefresh'
import { useRoom } from '@/hooks/useRooms'
import { useRoomBooking } from '@/hooks/useRoomBooking'
import type { RoomStatus } from '@/types/rooms.types'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'

export function StaffRoomDetailPage() {
  const { t } = useTranslation(['rooms', 'common'])
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data, isLoading, refetch } = useRoom(id)
  const { data: booking } = useRoomBooking(id)
  
  const handleRefresh = async () => {
    await refetch()
  }
  
  if (isLoading) {
    return <StaffRoomDetailSkeleton />
  }
  
  if (!data) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <div className="sticky top-0 z-10 bg-background border-b px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/rooms')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">{t('roomDetail')}</h1>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <AlertCircle className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">{t('detail.notFound')}</h3>
          <Button onClick={() => navigate('/rooms')} className="mt-4">
            {t('detail.backToList')}
          </Button>
        </div>
      </div>
    )
  }
  
  const { room, items } = data
  
  // Calculate item statistics
  const standardItems = items.filter(item => item.has_standard)
  const totalItemsInRoom = items.length
  const completeItems = standardItems.filter(item => item.missing_quantity === 0).length
  const missingCount = standardItems.filter(item => item.missing_quantity > 0).length
  const totalMissingQuantity = standardItems.reduce((sum, item) => sum + item.missing_quantity, 0)
  
  const isItemsComplete = missingCount === 0
  
  return (
    <PullToRefresh onRefresh={handleRefresh} className="flex flex-col min-h-screen bg-background">
      {/* Header - Simplified for staff */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/rooms')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold">{t('detail.title', { number: room.room_number })}</h1>
                <RoomStatusBadge status={room.status as RoomStatus} />
              </div>
              <p className="text-xs text-muted-foreground capitalize">
                {t(`roomTypes.${room.room_type}`, { defaultValue: room.room_type })} • {t('detail.floorNumber', { number: room.floor })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 space-y-4">
        {/* Item Status Card - Main focus for staff */}
        <Card className={isItemsComplete ? 'border-green-500/50 bg-green-50/30 dark:bg-green-950/20' : 'border-amber-500/50 bg-amber-50/30 dark:bg-amber-950/20'}>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">{t('detail.itemsInRoom')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Status Summary */}
            <div className="flex items-center gap-3">
              {isItemsComplete ? (
                <>
                  <CheckCircle2 className="h-10 w-10 text-green-600" />
                  <div>
                    <p className="text-lg font-bold text-green-700 dark:text-green-400">
                      {t('detail.allItemsComplete')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {totalItemsInRoom} {t('detail.itemsTotal')}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="h-10 w-10 text-amber-600" />
                  <div>
                    <p className="text-lg font-bold text-amber-700 dark:text-amber-400">
                      {missingCount} {t('detail.itemsMissing')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t('detail.missingQuantity', { count: totalMissingQuantity })}
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Stats Row */}
            <div className="flex items-center justify-around p-3 bg-background rounded-lg border">
              <div className="text-center">
                <p className="text-xl font-bold text-primary">{totalItemsInRoom}</p>
                <p className="text-[10px] text-muted-foreground">{t('detail.totalItems')}</p>
              </div>
              <div className="h-8 w-px bg-border" />
              <div className="text-center">
                <p className="text-xl font-bold text-green-600">{completeItems}</p>
                <p className="text-[10px] text-muted-foreground">{t('detail.complete')}</p>
              </div>
              <div className="h-8 w-px bg-border" />
              <div className="text-center">
                <p className="text-xl font-bold text-destructive">{missingCount}</p>
                <p className="text-[10px] text-muted-foreground">{t('detail.missing')}</p>
              </div>
            </div>

            {/* Missing Items List - Only show if there are missing items */}
            {missingCount > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  {t('detail.missingItemsList')}:
                </p>
                <div className="space-y-1">
                  {standardItems
                    .filter(item => item.missing_quantity > 0)
                    .slice(0, 5)
                    .map(item => (
                      <div 
                        key={item.item_id} 
                        className="flex items-center justify-between p-2 bg-background rounded border"
                      >
                        <span className="text-sm">{item.item_name}</span>
                        <Badge variant="destructive" className="text-xs">
                          -{item.missing_quantity}
                        </Badge>
                      </div>
                    ))}
                  {standardItems.filter(item => item.missing_quantity > 0).length > 5 && (
                    <p className="text-xs text-muted-foreground text-center">
                      {t('detail.andMore', { count: standardItems.filter(item => item.missing_quantity > 0).length - 5 })}
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Guest Info Card - Compact view for staff */}
        {booking && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base">{t('detail.currentGuest')}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Check-in</p>
                    <p className="text-sm font-medium">
                      {format(new Date(booking.check_in_date), 'dd/MM/yyyy', { locale: vi })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Check-out</p>
                    <p className="text-sm font-medium">
                      {format(new Date(booking.check_out_date), 'dd/MM/yyyy', { locale: vi })}
                    </p>
                  </div>
                </div>
              </div>
              {booking.guest_count > 1 && (
                <p className="text-xs text-muted-foreground mt-2">
                  {t('detail.guestCount', { count: booking.guest_count })}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Alert for checkout required */}
        {room.status === 'check_out' && (
          <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950/30">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800 dark:text-orange-200">
              <span className="font-medium">Phòng cần kiểm tra checkout</span>
              <p className="text-xs mt-1 opacity-80">
                Khách đã trả phòng. Vui lòng kiểm tra đồ dùng.
              </p>
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Fixed Bottom - Check Room Button */}
      <div className="sticky bottom-0 p-4 bg-background/95 backdrop-blur border-t">
        <Button 
          className="w-full h-12 text-base font-semibold gap-2"
          onClick={() => navigate(`/rooms/${id}/check`)}
        >
          <ClipboardCheck className="h-5 w-5" />
          {t('detail.checkRoom')}
        </Button>
      </div>
    </PullToRefresh>
  )
}

function StaffRoomDetailSkeleton() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-24 mt-1" />
          </div>
        </div>
      </div>
      <div className="flex-1 p-4 space-y-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
      <div className="sticky bottom-0 p-4 bg-background border-t">
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  )
}
