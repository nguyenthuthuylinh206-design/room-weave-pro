import { useState, useMemo, useEffect } from 'react'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { AlertTriangle, CreditCard, Receipt, Clock, Check } from 'lucide-react'
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
import { formatCurrency } from '@/lib/utils'
import { 
  BookingCostBreakdown, 
  getLateCheckoutDescription,
  calculateBookingCost,
  parseTimeToHours,
  DEFAULT_PRICING_RULES
} from '@/lib/bookingCalculations'
import { cn } from '@/lib/utils'

// Late checkout surcharge tiers
const LATE_CHECKOUT_TIERS = [
  { id: 'before12', label: 'Trước 12:00', percent: 0, description: 'Miễn phí', minHour: 0, maxHour: 12 },
  { id: '12to15', label: '12:00 - 15:00', percent: 30, description: '', minHour: 12, maxHour: 15 },
  { id: '15to18', label: '15:00 - 18:00', percent: 50, description: '', minHour: 15, maxHour: 18 },
  { id: 'after18', label: 'Sau 18:00', percent: 100, description: '= 1 đêm', minHour: 18, maxHour: 24 },
]

interface CheckoutSummaryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  guestName: string
  roomNumber: string
  actualCheckoutTime: string
  costBreakdown: BookingCostBreakdown
  onConfirmCheckout: (adjustedLateCharge: number, adjustmentNote?: string) => void
  onPayAndCheckout: (adjustedLateCharge: number, adjustmentNote?: string) => void
  isLoading?: boolean
}

