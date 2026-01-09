import { useState, useMemo, useEffect, useRef } from 'react'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { AlertTriangle, CreditCard, Receipt, Clock, Check, Printer } from 'lucide-react'
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
  isEarlyCheckout,
  DEFAULT_PRICING_RULES,
  DamageChargeItem
} from '@/lib/bookingCalculations'
import { cn } from '@/lib/utils'
import { DamageChargesSection } from './DamageChargesSection'
import { DamageReportDocument } from './DamageReportDocument'

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
  actualCheckoutDate: Date
  scheduledCheckoutDate: Date
  costBreakdown: BookingCostBreakdown
  // Damage charges
  damageItems?: DamageChargeItem[]
  onConfirmCheckout: (
    adjustedLateCharge: number, 
    adjustmentNote?: string,
    damageCharges?: number,
    damageAdjustmentNote?: string,
    adjustedDamageItems?: DamageChargeItem[]
  ) => void
  onPayAndCheckout: (
    adjustedLateCharge: number, 
    adjustmentNote?: string,
    damageCharges?: number,
    damageAdjustmentNote?: string,
    adjustedDamageItems?: DamageChargeItem[]
  ) => void
  isLoading?: boolean
  hotelInfo?: {
    name: string
    address?: string
    phone?: string
  }
}

