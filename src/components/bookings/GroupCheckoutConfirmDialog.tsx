import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Receipt,
  AlertTriangle,
  CreditCard,
  Clock,
  ChevronDown,
  ChevronUp,
  Loader2,
  Check,
} from 'lucide-react'
import { formatVNCurrency } from '@/lib/pricing'
import { cn } from '@/lib/utils'
import { type GroupRoomCostBreakdown } from '@/hooks/useGroupCheckoutCalculations'
import { DamageChargeItem } from '@/lib/bookingCalculations'

// Late checkout tiers (same as CheckoutSummaryDialog)
const LATE_CHECKOUT_TIERS = [
  { id: 'before12', label: 'Trước 12:00', percent: 0, minHour: 0, maxHour: 12 },
  { id: '12to15', label: '12:00 - 15:00', percent: 30, minHour: 12, maxHour: 15 },
  { id: '15to18', label: '15:00 - 18:00', percent: 50, minHour: 15, maxHour: 18 },
  { id: 'after18', label: 'Sau 18:00', percent: 100, minHour: 18, maxHour: 24 },
]

interface RoomInfo {
  bookingId: string
  roomNumber: string
  guestName: string
  roomPrice: number
  bookingType: 'daily' | 'hourly' | 'monthly'
}

interface GroupCheckoutConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  rooms: RoomInfo[]
  roomCosts: Map<string, GroupRoomCostBreakdown>
  totals: {
    totalRoom: number
    totalLateCharge: number
    totalService: number
    totalDamage: number
    grandTotal: number
    totalPaid: number
    depositApplied: number
    remaining: number
  }
  onAdjustLateCharge: (bookingId: string, newCharge: number, note: string) => void
  onAdjustDamageItem: (bookingId: string, itemId: string, newCharge: number) => void
  onSetDamageNote: (bookingId: string, note: string) => void
  onConfirm: () => void
  onPayAndCheckout: () => void
  isLoading?: boolean
}

