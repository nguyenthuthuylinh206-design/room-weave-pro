import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Package, Truck, CheckCircle, DollarSign, Clock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { BatchStatusBadge } from '@/components/laundry/BatchStatusBadge'
import { useLaundryBatch } from '@/hooks/useLaundryBatches'
import { formatCurrency, formatDate } from '@/lib/utils'
import { format } from 'date-fns'
import { vi, enUS } from 'date-fns/locale'

export function MobileBatchDetail() {
  const { t, i18n } = useTranslation('laundry')
  const { id } = useParams<{ id: string }>()
  const { data, isLoading } = useLaundryBatch(id)
  const dateLocale = i18n.language === 'vi' ? vi : enUS

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="text-center py-12">
          <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">{t('batchDetail.batchNotFound')}</p>
        </div>
      </div>
    )
  }

  const batchData = data as any
  const batch = batchData?.batch
  const vendor = batchData?.vendor
  const items = batchData?.items || []
  const deliveryStaff = batchData?.delivery_staff
  const returnStaff = batchData?.return_staff

  const statusSteps = [
    { status: 'delivered', label: t('batchDetail.timeline.delivered'), icon: Truck, date: batch.delivery_date },
    { status: 'washing', label: t('batchDetail.timeline.washing'), icon: Package, date: null },
    { status: 'ready', label: t('batchDetail.timeline.ready'), icon: CheckCircle, date: null },
    { status: 'received', label: t('batchDetail.timeline.received'), icon: CheckCircle, date: batch.actual_return_date },
    { status: 'stocked', label: t('batchDetail.timeline.stocked'), icon: CheckCircle, date: null }
  ]

  const currentStatusIndex = statusSteps.findIndex(s => s.status === batch.status)

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="flex items-center gap-3 p-4">
          <Link to="/laundry">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold truncate">{batch.batch_code}</h1>
            <p className="text-sm text-muted-foreground">{vendor.name}</p>
          </div>
          <BatchStatusBadge status={batch.status} />
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-80px)]">
        <div className="p-4 space-y-4">
          {/* Status Timeline */}
          <Card className="p-4">
            <h3 className="font-semibold mb-4">{t('batchDetail.progress')}</h3>
            <div className="space-y-3">
              {statusSteps.map((step, index) => (
                <div key={step.status} className="flex items-start gap-3">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    index <= currentStatusIndex ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}>
                    <step.icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0 pt-1">
                    <p className={`font-medium ${index <= currentStatusIndex ? '' : 'text-muted-foreground'}`}>
                      {step.label}
                    </p>
                    {step.date && (
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(step.date), 'dd/MM/yyyy HH:mm', { locale: dateLocale })}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('batchDetail.totalItems')}</p>
                  <p className="text-2xl font-bold">{batch.total_items}</p>
                </div>
                <Package className="h-8 w-8 text-muted-foreground" />
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('batchDetail.weight')}</p>
                  <p className="text-2xl font-bold">{batch.total_weight_kg} {t('units.kg')}</p>
                </div>
                <Package className="h-8 w-8 text-muted-foreground" />
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('batchDetail.estimatedCost')}</p>
                  <p className="text-lg font-bold">{formatCurrency(batch.estimated_cost || 0)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-muted-foreground" />
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('batchDetail.actualCost')}</p>
                  <p className="text-lg font-bold">{formatCurrency(batch.actual_cost || 0)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </Card>
          </div>

          {/* Vendor Info */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3">{t('batchDetail.vendor')}</h3>
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={vendor.logo_url} alt={vendor.name} />
                <AvatarFallback>{vendor.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{vendor.name}</p>
                <p className="text-sm text-muted-foreground">{vendor.phone}</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('batchDetail.type')}:</span>
                <span>{vendor.type === 'external' ? t('batchDetail.external') : t('batchDetail.internal')}</span>
              </div>
              {vendor.rating && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('batchDetail.rating')}:</span>
                  <span>⭐ {vendor.rating.toFixed(1)}</span>
                </div>
              )}
            </div>
          </Card>

          {/* Dates */}
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {t('batchDetail.deliveryDate')}
              </span>
              <span className="font-medium">{formatDate(batch.delivery_date)}</span>
            </div>
            {batch.expected_return_date && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {t('batchDetail.expectedReturn')}
                </span>
                <span className="font-medium">{formatDate(batch.expected_return_date)}</span>
              </div>
            )}
            {batch.actual_return_date && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  {t('batchDetail.actualReturn')}
                </span>
                <span className="font-medium">{formatDate(batch.actual_return_date)}</span>
              </div>
            )}
          </Card>

          {/* Items List */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3">{t('batchDetail.itemsList')} ({items.length})</h3>
            <div className="space-y-2">
              {items.map((item: any, index: number) => (
                <div key={index} className="flex justify-between items-center p-2 rounded-lg bg-muted/50">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.item_name}</p>
                    <p className="text-xs text-muted-foreground">{item.item_code}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{item.quantity_delivered} {item.item_unit}</p>
                    {item.weight_kg && (
                      <p className="text-xs text-muted-foreground">{item.weight_kg} {t('units.kg')}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Staff Info */}
          {(deliveryStaff || returnStaff) && (
            <Card className="p-4 space-y-3">
              <h3 className="font-semibold">{t('batchDetail.staffInCharge')}</h3>
              {deliveryStaff && (
                <div>
                  <p className="text-sm text-muted-foreground">{t('batchDetail.deliveryStaffLabel')}</p>
                  <p className="font-medium">{deliveryStaff.full_name}</p>
                </div>
              )}
              {returnStaff && (
                <div>
                  <p className="text-sm text-muted-foreground">{t('batchDetail.returnStaffLabel')}</p>
                  <p className="font-medium">{returnStaff.full_name}</p>
                </div>
              )}
            </Card>
          )}

          {/* Notes */}
          {batch.notes && (
            <Card className="p-4">
              <h3 className="font-semibold mb-2">{t('batchDetail.notes')}</h3>
              <p className="text-sm text-muted-foreground">{batch.notes}</p>
            </Card>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
