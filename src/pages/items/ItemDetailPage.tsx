import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { 
  Package, 
  ArrowLeft, 
  Edit, 
  QrCode,
  TrendingUp,
  TrendingDown,
  Boxes,
  Home,
  ShoppingCart,
  Shirt,
  AlertTriangle,
  MapPin,
  Clock,
  User,
  Activity,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useItem } from '@/hooks/useItems'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { QRCodeDisplay } from '@/components/shared/QRCodeDisplay'
import { MobileItemDetailPage } from '@/components/items/MobileItemDetailPage'
import { useBreakpoint } from '@/lib/breakpoints'
import { PermissionGate } from '@/components/auth/PermissionGate'

export default function ItemDetailPage() {
  const { t } = useTranslation(['items', 'common', 'inventory'])
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isMobile } = useBreakpoint()
  const { data, isLoading } = useItem(id)

  if (isMobile) {
    return <MobileItemDetailPage />
  }

  if (isLoading) {
    return (
      <div className="container py-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="h-96 md:col-span-2" />
          <Skeleton className="h-96" />
        </div>
      </div>
    )
  }

  const detailDataCheck = data as any
  if (!data || !detailDataCheck?.item) {
    return (
      <div className="container py-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-lg font-medium">{t('items:notFound')}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => navigate('/items')}
            >
              {t('items:backToList')}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const detailData = data as any
  const item = detailData.item
  const category = detailData.category
  const hotel = detailData.hotel
  const recentTransactions = detailData.recent_transactions || []
  const roomAllocations = detailData.room_allocations || []

  const stockStatus = 
    item.quantity_in_stock === 0 ? 'out_of_stock' :
    item.quantity_in_stock < item.minimum_stock ? 'low_stock' : 'in_stock'

  const stockStatusConfig = {
    in_stock: { label: t('items:status.inStock'), variant: 'default' as const, color: 'text-success' },
    low_stock: { label: t('items:status.lowStock'), variant: 'secondary' as const, color: 'text-warning' },
    out_of_stock: { label: t('items:status.outOfStock'), variant: 'destructive' as const, color: 'text-destructive' },
  }

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/items')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{item.name}</h1>
            <p className="text-muted-foreground">
              {item.code} • {category?.name || t('items:detail.noCategory')}
            </p>
          </div>
        </div>
        <PermissionGate module="items" action="update">
          <Button onClick={() => navigate(`/items/${id}/edit`)}>
            <Edit className="mr-2 h-4 w-4" />
            {t('items:edit')}
          </Button>
        </PermissionGate>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Info */}
        <div className="md:col-span-2 space-y-6">
          {/* Images */}
          <Card>
            <CardHeader>
              <CardTitle>{t('items:detail.images')}</CardTitle>
            </CardHeader>
            <CardContent>
              {item.item_images && item.item_images.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {item.item_images.map((img: any, idx: number) => (
                    <div key={img.id} className="relative">
                      <img
                        src={img.url}
                        alt={`${item.name} ${idx + 1}`}
                        className="aspect-square w-full rounded-lg object-cover"
                      />
                      {img.is_primary && (
                        <Badge className="absolute top-2 left-2" variant="default">
                          {t('items:detail.primaryImage')}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-48 items-center justify-center rounded-lg bg-muted">
                  <Package className="h-12 w-12 text-muted-foreground/50" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Inventory Stats */}
          <Card>
            <CardHeader>
              <CardTitle>{t('items:detail.inventoryStats')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Boxes className="h-4 w-4" />
                    <span className="text-sm">{t('items:fields.quantityTotal')}</span>
                  </div>
                  <p className="text-2xl font-bold">{item.quantity_total}</p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Package className="h-4 w-4" />
                    <span className="text-sm">{t('items:fields.quantityInStock')}</span>
                  </div>
                  <p className={cn("text-2xl font-bold", stockStatusConfig[stockStatus].color)}>
                    {item.quantity_in_stock}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Home className="h-4 w-4" />
                    <span className="text-sm">{t('items:fields.quantityInUse')}</span>
                  </div>
                  <p className="text-2xl font-bold">{item.quantity_in_use}</p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Shirt className="h-4 w-4" />
                    <span className="text-sm">{t('items:fields.quantityInLaundry')}</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-600">{item.quantity_in_laundry}</p>
                </div>
              </div>

              {(item.quantity_damaged > 0 || item.quantity_lost > 0) && (
                <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4">
                  {item.quantity_damaged > 0 && (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-orange-50">
                      <span className="text-sm text-orange-700">{t('items:fields.quantityDamaged')}</span>
                      <span className="text-lg font-bold text-orange-600">
                        {item.quantity_damaged}
                      </span>
                    </div>
                  )}
                  {item.quantity_lost > 0 && (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-red-50">
                      <span className="text-sm text-red-700">{t('items:fields.quantityLost')}</span>
                      <span className="text-lg font-bold text-red-600">
                        {item.quantity_lost}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs defaultValue="transactions" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="transactions">
                {t('items:detail.transactionHistory')} ({recentTransactions.length})
              </TabsTrigger>
              <TabsTrigger value="rooms">
                {t('items:detail.roomAllocation')} ({roomAllocations.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="transactions" className="mt-4">
              <Card>
                <CardContent className="pt-6">
                  {recentTransactions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <Activity className="h-12 w-12 text-muted-foreground/50" />
                      <p className="mt-2 text-sm text-muted-foreground">
                        {t('items:detail.noTransactions')}
                      </p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('items:detail.transactionCode')}</TableHead>
                          <TableHead>{t('items:detail.type')}</TableHead>
                          <TableHead className="text-right">{t('items:fields.quantity')}</TableHead>
                          <TableHead>{t('items:detail.performer')}</TableHead>
                          <TableHead>{t('items:detail.time')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recentTransactions.map((txn: any) => {
                          const isInbound = txn.transaction_type === 'in'
                          return (
                            <TableRow key={txn.id}>
                              <TableCell className="font-medium">
                                {txn.transaction_code}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {isInbound ? (
                                    <TrendingUp className="h-4 w-4 text-success" />
                                  ) : (
                                    <TrendingDown className="h-4 w-4 text-warning" />
                                  )}
                                  <Badge variant={isInbound ? 'default' : 'secondary'}>
                                    {txn.transaction_category
                                      ? t(`inventory:category.${txn.transaction_category}`, { defaultValue: txn.transaction_category })
                                      : t(`inventory:type.${txn.transaction_type}`, { defaultValue: txn.transaction_type })}
                                  </Badge>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <span className={cn(
                                  'font-bold',
                                  isInbound ? 'text-success' : 'text-warning'
                                )}>
                                  {isInbound ? '+' : '-'}{txn.quantity}
                                </span>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm">{txn.created_by_name}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Clock className="h-4 w-4" />
                                  {formatDistanceToNow(new Date(txn.transaction_date), {
                                    addSuffix: true,
                                    locale: vi,
                                  })}
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="rooms" className="mt-4">
              <Card>
                <CardContent className="pt-6">
                  {roomAllocations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <Home className="h-12 w-12 text-muted-foreground/50" />
                      <p className="mt-2 text-sm text-muted-foreground">
                        {t('items:detail.noRoomAllocation')}
                      </p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('items:detail.room')}</TableHead>
                          <TableHead>{t('items:detail.roomType')}</TableHead>
                          <TableHead className="text-center">{t('items:fields.quantity')}</TableHead>
                          <TableHead>{t('items:detail.condition')}</TableHead>
                          <TableHead>{t('items:detail.allocatedAt')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {roomAllocations.map((allocation: any) => (
                          <TableRow key={allocation.id}>
                            <TableCell>
                              <Link
                                to={`/rooms/${allocation.room_id}`}
                                className="font-medium hover:underline"
                              >
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4 text-muted-foreground" />
                                  {allocation.room_number}
                                </div>
                              </Link>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{allocation.room_type}</Badge>
                            </TableCell>
                            <TableCell className="text-center font-bold">
                              {allocation.quantity}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  allocation.condition === 'good' ? 'default' :
                                  allocation.condition === 'damaged' ? 'destructive' :
                                  'secondary'
                                }
                              >
                                {allocation.condition === 'good' && t('items:detail.conditionGood')}
                                {allocation.condition === 'fair' && t('items:detail.conditionFair')}
                                {allocation.condition === 'poor' && t('items:detail.conditionPoor')}
                                {allocation.condition === 'damaged' && t('items:detail.conditionDamaged')}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDistanceToNow(new Date(allocation.assigned_at), {
                                addSuffix: true,
                                locale: vi,
                              })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>{t('items:detail.basicInfo')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">{t('items:detail.stockStatus')}</p>
                <Badge className="mt-1" variant={stockStatusConfig[stockStatus].variant}>
                  {stockStatusConfig[stockStatus].label}
                </Badge>
              </div>

              {item.minimum_stock > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground">{t('items:detail.minStock')}</p>
                  <p className="font-medium">{item.minimum_stock} {item.unit}</p>
                </div>
              )}

              {item.reorder_point > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground">{t('items:detail.reorderPoint')}</p>
                  <p className="font-medium">{item.reorder_point} {item.unit}</p>
                </div>
              )}

              <div>
                <p className="text-sm text-muted-foreground">{t('items:fields.unit')}</p>
                <p className="font-medium">{item.unit}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">{t('items:fields.unitPrice')}</p>
                <p className="text-lg font-bold">
                  {new Intl.NumberFormat('vi-VN', {
                    style: 'currency',
                    currency: 'VND',
                  }).format(item.unit_price)}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">{t('items:detail.stockValue')}</p>
                <p className="text-lg font-bold text-primary">
                  {new Intl.NumberFormat('vi-VN', {
                    style: 'currency',
                    currency: 'VND',
                  }).format(item.quantity_in_stock * item.unit_price)}
                </p>
              </div>

              {item.brand && (
                <div>
                  <p className="text-sm text-muted-foreground">{t('items:fields.brand')}</p>
                  <p className="font-medium">{item.brand}</p>
                </div>
              )}

              {item.model && (
                <div>
                  <p className="text-sm text-muted-foreground">{t('items:fields.model')}</p>
                  <p className="font-medium">{item.model}</p>
                </div>
              )}

              {hotel && (
                <div>
                  <p className="text-sm text-muted-foreground">{t('items:detail.hotel')}</p>
                  <p className="font-medium">{hotel.name}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* QR Code */}
          {item.qr_code && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  {t('items:detail.qrCode')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <QRCodeDisplay value={item.qr_code} size={200} />
                <p className="mt-2 text-center text-sm text-muted-foreground">
                  {item.qr_code}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Lifecycle */}
          {(item.expected_lifetime_days || item.max_wash_cycles) && (
            <Card>
              <CardHeader>
                <CardTitle>{t('items:detail.lifecycle')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {item.expected_lifetime_days && (
                  <div>
                    <p className="text-sm text-muted-foreground">{t('items:detail.expectedLifetime')}</p>
                    <p className="font-medium">{t('items:detail.days', { count: item.expected_lifetime_days })}</p>
                  </div>
                )}

                {item.max_wash_cycles && (
                  <div>
                    <p className="text-sm text-muted-foreground">{t('items:detail.washCycles')}</p>
                    <p className="font-medium">
                      {item.current_wash_cycles} / {item.max_wash_cycles}
                    </p>
                    <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{
                          width: `${Math.min((item.current_wash_cycles / item.max_wash_cycles) * 100, 100)}%`
                        }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Alerts */}
          {stockStatus === 'low_stock' && (
            <Card className="border-warning bg-warning/5">
              <CardContent className="pt-6">
                <div className="flex gap-3">
                  <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
                  <div>
                    <p className="font-medium text-warning">{t('items:detail.alerts.lowStock')}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t('items:detail.alerts.lowStockDesc')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {stockStatus === 'out_of_stock' && (
            <Card className="border-destructive bg-destructive/5">
              <CardContent className="pt-6">
                <div className="flex gap-3">
                  <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
                  <div>
                    <p className="font-medium text-destructive">{t('items:detail.alerts.outOfStock')}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t('items:detail.alerts.outOfStockDesc')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
