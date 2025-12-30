import { Package, Check, Loader2, Truck, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { 
  PendingDelivery, 
  usePendingDeliveriesForRoom, 
  useConfirmDeliveryFromRoomCheck 
} from '@/hooks/usePendingDeliveries'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'

interface PendingDeliveriesSectionProps {
  roomId: string
  onDeliveryConfirmed?: () => void
}

export function PendingDeliveriesSection({ 
  roomId, 
  onDeliveryConfirmed 
}: PendingDeliveriesSectionProps) {
  const { data: pendingDeliveries, isLoading } = usePendingDeliveriesForRoom(roomId)
  const confirmDelivery = useConfirmDeliveryFromRoomCheck()

  if (isLoading) {
    return null
  }

  if (!pendingDeliveries || pendingDeliveries.length === 0) {
    return null
  }

  const handleConfirmDelivery = async (roomOrderId: string) => {
    await confirmDelivery.mutateAsync({ roomOrderId })
    onDeliveryConfirmed?.()
  }

  const totalItems = pendingDeliveries.reduce(
    (sum, d) => sum + d.items.reduce((s, i) => s + i.quantity, 0),
    0
  )

  return (
    <Alert className="border-primary/50 bg-primary/5">
      <Truck className="h-4 w-4 text-primary" />
      <AlertTitle className="flex items-center gap-2">
        Phiếu giao hàng chờ xác nhận
        <Badge variant="secondary" className="ml-1">
          {pendingDeliveries.length} phiếu
        </Badge>
        <Badge variant="outline" className="ml-1">
          {totalItems} items
        </Badge>
      </AlertTitle>
      <AlertDescription className="mt-3">
        <Accordion type="multiple" className="w-full">
          {pendingDeliveries.map((delivery) => (
            <DeliveryAccordionItem 
              key={delivery.room_order_id}
              delivery={delivery}
              onConfirm={handleConfirmDelivery}
              isConfirming={confirmDelivery.isPending}
            />
          ))}
        </Accordion>
      </AlertDescription>
    </Alert>
  )
}

interface DeliveryAccordionItemProps {
  delivery: PendingDelivery
  onConfirm: (roomOrderId: string) => void
  isConfirming: boolean
}

function DeliveryAccordionItem({ 
  delivery, 
  onConfirm, 
  isConfirming 
}: DeliveryAccordionItemProps) {
  const itemCount = delivery.items.reduce((s, i) => s + i.quantity, 0)
  const timeAgo = delivery.created_at 
    ? formatDistanceToNow(new Date(delivery.created_at), { addSuffix: true, locale: vi })
    : ''

  return (
    <AccordionItem value={delivery.room_order_id} className="border rounded-lg mb-2 bg-background">
      <AccordionTrigger className="px-4 py-3 hover:no-underline">
        <div className="flex items-center justify-between w-full pr-4">
          <div className="flex items-center gap-3">
            <Package className="h-4 w-4 text-muted-foreground" />
            <div className="text-left">
              <span className="font-medium">{delivery.order_code}</span>
              <span className="text-muted-foreground ml-2 text-sm">
                (Batch {delivery.batch_number})
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {itemCount} items
            </Badge>
            {delivery.stop_status === 'pending' && (
              <Badge variant="secondary" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                Chờ giao
              </Badge>
            )}
            {delivery.stop_status === 'received' && (
              <Badge className="text-xs bg-blue-500">
                Đã nhận batch
              </Badge>
            )}
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4 pb-4">
        <div className="space-y-3">
          {/* Items list */}
          <div className="rounded-md border">
            <div className="p-2 bg-muted/30 border-b">
              <span className="text-xs font-medium text-muted-foreground">
                Danh sách đồ cần nhận
              </span>
            </div>
            <div className="divide-y">
              {delivery.items.map((item) => (
                <div 
                  key={item.id} 
                  className="flex items-center justify-between px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{item.item_name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({item.item_code})
                    </span>
                  </div>
                  <Badge variant="secondary">
                    x{item.quantity}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Time info */}
          {timeAgo && (
            <p className="text-xs text-muted-foreground">
              Tạo phiếu {timeAgo}
            </p>
          )}

          {/* Confirm button */}
          <Button
            onClick={() => onConfirm(delivery.room_order_id)}
            disabled={isConfirming}
            className="w-full"
            size="sm"
          >
            {isConfirming ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang xác nhận...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Xác nhận đã nhận đủ hàng
              </>
            )}
          </Button>
        </div>
      </AccordionContent>
    </AccordionItem>
  )
}
