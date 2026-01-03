import { useState } from 'react'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { AlertTriangle, CreditCard, Receipt, Clock } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { formatCurrency } from '@/lib/utils'
import { BookingCostBreakdown, getLateCheckoutDescription } from '@/lib/bookingCalculations'
import { cn } from '@/lib/utils'

interface CheckoutSummaryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  guestName: string
  roomNumber: string
  actualCheckoutTime: string
  costBreakdown: BookingCostBreakdown
  onConfirmCheckout: () => void
  onPayAndCheckout: () => void
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
  const lateCheckoutDesc = getLateCheckoutDescription(actualCheckoutTime)
  const hasOutstandingBalance = costBreakdown.remainingAmount > 0
  
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
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

              <Separator />

              {/* Cost Breakdown */}
              <div className="space-y-2 text-sm">
                <h4 className="font-medium">Chi tiết thanh toán</h4>
                
                {/* Room Charges */}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Tiền phòng ({costBreakdown.nights} đêm × {formatCurrency(costBreakdown.roomPricePerNight)})
                  </span>
                  <span>{formatCurrency(costBreakdown.roomTotal)}</span>
                </div>
                
                {/* Surcharges */}
                {costBreakdown.earlyCheckinCharge > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Phụ thu check-in sớm</span>
                    <span>{formatCurrency(costBreakdown.earlyCheckinCharge)}</span>
                  </div>
                )}
                
                {costBreakdown.lateCheckoutCharge > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Phụ thu check-out trễ</span>
                    <span>{formatCurrency(costBreakdown.lateCheckoutCharge)}</span>
                  </div>
                )}
                
                {/* Services */}
                {costBreakdown.serviceCharges > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Dịch vụ sử dụng</span>
                    <span>{formatCurrency(costBreakdown.serviceCharges)}</span>
                  </div>
                )}
                
                {costBreakdown.extraCharges > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Chi phí khác</span>
                    <span>{formatCurrency(costBreakdown.extraCharges)}</span>
                  </div>
                )}
                
                <Separator />
                
                {/* Subtotal */}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(costBreakdown.subtotal)}</span>
                </div>
                
                {/* VAT */}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">VAT ({costBreakdown.vatRate}%)</span>
                  <span>{formatCurrency(costBreakdown.vatAmount)}</span>
                </div>
                
                {/* Service Fee */}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phí dịch vụ ({costBreakdown.serviceFeeRate}%)</span>
                  <span>{formatCurrency(costBreakdown.serviceFeeAmount)}</span>
                </div>
                
                <Separator />
                
                {/* Total */}
                <div className="flex justify-between font-bold">
                  <span>TỔNG CỘNG</span>
                  <span>{formatCurrency(costBreakdown.totalAmount)}</span>
                </div>
                
                {/* Payments */}
                {costBreakdown.depositAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Tiền đặt cọc</span>
                    <span>-{formatCurrency(costBreakdown.depositAmount)}</span>
                  </div>
                )}
                
                {costBreakdown.amountPaid > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Đã thanh toán</span>
                    <span>-{formatCurrency(costBreakdown.amountPaid)}</span>
                  </div>
                )}
                
                <Separator />
                
                {/* Remaining */}
                <div className={cn(
                  "flex justify-between font-bold text-lg",
                  hasOutstandingBalance ? "text-red-600" : "text-green-600"
                )}>
                  <span>CÒN LẠI</span>
                  <span>{formatCurrency(costBreakdown.remainingAmount)}</span>
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
                onClick={onConfirmCheckout}
                disabled={isLoading}
              >
                Cho trả phòng (nợ {formatCurrency(costBreakdown.remainingAmount)})
              </Button>
              <Button
                onClick={onPayAndCheckout}
                disabled={isLoading}
                className="gap-2"
              >
                <CreditCard className="h-4 w-4" />
                Thu tiền & Trả phòng
              </Button>
            </>
          ) : (
            <Button onClick={onConfirmCheckout} disabled={isLoading}>
              Xác nhận Check-out
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