export function GroupCheckoutConfirmDialog({
  open,
  onOpenChange,
  rooms,
  roomCosts,
  totals,
  onAdjustLateCharge,
  onAdjustDamageItem,
  onSetDamageNote,
  onConfirm,
  onPayAndCheckout,
  isLoading = false,
}: GroupCheckoutConfirmDialogProps) {
  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set())
  const currentHour = new Date().getHours()
  
  // Get active late checkout tier
  const activeTier = LATE_CHECKOUT_TIERS.find(
    tier => currentHour >= tier.minHour && currentHour < tier.maxHour
  )

  // Check if any adjustments need notes
  const { hasInvalidAdjustments } = useMemo(() => {
    let hasInvalid = false
    
    for (const room of rooms) {
      const cost = roomCosts.get(room.bookingId)
      if (!cost) continue
      
      // Check late charge adjustment needs note
      if (room.bookingType === 'daily' && cost.adjustedLateCharge < cost.lateCheckoutCharge && !cost.lateAdjustmentNote.trim()) {
        hasInvalid = true
      }
      
      // Check damage adjustment needs note
      const currentDamageTotal = cost.adjustedDamageItems.reduce((s, i) => s + i.charge_amount * i.quantity, 0)
      if (currentDamageTotal < cost.originalDamageTotal && !cost.damageAdjustmentNote.trim()) {
        hasInvalid = true
      }
    }
    
    return { hasInvalidAdjustments: hasInvalid }
  }, [rooms, roomCosts])

  const toggleRoomExpand = (bookingId: string) => {
    setExpandedRooms(prev => {
      const newSet = new Set(prev)
      if (newSet.has(bookingId)) {
        newSet.delete(bookingId)
      } else {
        newSet.add(bookingId)
      }
      return newSet
    })
  }

  const hasOutstandingBalance = totals.remaining > 0
  const canProceed = !hasInvalidAdjustments

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Xác nhận Checkout Nhóm ({rooms.length} phòng)
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4 text-left">
              {/* Current time info */}
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>Giờ checkout: <strong>{format(new Date(), 'HH:mm')}</strong></span>
                {activeTier && activeTier.percent > 0 && (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                    Phụ thu {activeTier.percent}%
                  </Badge>
                )}
              </div>

              <Separator />

              {/* Room Details (Collapsible) */}
              <ScrollArea className="max-h-[300px] pr-2">
                <div className="space-y-2">
                  {rooms.map((room) => {
                    const cost = roomCosts.get(room.bookingId)
                    const isExpanded = expandedRooms.has(room.bookingId)
                    const hasLateCharge = cost && cost.lateCheckoutCharge > 0
                    const hasDamage = cost && cost.damageItems.length > 0
                    const damageTotal = cost ? cost.adjustedDamageItems.reduce((s, i) => s + i.charge_amount * i.quantity, 0) : 0
                    
                    return (
                      <Collapsible
                        key={room.bookingId}
                        open={isExpanded}
                        onOpenChange={() => toggleRoomExpand(room.bookingId)}
                      >
                        <div className="border rounded-lg overflow-hidden">
                          <CollapsibleTrigger asChild>
                            <div className="flex items-center justify-between p-3 hover:bg-muted/50 cursor-pointer">
                              <div className="flex items-center gap-3">
                                <span className="font-medium">P.{room.roomNumber}</span>
                                <span className="text-sm text-muted-foreground">{room.guestName}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {hasLateCharge && (
                                  <Badge variant="outline" className="bg-amber-50 text-amber-700 text-xs">
                                    +{formatVNCurrency(cost.adjustedLateCharge)} phụ thu
                                  </Badge>
                                )}
                                {hasDamage && damageTotal > 0 && (
                                  <Badge variant="outline" className="bg-red-50 text-red-700 text-xs">
                                    +{formatVNCurrency(damageTotal)} đền bù
                                  </Badge>
                                )}
                                <span className="font-mono text-sm">
                                  {formatVNCurrency(cost?.costBreakdown.totalAmount || 0)}
                                </span>
                                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </div>
                            </div>
                          </CollapsibleTrigger>
                          
                          <CollapsibleContent>
                            {cost && (
                              <div className="px-3 pb-3 space-y-3 border-t bg-muted/30">
                                {/* Late Checkout Charge (only for daily and when > 0) */}
                                {room.bookingType === 'daily' && cost.lateCheckoutCharge > 0 && (
                                  <div className="p-2 bg-amber-50/50 rounded border border-amber-200 space-y-2">
                                    <div className="flex items-center justify-between">
                                      <Label className="text-sm text-amber-700">
                                        Phụ thu checkout trễ ({activeTier?.percent || 0}%)
                                      </Label>
                                      <div className="flex items-center gap-1">
                                        <Input
                                          type="text"
                                          inputMode="numeric"
                                          className="w-24 h-7 text-right font-mono text-xs"
                                          value={cost.adjustedLateCharge > 0 ? cost.adjustedLateCharge.toString() : ''}
                                          onChange={(e) => {
                                            const value = e.target.value.replace(/[^0-9]/g, '')
                                            onAdjustLateCharge(room.bookingId, parseInt(value) || 0, cost.lateAdjustmentNote)
                                          }}
                                          placeholder="0"
                                        />
                                        <span className="text-xs text-muted-foreground">đ</span>
                                      </div>
                                    </div>
                                    <div className="flex gap-1">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => onAdjustLateCharge(room.bookingId, 0, cost.lateAdjustmentNote)}
                                        className="h-6 text-xs text-green-600"
                                        disabled={cost.adjustedLateCharge === 0}
                                      >
                                        Miễn phí
                                      </Button>
                                      {cost.adjustedLateCharge !== cost.lateCheckoutCharge && (
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => onAdjustLateCharge(room.bookingId, cost.lateCheckoutCharge, '')}
                                          className="h-6 text-xs"
                                        >
                                          Theo chuẩn
                                        </Button>
                                      )}
                                    </div>
                                    {cost.adjustedLateCharge < cost.lateCheckoutCharge && (
                                      <div className="space-y-1">
                                        <Textarea
                                          placeholder="Lý do điều chỉnh phụ thu..."
                                          className="h-10 text-xs"
                                          value={cost.lateAdjustmentNote}
                                          onChange={(e) => onAdjustLateCharge(room.bookingId, cost.adjustedLateCharge, e.target.value)}
                                        />
                                        {!cost.lateAdjustmentNote.trim() && (
                                          <p className="text-xs text-destructive">Vui lòng nhập lý do</p>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Damage Items */}
                                {cost.damageItems.length > 0 && (
                                  <div className="p-2 bg-red-50/50 rounded border border-red-200 space-y-2">
                                    <Label className="text-sm text-red-700">Phí đền bù thiệt hại</Label>
                                    <div className="space-y-1">
                                      {cost.adjustedDamageItems.map((item) => {
                                        const original = cost.damageItems.find(i => i.item_id === item.item_id)
                                        const isAdjusted = original && original.charge_amount !== item.charge_amount
                                        
                                        return (
                                          <div key={item.item_id} className="flex items-center justify-between text-xs">
                                            <div className="flex items-center gap-2">
                                              <span>{item.item_name}</span>
                                              <Badge variant="outline" className="text-[10px]">
                                                {item.item_type === 'lost' ? 'Mất' : 'Hỏng'} x{item.quantity}
                                              </Badge>
                                            </div>
                                            <div className="flex items-center gap-1">
                                              <Input
                                                type="text"
                                                inputMode="numeric"
                                                className="w-20 h-6 text-right font-mono text-xs"
                                                value={item.charge_amount > 0 ? item.charge_amount.toString() : ''}
                                                onChange={(e) => {
                                                  const value = e.target.value.replace(/[^0-9]/g, '')
                                                  onAdjustDamageItem(room.bookingId, item.item_id, parseInt(value) || 0)
                                                }}
                                                placeholder="0"
                                              />
                                              <span className="text-muted-foreground">đ</span>
                                              {isAdjusted && (
                                                <Button
                                                  type="button"
                                                  variant="ghost"
                                                  size="icon"
                                                  className="h-5 w-5"
                                                  onClick={() => onAdjustDamageItem(room.bookingId, item.item_id, original!.charge_amount)}
                                                >
                                                  <Check className="h-3 w-3" />
                                                </Button>
                                              )}
                                            </div>
                                          </div>
                                        )
                                      })}
                                    </div>
                                    {damageTotal < cost.originalDamageTotal && (
                                      <div className="space-y-1">
                                        <Textarea
                                          placeholder="Lý do điều chỉnh phí đền bù..."
                                          className="h-10 text-xs"
                                          value={cost.damageAdjustmentNote}
                                          onChange={(e) => onSetDamageNote(room.bookingId, e.target.value)}
                                        />
                                        {!cost.damageAdjustmentNote.trim() && (
                                          <p className="text-xs text-destructive">Vui lòng nhập lý do</p>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Services */}
                                {cost.serviceCharges > 0 && (
                                  <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Dịch vụ sử dụng</span>
                                    <span className="font-mono">{formatVNCurrency(cost.serviceCharges)}</span>
                                  </div>
                                )}

                                {/* Room subtotal */}
                                <div className="flex justify-between text-sm font-medium pt-2 border-t">
                                  <span>Tổng phòng này</span>
                                  <span className="font-mono">{formatVNCurrency(cost.costBreakdown.totalAmount)}</span>
                                </div>
                              </div>
                            )}
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    )
                  })}
                </div>
              </ScrollArea>

              <Separator />

              {/* Grand Totals */}
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tiền phòng</span>
                  <span className="font-mono">{formatVNCurrency(totals.totalRoom)}</span>
                </div>
                {totals.totalLateCharge > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Phụ thu checkout trễ</span>
                    <span className="font-mono text-amber-600">+{formatVNCurrency(totals.totalLateCharge)}</span>
                  </div>
                )}
                {totals.totalService > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Dịch vụ sử dụng</span>
                    <span className="font-mono">{formatVNCurrency(totals.totalService)}</span>
                  </div>
                )}
                {totals.totalDamage > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Phí đền bù</span>
                    <span className="font-mono text-red-600">+{formatVNCurrency(totals.totalDamage)}</span>
                  </div>
                )}
                
                <Separator />
                
                <div className="flex justify-between font-bold">
                  <span>TỔNG CỘNG</span>
                  <span className="font-mono">{formatVNCurrency(totals.grandTotal)}</span>
                </div>
                
                {totals.totalPaid > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Đã thanh toán</span>
                    <span className="font-mono">-{formatVNCurrency(totals.totalPaid)}</span>
                  </div>
                )}
                
                {totals.depositApplied > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Tiền cọc (áp dụng)</span>
                    <span className="font-mono">-{formatVNCurrency(totals.depositApplied)}</span>
                  </div>
                )}
                
                <Separator />
                
                <div className={cn(
                  "flex justify-between font-bold text-lg",
                  hasOutstandingBalance ? "text-primary" : "text-green-600"
                )}>
                  <span>CÒN LẠI</span>
                  <span className="font-mono">{formatVNCurrency(Math.max(0, totals.remaining))}</span>
                </div>
              </div>

              {/* Warning */}
              {hasOutstandingBalance && (
                <div className="flex items-start gap-2 p-2 bg-amber-50 border border-amber-200 rounded-md">
                  <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">
                    Khách chưa thanh toán đầy đủ. Vui lòng thu tiền trước khi cho trả phòng hoặc xác nhận checkout với số nợ.
                  </p>
                </div>
              )}

              {/* Note validation warning */}
              {hasInvalidAdjustments && (
                <div className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded-md">
                  <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700">
                    Vui lòng nhập lý do cho các điều chỉnh phí trước khi checkout.
                  </p>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel disabled={isLoading}>Hủy</AlertDialogCancel>
          
          {hasOutstandingBalance ? (
            <>
              <Button
                variant="outline"
                onClick={onConfirm}
                disabled={isLoading || !canProceed}
              >
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Checkout (nợ {formatVNCurrency(totals.remaining)})
              </Button>
              <Button
                onClick={onPayAndCheckout}
                disabled={isLoading || !canProceed}
                className="gap-2"
              >
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <CreditCard className="h-4 w-4" />
                Thu tiền & Checkout
              </Button>
            </>
          ) : (
            <Button onClick={onConfirm} disabled={isLoading || !canProceed}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Xác nhận Checkout ({rooms.length} phòng)
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