export function CheckoutSummaryDialog({
  open,
  onOpenChange,
  guestName,
  roomNumber,
  actualCheckoutTime,
  costBreakdown,
  onConfirmCheckout,
  onPayAndCheckout,
  isLoading = false,
}: CheckoutSummaryDialogProps) {
  const [adjustedLateCharge, setAdjustedLateCharge] = useState(costBreakdown.lateCheckoutCharge)
  const [adjustmentNote, setAdjustmentNote] = useState('')

  // Reset when dialog opens or costBreakdown changes
  useEffect(() => {
    if (open) {
      setAdjustedLateCharge(costBreakdown.lateCheckoutCharge)
      setAdjustmentNote('')
    }
  }, [open, costBreakdown.lateCheckoutCharge])

  // Recalculate cost breakdown with adjusted late charge
  const adjustedCostBreakdown = useMemo(() => {
    return calculateBookingCost({
      roomPrice: costBreakdown.roomPricePerNight,
      nights: costBreakdown.nights,
      earlyCheckinCharge: costBreakdown.earlyCheckinCharge,
      lateCheckoutCharge: adjustedLateCharge,
      serviceCharges: costBreakdown.serviceCharges,
      extraCharges: costBreakdown.extraCharges,
      vatRate: costBreakdown.vatRate,
      serviceFeeRate: costBreakdown.serviceFeeRate,
      depositAmount: costBreakdown.depositAmount,
      amountPaid: costBreakdown.amountPaid,
    })
  }, [costBreakdown, adjustedLateCharge])

  // Determine which tier applies
  const currentHour = parseTimeToHours(actualCheckoutTime)
  const activeTier = LATE_CHECKOUT_TIERS.find(
    tier => currentHour >= tier.minHour && currentHour < tier.maxHour
  )
  
  const lateCheckoutDesc = getLateCheckoutDescription(actualCheckoutTime)
  const hasOutstandingBalance = adjustedCostBreakdown.remainingAmount > 0

  // Check if charge was adjusted
  const isAdjusted = adjustedLateCharge !== costBreakdown.lateCheckoutCharge
  const needsNote = isAdjusted && adjustedLateCharge < costBreakdown.lateCheckoutCharge && !adjustmentNote.trim()
  
  const handleWaive = () => {
    setAdjustedLateCharge(0)
  }

  const handleResetToStandard = () => {
    setAdjustedLateCharge(costBreakdown.lateCheckoutCharge)
    setAdjustmentNote('')
  }

  const handleConfirm = () => {
    onConfirmCheckout(adjustedLateCharge, isAdjusted ? adjustmentNote : undefined)
  }

  const handlePayAndCheckout = () => {
    onPayAndCheckout(adjustedLateCharge, isAdjusted ? adjustmentNote : undefined)
  }
  
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Xác nhận Check-out
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              {/* Guest & Room Info */}
              <div className="flex justify-between text-sm">
                <span>Khách: <strong>{guestName}</strong></span>
                <span>Phòng: <strong>{roomNumber}</strong></span>
              </div>

              {/* Time Info */}
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>Checkout: <strong>{actualCheckoutTime}</strong></span>
                {lateCheckoutDesc && (
                  <span className="text-amber-600 text-xs">({lateCheckoutDesc})</span>
                )}
              </div>

              {/* Late Checkout Surcharge Tiers (only show if late) */}
              {currentHour > 12 && (
                <>
                  <Separator />
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-muted/50 px-3 py-2 text-xs font-medium">
                      PHỤ THU CHECK-OUT TRỄ (tiêu chuẩn: 12:00)
                    </div>
                    <div className="divide-y">
                      {LATE_CHECKOUT_TIERS.filter(t => t.minHour >= 12).map((tier) => {
                        const isActive = tier.id === activeTier?.id
                        const tierAmount = Math.round(costBreakdown.roomPricePerNight * tier.percent / 100)
                        return (
                          <div
                            key={tier.id}
                            className={cn(
                              "flex items-center justify-between px-3 py-2 text-sm",
                              isActive && "bg-amber-50 border-l-2 border-l-amber-500"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              {isActive && <Check className="h-4 w-4 text-amber-600" />}
                              <span className={cn(isActive && "font-medium")}>{tier.label}</span>
                              {tier.description && (
                                <span className="text-xs text-muted-foreground">({tier.description})</span>
                              )}
                            </div>
                            <span className={cn("font-mono text-xs", isActive && "font-medium text-amber-600")}>
                              {tier.percent}% = {formatCurrency(tierAmount)}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </>
              )}

              <Separator />

              {/* Cost Breakdown */}
              <div className="space-y-2 text-sm">
                <h4 className="font-medium">Chi tiết thanh toán</h4>
                
                {/* Room Charges */}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Tiền phòng ({adjustedCostBreakdown.nights} đêm × {formatCurrency(adjustedCostBreakdown.roomPricePerNight)})
                  </span>
                  <span>{formatCurrency(adjustedCostBreakdown.roomTotal)}</span>
                </div>
                
                {/* Early Check-in Surcharge */}
                {adjustedCostBreakdown.earlyCheckinCharge > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Phụ thu check-in sớm</span>
                    <span>{formatCurrency(adjustedCostBreakdown.earlyCheckinCharge)}</span>
                  </div>
                )}
                
                {/* Late Checkout Surcharge - Editable */}
                {currentHour > 12 && (
                  <div className="space-y-2 p-2 border rounded-lg bg-amber-50/50">
                    <div className="flex items-center justify-between gap-2">
                      <Label className="text-sm text-amber-700">
                        Phụ thu check-out trễ ({activeTier?.percent || 0}%)
                      </Label>
                      <div className="flex items-center gap-1">
                        <Input
                          type="text"
                          inputMode="numeric"
                          className="w-28 h-7 text-right font-mono text-sm"
                          value={adjustedLateCharge > 0 ? adjustedLateCharge.toString() : ''}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9]/g, '')
                            setAdjustedLateCharge(parseInt(value) || 0)
                          }}
                          placeholder="0"
                        />
                        <span className="text-xs text-muted-foreground">đ</span>
                      </div>
                    </div>
                    
                    {/* Quick Actions */}
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleWaive}
                        className="h-6 text-xs text-green-600 hover:bg-green-50"
                        disabled={adjustedLateCharge === 0}
                      >
                        Miễn phí
                      </Button>
                      {isAdjusted && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleResetToStandard}
                          className="h-6 text-xs"
                        >
                          Theo chuẩn
                        </Button>
                      )}
                    </div>

                    {/* Adjustment Note */}
                    {isAdjusted && adjustedLateCharge < costBreakdown.lateCheckoutCharge && (
                      <div className="space-y-1">
                        <Textarea
                          placeholder="Lý do điều chỉnh..."
                          className="h-12 text-xs"
                          value={adjustmentNote}
                          onChange={(e) => setAdjustmentNote(e.target.value)}
                        />
                        {needsNote && (
                          <p className="text-xs text-red-500">Vui lòng nhập lý do</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Non-editable late charge display (when on time) */}
                {currentHour <= 12 && adjustedCostBreakdown.lateCheckoutCharge > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Phụ thu check-out trễ</span>
                    <span>{formatCurrency(adjustedCostBreakdown.lateCheckoutCharge)}</span>
                  </div>
                )}
                
                {/* Services */}
                {adjustedCostBreakdown.serviceCharges > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Dịch vụ sử dụng</span>
                    <span>{formatCurrency(adjustedCostBreakdown.serviceCharges)}</span>
                  </div>
                )}
                
                {adjustedCostBreakdown.extraCharges > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Chi phí khác</span>
                    <span>{formatCurrency(adjustedCostBreakdown.extraCharges)}</span>
                  </div>
                )}
                
                <Separator />
                
                {/* Subtotal */}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(adjustedCostBreakdown.subtotal)}</span>
                </div>
                
                {/* VAT */}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">VAT ({adjustedCostBreakdown.vatRate}%)</span>
                  <span>{formatCurrency(adjustedCostBreakdown.vatAmount)}</span>
                </div>
                
                {/* Service Fee */}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phí dịch vụ ({adjustedCostBreakdown.serviceFeeRate}%)</span>
                  <span>{formatCurrency(adjustedCostBreakdown.serviceFeeAmount)}</span>
                </div>
                
                <Separator />
                
                {/* Total */}
                <div className="flex justify-between font-bold">
                  <span>TỔNG CỘNG</span>
                  <span>{formatCurrency(adjustedCostBreakdown.totalAmount)}</span>
                </div>
                
                {/* Payments */}
                {adjustedCostBreakdown.depositAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Tiền đặt cọc</span>
                    <span>-{formatCurrency(adjustedCostBreakdown.depositAmount)}</span>
                  </div>
                )}
                
                {adjustedCostBreakdown.amountPaid > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Đã thanh toán</span>
                    <span>-{formatCurrency(adjustedCostBreakdown.amountPaid)}</span>
                  </div>
                )}
                
                <Separator />
                
                {/* Remaining */}
                <div className={cn(
                  "flex justify-between font-bold text-lg",
                  hasOutstandingBalance ? "text-red-600" : "text-green-600"
                )}>
                  <span>CÒN LẠI</span>
                  <span>{formatCurrency(adjustedCostBreakdown.remainingAmount)}</span>
                </div>
              </div>

              {/* Warning if unpaid */}
              {hasOutstandingBalance && (
                <div className="flex items-start gap-2 p-2 bg-amber-50 border border-amber-200 rounded-md">
                  <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-700">
                    Khách chưa thanh toán đầy đủ. Vui lòng thu tiền trước khi cho trả phòng hoặc xác nhận cho trả phòng với số nợ.
                  </div>
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
                onClick={handleConfirm}
                disabled={isLoading || needsNote}
              >
                Cho trả phòng (nợ {formatCurrency(adjustedCostBreakdown.remainingAmount)})
              </Button>
              <Button
                onClick={handlePayAndCheckout}
                disabled={isLoading || needsNote}
                className="gap-2"
              >
                <CreditCard className="h-4 w-4" />
                Thu tiền & Trả phòng
              </Button>
            </>
          ) : (
            <Button onClick={handleConfirm} disabled={isLoading || needsNote}>
              Xác nhận Check-out
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