export function CheckoutSummaryDialog({
  open,
  onOpenChange,
  guestName,
  roomNumber,
  actualCheckoutTime,
  actualCheckoutDate,
  scheduledCheckoutDate,
  costBreakdown,
  damageItems: initialDamageItems = [],
  onConfirmCheckout,
  onPayAndCheckout,
  isLoading = false,
  hotelInfo,
}: CheckoutSummaryDialogProps) {
  const [adjustedLateCharge, setAdjustedLateCharge] = useState(costBreakdown.lateCheckoutCharge)
  const [adjustmentNote, setAdjustmentNote] = useState('')
  
  // Damage charge states
  const [adjustedDamageItems, setAdjustedDamageItems] = useState<DamageChargeItem[]>(initialDamageItems)
  const [damageAdjustmentNote, setDamageAdjustmentNote] = useState('')
  const [showDamageReport, setShowDamageReport] = useState(false)
  const reportRef = useRef<HTMLDivElement>(null)

  // Reset when dialog opens or costBreakdown changes
  useEffect(() => {
    if (open) {
      setAdjustedLateCharge(costBreakdown.lateCheckoutCharge)
      setAdjustmentNote('')
      setAdjustedDamageItems(initialDamageItems)
      setDamageAdjustmentNote('')
      setShowDamageReport(false)
    }
  }, [open, costBreakdown.lateCheckoutCharge, initialDamageItems])

  // Calculate total damage charge
  const totalDamageCharge = useMemo(() => {
    return adjustedDamageItems.reduce((sum, item) => sum + item.charge_amount * item.quantity, 0)
  }, [adjustedDamageItems])

  // Check if damage charges were adjusted
  const isDamageAdjusted = useMemo(() => {
    if (adjustedDamageItems.length !== initialDamageItems.length) return true
    return adjustedDamageItems.some(item => {
      const original = initialDamageItems.find(i => i.item_id === item.item_id)
      return !original || original.charge_amount !== item.charge_amount
    })
  }, [adjustedDamageItems, initialDamageItems])

  const needsDamageNote = isDamageAdjusted && totalDamageCharge < 
    initialDamageItems.reduce((sum, i) => sum + i.charge_amount * i.quantity, 0) && 
    !damageAdjustmentNote.trim()

  // Recalculate cost breakdown with adjusted late charge AND damage charges
  const adjustedCostBreakdown = useMemo(() => {
    return calculateBookingCost({
      roomPrice: costBreakdown.roomPricePerNight,
      nights: costBreakdown.nights,
      earlyCheckinCharge: costBreakdown.earlyCheckinCharge,
      lateCheckoutCharge: adjustedLateCharge,
      serviceCharges: costBreakdown.serviceCharges,
      extraCharges: costBreakdown.extraCharges,
      damageCharges: totalDamageCharge,
      damageItems: adjustedDamageItems,
      vatRate: costBreakdown.vatRate,
      serviceFeeRate: costBreakdown.serviceFeeRate,
      depositAmount: costBreakdown.depositAmount,
      amountPaid: costBreakdown.amountPaid,
    })
  }, [costBreakdown, adjustedLateCharge, totalDamageCharge, adjustedDamageItems])

  // Check if this is an early checkout (before scheduled date)
  const isEarlyCheckoutCase = isEarlyCheckout(actualCheckoutDate, scheduledCheckoutDate)
  
  // Determine which tier applies (only relevant if NOT early checkout)
  const currentHour = parseTimeToHours(actualCheckoutTime)
  const activeTier = !isEarlyCheckoutCase 
    ? LATE_CHECKOUT_TIERS.find(tier => currentHour >= tier.minHour && currentHour < tier.maxHour)
    : null
  
  const lateCheckoutDesc = getLateCheckoutDescription(actualCheckoutTime, actualCheckoutDate, scheduledCheckoutDate)
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

  // Damage item handlers
  const handleAdjustDamageCharge = (itemId: string, newCharge: number) => {
    setAdjustedDamageItems(prev => 
      prev.map(item => item.item_id === itemId ? { ...item, charge_amount: newCharge } : item)
    )
  }

  const handleWaiveDamageItem = (itemId: string) => {
    setAdjustedDamageItems(prev => 
      prev.map(item => item.item_id === itemId ? { ...item, charge_amount: 0 } : item)
    )
  }

  const handleResetDamageItem = (itemId: string) => {
    const original = initialDamageItems.find(i => i.item_id === itemId)
    if (original) {
      setAdjustedDamageItems(prev => 
        prev.map(item => item.item_id === itemId ? { ...item, charge_amount: original.charge_amount } : item)
      )
    }
  }

  const handlePrintReport = () => {
    setShowDamageReport(true)
    setTimeout(() => {
      if (reportRef.current) {
        const printWindow = window.open('', '_blank')
        if (printWindow) {
          printWindow.document.write('<html><head><title>Biên bản thiệt hại</title>')
          printWindow.document.write('<style>body { font-family: Arial, sans-serif; } table { border-collapse: collapse; width: 100%; } th, td { border: 1px solid #ccc; padding: 8px; }</style>')
          printWindow.document.write('</head><body>')
          printWindow.document.write(reportRef.current.innerHTML)
          printWindow.document.write('</body></html>')
          printWindow.document.close()
          printWindow.print()
        }
      }
      setShowDamageReport(false)
    }, 100)
  }

  const handleConfirm = () => {
    const combinedNote = [
      isAdjusted ? adjustmentNote : '',
      isDamageAdjusted ? damageAdjustmentNote : ''
    ].filter(Boolean).join(' | ')
    
    onConfirmCheckout(
      adjustedLateCharge, 
      isAdjusted ? adjustmentNote : undefined,
      totalDamageCharge,
      isDamageAdjusted ? damageAdjustmentNote : undefined,
      adjustedDamageItems
    )
  }

  const handlePayAndCheckout = () => {
    onPayAndCheckout(
      adjustedLateCharge, 
      isAdjusted ? adjustmentNote : undefined,
      totalDamageCharge,
      isDamageAdjusted ? damageAdjustmentNote : undefined,
      adjustedDamageItems
    )
  }

  const canProceed = !needsNote && !needsDamageNote
  
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-xl w-[95vw] max-h-[90vh] overflow-y-auto">
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

              {/* Late Checkout Surcharge Tiers - Only show if NOT early checkout */}
              {isEarlyCheckoutCase ? (
                <>
                  <Separator />
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 text-green-700">
                      <Check className="h-4 w-4" />
                      <span className="font-medium">Checkout sớm - Không phụ thu</span>
                    </div>
                    <p className="text-xs text-green-600 mt-1">
                      Khách trả phòng trước ngày checkout dự kiến ({format(scheduledCheckoutDate, 'dd/MM/yyyy')})
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <Separator />
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-muted/50 px-3 py-2 text-xs font-medium">
                      PHỤ THU CHECK-OUT TRỄ (tiêu chuẩn: 12:00)
                    </div>
                    <div className="divide-y">
                      {LATE_CHECKOUT_TIERS.map((tier) => {
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
                    {currentHour <= 12 && (
                      <div className="px-3 py-2 text-xs text-muted-foreground">
                        Checkout trước/đúng giờ tiêu chuẩn → không phụ thu.
                      </div>
                    )}
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
                
                {/* Late Checkout Surcharge - Editable (only if NOT early checkout and late) */}
                {!isEarlyCheckoutCase && currentHour > 12 && (
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

                {/* Damage Charges Section */}
                {adjustedDamageItems.length > 0 && (
                  <>
                    <Separator />
                    <DamageChargesSection
                      damageItems={adjustedDamageItems}
                      originalItems={initialDamageItems}
                      onAdjustCharge={handleAdjustDamageCharge}
                      onWaiveItem={handleWaiveDamageItem}
                      onResetItem={handleResetDamageItem}
                    />
                    {/* Damage Adjustment Note */}
                    {isDamageAdjusted && totalDamageCharge < initialDamageItems.reduce((s, i) => s + i.charge_amount * i.quantity, 0) && (
                      <div className="space-y-1">
                        <Textarea
                          placeholder="Lý do điều chỉnh phí đền bù..."
                          className="h-12 text-xs"
                          value={damageAdjustmentNote}
                          onChange={(e) => setDamageAdjustmentNote(e.target.value)}
                        />
                        {needsDamageNote && (
                          <p className="text-xs text-red-500">Vui lòng nhập lý do điều chỉnh phí đền bù</p>
                        )}
                      </div>
                    )}
                    {/* Print Button */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handlePrintReport}
                      className="w-full gap-2 h-8"
                    >
                      <Printer className="h-4 w-4" />
                      In biên bản xác nhận
                    </Button>
                  </>
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
                disabled={isLoading || !canProceed}
              >
                Cho trả phòng (nợ {formatCurrency(adjustedCostBreakdown.remainingAmount)})
              </Button>
              <Button
                onClick={handlePayAndCheckout}
                disabled={isLoading || !canProceed}
                className="gap-2"
              >
                <CreditCard className="h-4 w-4" />
                Thu tiền & Trả phòng
              </Button>
            </>
          ) : (
            <Button onClick={handleConfirm} disabled={isLoading || !canProceed}>
              Xác nhận Check-out
            </Button>
          )}
        </AlertDialogFooter>

        {/* Hidden Damage Report for Printing */}
        {showDamageReport && adjustedDamageItems.length > 0 && (
          <div className="hidden">
            <DamageReportDocument
              ref={reportRef}
              guestName={guestName}
              roomNumber={roomNumber}
              checkoutDate={actualCheckoutDate}
              damageItems={adjustedDamageItems}
              totalCharge={totalDamageCharge}
              adjustmentNote={damageAdjustmentNote}
              hotelInfo={hotelInfo}
            />
          </div>
        )}
      </AlertDialogContent>
    </AlertDialog>
  )
}
