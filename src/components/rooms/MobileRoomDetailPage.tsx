import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { 
  ArrowLeft,
  Edit, 
  ClipboardCheck, 
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  DoorOpen,
  Bed,
  Users,
  Maximize2,
  Eye,
  Printer,
  User,
  Truck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { RoomStatusBadge } from '@/components/rooms/RoomStatusBadge'
import { RoomItemsList } from '@/components/rooms/RoomItemsList'
import { EnhancedCheckHistory } from '@/components/rooms/EnhancedCheckHistory'
import { RoomHealthScore } from '@/components/rooms/RoomHealthScore'
import { RoomDistributionHistory } from '@/components/rooms/RoomDistributionHistory'
import { PullToRefresh } from '@/components/mobile/PullToRefresh'
import { useRoom } from '@/hooks/useRooms'
import { useApplyStandards } from '@/hooks/useRoomStandards'
import { useRoomDistributionHistory } from '@/hooks/useRoomDistributionHistory'
import { formatCurrency } from '@/lib/utils'
import type { RoomStatus, CheckType } from '@/types/rooms.types'

const handlePrintItemList = (roomNumber: string | undefined, items: any[], t: any) => {
  const printWindow = window.open('', '_blank')
  if (!printWindow) return
  
  const standardItems = items.filter(item => item.has_standard)
  
  printWindow.document.write(`
    <html>
      <head>
        <title>${t('print.itemListTitle', { roomNumber })}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { font-size: 18px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f5f5f5; }
          .missing { color: red; }
          .complete { color: green; }
        </style>
      </head>
      <body>
        <h1>${t('print.itemListTitle', { roomNumber })}</h1>
        <table>
          <thead>
            <tr>
              <th>${t('print.columns.index')}</th>
              <th>${t('print.columns.itemName')}</th>
              <th>${t('print.columns.required')}</th>
              <th>${t('print.columns.current')}</th>
              <th>${t('print.columns.missing')}</th>
              <th>${t('print.columns.status')}</th>
            </tr>
          </thead>
          <tbody>
            ${standardItems.map((item, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td>${item.item_name}</td>
                <td>${item.standard_quantity}</td>
                <td>${item.current_quantity}</td>
                <td class="${item.missing_quantity > 0 ? 'missing' : ''}">${item.missing_quantity}</td>
                <td class="${item.missing_quantity > 0 ? 'missing' : 'complete'}">
                  ${item.missing_quantity > 0 ? t('print.statusMissing') : t('print.statusComplete')}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <p style="margin-top: 20px; font-size: 12px;">${t('print.printDate', { date: new Date().toLocaleString('vi-VN') })}</p>
      </body>
    </html>
  `)
  printWindow.document.close()
  printWindow.print()
}

export function MobileRoomDetailPage() {
  const { t } = useTranslation(['rooms', 'common', 'distribution'])
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data, isLoading, refetch } = useRoom(id)
  const applyStandards = useApplyStandards()
  const { data: deliveryHistory } = useRoomDistributionHistory(id)
  
  // Count pending deliveries
  const pendingDeliveryCount = deliveryHistory?.filter(
    h => h.room_status === 'pending' || h.room_status === 'delivered'
  ).length || 0
  
  // Auto-switch to delivery tab when pending orders exist
  const [activeTab, setActiveTab] = useState('info')
  useEffect(() => {
    if (pendingDeliveryCount > 0 && !isLoading) {
      setActiveTab('delivery')
    }
  }, [pendingDeliveryCount, isLoading])

  const handleRefresh = async () => {
    await refetch()
  }
  
  if (isLoading) {
    return <MobileRoomDetailSkeleton />
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
  
  const { room, items, recent_checks: checks } = data
  
  // Calculate item statistics
  const standardItems = items.filter(item => item.has_standard)
  const otherItems = items.filter(item => !item.has_standard)
  const totalItemsInRoom = items.length
  const completeItems = standardItems.filter(item => item.missing_quantity === 0).length
  const missingCount = standardItems.filter(item => item.missing_quantity > 0).length
  const totalMissingQuantity = standardItems.reduce((sum, item) => sum + item.missing_quantity, 0)

  return (
    <PullToRefresh onRefresh={handleRefresh} className="flex flex-col min-h-screen bg-background">
      {/* Header */}
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
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon"
              className="h-8 w-8"
              onClick={() => handlePrintItemList(room.room_number, items, t)}
              title={t('detail.printItemList')}
            >
              <Printer className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              className="h-8 w-8"
              onClick={() => applyStandards.mutate(id!)}
              disabled={applyStandards.isPending}
              title={standardItems.length === 0 ? t('detail.applyStandards') : t('detail.syncStandards')}
            >
              <RefreshCw className={`h-4 w-4 ${applyStandards.isPending ? 'animate-spin' : ''}`} />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              className="h-8 w-8"
              onClick={() => navigate(`/rooms/${id}/check`)}
              title={t('detail.checkRoom')}
            >
              <ClipboardCheck className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/rooms/${id}/edit`)}>
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="px-4 py-3">
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-blue-600">{totalItemsInRoom}</p>
              <p className="text-xs text-muted-foreground">{t('detail.totalItems')}</p>
              {otherItems.length > 0 && (
                <p className="text-[10px] text-muted-foreground">{t('itemsList.tabs.other')}: {otherItems.length}</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-green-600">{completeItems}</p>
              <p className="text-xs text-muted-foreground">{t('detail.complete')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-red-600">{missingCount}</p>
              <p className="text-xs text-muted-foreground">{t('detail.missing')}</p>
              {totalMissingQuantity > 0 && (
                <p className="text-[10px] text-red-500">{t('detail.missingCount', { count: totalMissingQuantity })}</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Health Score */}
      <div className="px-4 pb-3">
        <RoomHealthScore 
          checks={checks} 
          totalItems={standardItems.length} 
          missingItems={missingCount}
        />
      </div>

      {/* Alert Banner for Pending Deliveries */}
      {pendingDeliveryCount > 0 && activeTab !== 'delivery' && (
        <div className="px-4 pb-2">
          <Alert 
            className="border-amber-500 bg-amber-50 dark:bg-amber-950/30 cursor-pointer"
            onClick={() => setActiveTab('delivery')}
          >
            <Truck className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 dark:text-amber-200 flex items-center justify-between">
              <span>
                {t('distribution:roomHistory.pendingAlert', { count: pendingDeliveryCount })}
              </span>
              <ChevronRight className="h-4 w-4" />
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
        <TabsList className="w-full justify-start px-4 bg-transparent border-b rounded-none h-auto gap-2 overflow-x-auto">
          <TabsTrigger 
            value="info" 
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-2 text-sm"
          >
            {t('tabs.info')}
          </TabsTrigger>
          <TabsTrigger 
            value="items"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-2 text-sm"
          >
            {t('tabs.items')}
            {missingCount > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 px-1.5">
                {missingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger 
            value="delivery"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-2 text-sm relative"
          >
            {t('distribution:roomHistory.tabTitle')}
            {pendingDeliveryCount > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 px-1.5 animate-pulse">
                {pendingDeliveryCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger 
            value="history"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-2 text-sm"
          >
            {t('tabs.history')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="flex-1 p-4 pb-20 space-y-4 m-0">
          {/* Room Info */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t('detail.roomInfo')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <DoorOpen className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">{t('detail.roomNumber')}</p>
                    <p className="font-semibold">{room.room_number}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Bed className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">{t('detail.bedType')}</p>
                    <p className="font-medium capitalize">{room.bed_type || t('detail.na')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">{t('detail.maxGuests')}</p>
                    <p className="font-medium">{t('detail.guestCount', { count: room.max_guests })}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Maximize2 className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">{t('detail.area')}</p>
                    <p className="font-medium">{room.area_sqm ? `${room.area_sqm} m²` : t('detail.na')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">{t('detail.view')}</p>
                    <p className="font-medium capitalize">{room.view_type || t('detail.na')}</p>
                  </div>
                </div>
              </div>

              {room.base_price && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">{t('detail.basePrice')}</p>
                  <p className="font-semibold text-lg">{t('detail.pricePerNight', { price: formatCurrency(room.base_price) })}</p>
                </div>
              )}

              {room.amenities && room.amenities.length > 0 && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-2">{t('detail.amenities')}</p>
                  <div className="flex flex-wrap gap-1">
                    {room.amenities.map((amenity: string, index: number) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {amenity}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {room.notes && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-1">{t('detail.notes')}</p>
                  <p className="text-sm">{room.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Photos */}
          {checks && checks.length > 0 && checks[0].photos && Array.isArray(checks[0].photos) && checks[0].photos.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{t('detail.recentPhotos')}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {t(`checkTypes.${checks[0].check_type}`, { defaultValue: checks[0].check_type })}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {new Date(checks[0].checked_at).toLocaleDateString('vi-VN')}
                    </Badge>
                  </div>
                </div>
                {/* Checked by info */}
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  <User className="h-3 w-3" />
                  <span>{t('detail.checkedBy', { name: checks[0].checked_by_name || t('detail.na') })}</span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2">
                  {(checks[0].photos as string[]).slice(0, 3).map((photo, idx) => (
                    <a
                      key={idx}
                      href={photo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative aspect-square rounded-lg overflow-hidden border group"
                    >
                      <img 
                        src={photo} 
                        alt={`Photo ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-active:opacity-100 flex items-center justify-center transition-opacity">
                        <span className="text-white text-xs font-medium">{t('detail.viewFull')}</span>
                      </div>
                    </a>
                  ))}
                </div>
                {(checks[0].photos as string[]).length > 3 && (
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    {t('detail.andMorePhotos', { count: (checks[0].photos as string[]).length - 3 })}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="items" className="flex-1 p-4 pb-20 m-0">
          {totalItemsInRoom === 0 && (
            <Card className="mb-4 border-amber-200 bg-amber-50 dark:bg-amber-950/20">
              <CardContent className="p-3 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    {t('detail.noItems')}
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                    {t('detail.noItemsHint', { type: room.room_type })}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
          <RoomItemsList items={items} roomId={id!} />
        </TabsContent>

        <TabsContent value="delivery" className="flex-1 p-4 pb-20 m-0">
          <RoomDistributionHistory roomId={id!} roomNumber={room.room_number} />
        </TabsContent>

        <TabsContent value="history" className="flex-1 p-4 pb-20 m-0">
          <EnhancedCheckHistory checks={checks} />
        </TabsContent>
      </Tabs>
    </PullToRefresh>
  )
}

function MobileRoomDetailSkeleton() {
  const { t } = useTranslation('rooms')
  const navigate = useNavigate()
  
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/rooms')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-20 mt-1" />
          </div>
        </div>
      </div>
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    </div>
  )
}
