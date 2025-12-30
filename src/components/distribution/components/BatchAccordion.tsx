import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { BatchStatusBadge } from './BatchStatusBadge'
import { StopCard } from './StopCard'
import { useRouteBatches, useHandoverBatch, useReceiveBatch } from '@/hooks/useRouteBatch'
import { useAuth } from '@/contexts/AuthContext'
import type { DistributionBatch, RouteStop, StopStatus } from '@/types/route-batch.types'
import { Package, Truck, Users, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BatchAccordionProps {
  orderId: string
  orderStatus: string
  assignedTo: string | null
  stops: RouteStop[]
  isStorekeeper?: boolean
  isAssignee?: boolean
  isLeader?: boolean
  onStopAction?: () => void
}

export function BatchAccordion({
  orderId,
  orderStatus,
  assignedTo,
  stops,
  isStorekeeper = false,
  isAssignee = false,
  isLeader = false,
  onStopAction,
}: BatchAccordionProps) {
  const { t } = useTranslation('distribution')
  const { user } = useAuth()
  const { data: batches, isLoading } = useRouteBatches(orderId)
  const handoverBatch = useHandoverBatch()
  const receiveBatch = useReceiveBatch()

  // Group stops by batch number
  const stopsByBatch = stops.reduce((acc, stop) => {
    const batchNum = stop.batch_number || 1
    if (!acc[batchNum]) acc[batchNum] = []
    acc[batchNum].push(stop)
    return acc
  }, {} as Record<number, RouteStop[]>)

  // Calculate batch stats
  const getBatchStats = (batchStops: RouteStop[]) => {
    const total = batchStops.length
    const delivered = batchStops.filter(s => s.stop_status === 'delivered').length
    const cannotAccess = batchStops.filter(s => s.stop_status === 'cannot_access').length
    const resolved = batchStops.filter(s => s.stop_status === 'resolved').length
    const pending = batchStops.filter(s => s.stop_status === 'pending').length
    return { total, delivered, cannotAccess, resolved, pending }
  }

  // Find first batch that needs action
  const findDefaultOpen = () => {
    if (!batches) return []
    for (const batch of batches) {
      if (batch.status !== 'done') {
        return [`batch-${batch.batch_number}`]
      }
    }
    return batches.length > 0 ? [`batch-${batches[0].batch_number}`] : []
  }

  const [openItems, setOpenItems] = useState<string[]>(findDefaultOpen())

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map(i => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    )
  }

  if (!batches || batches.length === 0) {
    // No batches yet - show stops grouped by default batch
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Package className="h-4 w-4" />
            Danh sách phòng
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {stops.map(stop => (
            <StopCard
              key={stop.id}
              stop={stop}
              canDeliver={isAssignee && orderStatus === 'in_progress'}
              canMarkCannotAccess={isAssignee && orderStatus === 'in_progress'}
              onAction={onStopAction}
            />
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <Accordion
      type="multiple"
      value={openItems}
      onValueChange={setOpenItems}
      className="space-y-3"
    >
      {batches.map(batch => {
        const batchStops = stopsByBatch[batch.batch_number] || []
        const stats = getBatchStats(batchStops)
        const canHandover = isStorekeeper && batch.status === 'open'
        const canReceive = isAssignee && batch.status === 'handed_over'
        const canDeliverStops = isAssignee && batch.status === 'received'

        return (
          <AccordionItem
            key={batch.id}
            value={`batch-${batch.batch_number}`}
            className="border rounded-lg overflow-hidden"
          >
            <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
              <div className="flex items-center justify-between w-full pr-2">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="font-mono">
                    Batch {batch.batch_number}
                  </Badge>
                  <BatchStatusBadge status={batch.status} />
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {/* Stats */}
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {stats.total} phòng
                    </span>
                    {stats.delivered > 0 && (
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="h-3.5 w-3.5" />
                        {stats.delivered}
                      </span>
                    )}
                    {stats.cannotAccess > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {stats.cannotAccess} không vào được
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </AccordionTrigger>

            <AccordionContent className="px-4 pb-4">
              {/* Action buttons */}
              {(canHandover || canReceive) && (
                <div className="mb-4 flex gap-2">
                  {canHandover && (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation()
                        handoverBatch.mutate({ batchId: batch.id })
                      }}
                      disabled={handoverBatch.isPending}
                      className="gap-2"
                    >
                      <Truck className="h-4 w-4" />
                      {handoverBatch.isPending ? 'Đang xử lý...' : 'Giao batch này'}
                    </Button>
                  )}
                  {canReceive && (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation()
                        receiveBatch.mutate({ batchId: batch.id })
                      }}
                      disabled={receiveBatch.isPending}
                      variant="secondary"
                      className="gap-2"
                    >
                      <Package className="h-4 w-4" />
                      {receiveBatch.isPending ? 'Đang xử lý...' : 'Nhận batch này'}
                    </Button>
                  )}
                </div>
              )}

              {/* Stops list */}
              <div className="space-y-2">
                {batchStops.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Không có phòng trong batch này
                  </p>
                ) : (
                  batchStops.map(stop => (
                    <StopCard
                      key={stop.id}
                      stop={stop}
                      canDeliver={canDeliverStops && stop.stop_status === 'pending'}
                      canMarkCannotAccess={canDeliverStops && stop.stop_status === 'pending'}
                      canRetry={canDeliverStops && stop.stop_status === 'cannot_access'}
                      canReturnToStock={isAssignee && stop.stop_status === 'cannot_access' && !stop.returned_at}
                      canHandover={isAssignee && stop.stop_status === 'cannot_access' && !!stop.returned_at}
                      onAction={onStopAction}
                    />
                  ))
                )}
              </div>

              {/* Batch timestamps */}
              {(batch.handed_over_at || batch.received_at) && (
                <div className="mt-4 pt-3 border-t text-xs text-muted-foreground space-y-1">
                  {batch.handed_over_at && (
                    <p>Đã giao: {new Date(batch.handed_over_at).toLocaleString('vi-VN')}</p>
                  )}
                  {batch.received_at && (
                    <p>Đã nhận: {new Date(batch.received_at).toLocaleString('vi-VN')}</p>
                  )}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        )
      })}
    </Accordion>
  )
}
