import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import {
  Banknote,
  CreditCard,
  Maximize2,
  CheckCircle,
  Loader2,
  Smartphone,
  Users,
  DoorOpen,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatVNCurrency } from '@/lib/pricing'
import { BankQRCode } from '@/components/payment/BankQRCode'
import { MobilePaymentQRDisplay } from '@/components/payment/MobilePaymentQRDisplay'
import { useBankPaymentSettings } from '@/hooks/useBankPaymentSettings'
import {
  useCreateBookingPayment,
  generatePaymentReference,
  BookingPayment,
} from '@/hooks/useBookingPayments'
import { useGroupBooking, GroupBookingRoom } from '@/hooks/useGroupBooking'
import { cn } from '@/lib/utils'
import { supabase } from '@/integrations/supabase/client'

export interface RoomCostForPayment {
  bookingId: string
  calculatedTotal: number // Grand total including overdue, VAT, fees
}

export interface GroupPaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bookingGroupId: string
  tenantId: string
  hotelId: string
  onPaymentComplete?: () => void
  calculatedRemaining?: number
  calculatedTotal?: number
  roomCostsByBooking?: RoomCostForPayment[]
}

type PaymentMethod = 'cash' | 'bank_transfer'
type Step = 'select' | 'qr' | 'success'

export function GroupPaymentDialog({
  open,
  onOpenChange,
  bookingGroupId,
  tenantId,
  hotelId,
  onPaymentComplete,
  calculatedRemaining,
  calculatedTotal,
  roomCostsByBooking,
}: GroupPaymentDialogProps) {
  const { data: groupData, isLoading: isLoadingGroup } = useGroupBooking(bookingGroupId)
  
  const [step, setStep] = useState<Step>('select')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [amount, setAmount] = useState('')
  const [showMobileQR, setShowMobileQR] = useState(false)
  const [createdPayment, setCreatedPayment] = useState<BookingPayment | null>(null)
  const [isSendingNotification, setIsSendingNotification] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const { data: bankSettings } = useBankPaymentSettings(hotelId)
  const createPayment = useCreateBookingPayment()

  // Reset state when dialog opens
  useEffect(() => {
    if (open && groupData) {
      setStep('select')
      setPaymentMethod('cash')
      const initAmount = calculatedRemaining ?? groupData.remainingAmount
      setAmount(Math.max(0, initAmount).toString())
      setCreatedPayment(null)
    }
  }, [open, calculatedRemaining, groupData?.remainingAmount])

  // Realtime subscription for bank transfer auto-confirmation
  useEffect(() => {
    if (step !== 'qr' || !createdPayment) return

    const channel = supabase
      .channel(`group-payment-${createdPayment.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'booking_payments',
          filter: `id=eq.${createdPayment.id}`,
        },
        async (payload) => {
          const newData = payload.new as any
          if (newData.payment_status === 'completed') {
            // Webhook already distributed payment via atomic RPC - just update UI
            setStep('success')
            toast.success('Thanh toán đã được xác nhận tự động!')
            setTimeout(() => {
              onOpenChange(false)
              onPaymentComplete?.()
            }, 1500)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [step, createdPayment?.id])

  const remainingAmount = calculatedRemaining ?? (groupData?.remainingAmount || 0)
  const parsedAmount = parseFloat(amount.replace(/[^0-9]/g, '')) || 0
  const isValidAmount = parsedAmount > 0

  const handleAmountChange = (value: string) => {
    const numericValue = value.replace(/[^0-9]/g, '')
    setAmount(numericValue)
  }

  const setQuickAmount = (percentage: number) => {
    const quickAmount = Math.round(remainingAmount * percentage)
    setAmount(quickAmount.toString())
  }

  /**
   * Distribute payment amount across bookings
   * Priority: Checked-out rooms first, then by remaining amount
   */
  const distributePayment = async (paymentAmount: number, bookings: GroupBookingRoom[]) => {
    // Build a map of calculated totals per booking
    const calcTotalMap = new Map<string, number>()
    if (roomCostsByBooking) {
      for (const rc of roomCostsByBooking) {
        calcTotalMap.set(rc.bookingId, rc.calculatedTotal)
      }
    }

    // Sort: checked_out first, then by remaining amount descending
    const sortedBookings = [...bookings].sort((a, b) => {
      if (a.status === 'checked_out' && b.status !== 'checked_out') return -1
      if (b.status === 'checked_out' && a.status !== 'checked_out') return 1
      const aTotal = calcTotalMap.get(a.id) ?? (a.total_amount || 0)
      const bTotal = calcTotalMap.get(b.id) ?? (b.total_amount || 0)
      const aRemaining = aTotal - (a.amount_paid || 0)
      const bRemaining = bTotal - (b.amount_paid || 0)
      return bRemaining - aRemaining
    })

    let remaining = paymentAmount

    for (const booking of sortedBookings) {
      if (remaining <= 0) break

      // Use calculated total (includes overdue, VAT, fees) instead of DB total_amount
      const effectiveTotal = calcTotalMap.get(booking.id) ?? (booking.total_amount || 0)
      const bookingOwed = effectiveTotal - (booking.amount_paid || 0)
      if (bookingOwed <= 0) continue

      const payForThis = Math.min(remaining, bookingOwed)

      // Use atomic RPC instead of direct UPDATE to prevent race conditions
      await supabase.rpc('update_booking_amount_paid', {
        p_booking_id: booking.id,
        p_amount_to_add: payForThis,
        p_total_amount: effectiveTotal,
      })

      remaining -= payForThis
    }
  }

  const handleCashPayment = async (overrideAmount?: number) => {
    const finalAmount = overrideAmount ?? parsedAmount
    if (finalAmount <= 0 || !groupData) {
      toast.error('Số tiền không hợp lệ')
      return
    }

    setIsProcessing(true)
    try {
      // Create group payment record (using first booking as reference)
      const firstBooking = groupData.bookings[0]
      await createPayment.mutateAsync({
        tenant_id: tenantId,
        hotel_id: hotelId,
        booking_id: firstBooking.id,
        amount: finalAmount,
        payment_method: 'cash',
        metadata: {
          is_group_payment: true,
          booking_group_id: bookingGroupId,
          booking_ids: groupData.bookings.map(b => b.id),
          guest_name: groupData.guestName,
          room_numbers: groupData.bookings.map(b => b.room?.room_number).join(', '),
        },
      })

      // Distribute payment to individual bookings
      await distributePayment(finalAmount, groupData.bookings)

      setStep('success')
      toast.success(`Đã nhận ${formatVNCurrency(finalAmount)} tiền mặt cho ${groupData.roomCount} phòng`)

      setTimeout(() => {
        onOpenChange(false)
        onPaymentComplete?.()
      }, 1500)
    } catch (error) {
      console.error('Group cash payment error:', error)
      toast.error('Không thể xử lý thanh toán')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleBankTransfer = async (overrideAmount?: number) => {
    const finalAmount = overrideAmount ?? parsedAmount
    if (finalAmount <= 0 || !groupData) {
      toast.error('Số tiền không hợp lệ')
      return
    }

    if (!bankSettings) {
      toast.error('Chưa cấu hình tài khoản ngân hàng')
      return
    }

    setIsProcessing(true)
    try {
      const firstBooking = groupData.bookings[0]
      const reference = generatePaymentReference(
        groupData.bookings.map(b => b.room?.room_number).join('-')
      )

      const payment = await createPayment.mutateAsync({
        tenant_id: tenantId,
        hotel_id: hotelId,
        booking_id: firstBooking.id,
        amount: finalAmount,
        payment_method: 'bank_transfer',
        transaction_reference: reference,
        metadata: {
          is_group_payment: true,
          booking_group_id: bookingGroupId,
          booking_ids: groupData.bookings.map(b => b.id),
          guest_name: groupData.guestName,
          room_numbers: groupData.bookings.map(b => b.room?.room_number).join(', '),
        },
      })

      setCreatedPayment(payment)
      setStep('qr')
    } catch (error) {
      console.error('Group bank transfer error:', error)
      toast.error('Không thể tạo mã thanh toán')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleManualConfirm = async () => {
    if (!createdPayment || !groupData) return

    setIsProcessing(true)
    try {
      // Confirm payment
      await supabase
        .from('booking_payments')
        .update({
          payment_status: 'completed',
          paid_at: new Date().toISOString(),
        })
        .eq('id', createdPayment.id)

      // Distribute payment
      await distributePayment(createdPayment.amount, groupData.bookings)

      setStep('success')
      toast.success('Đã xác nhận thanh toán nhóm')

      setTimeout(() => {
        onOpenChange(false)
        onPaymentComplete?.()
      }, 1500)
    } catch (error) {
      console.error('Manual confirm error:', error)
      toast.error('Không thể xác nhận thanh toán')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSendQRNotification = async () => {
    if (!createdPayment || !groupData) return

    setIsSendingNotification(true)
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) {
        toast.error('Vui lòng đăng nhập lại')
        return
      }

      const paymentPath = `/payment-qr/${createdPayment.id}`
      const roomNumbers = groupData.bookings.map(b => b.room?.room_number).join(', ')

      const { data, error: pushError } = await supabase.functions.invoke('send-push-notification', {
        body: {
          user_id: userData.user.id,
          skip_auth_check: true,
          title: `QR Thanh toán nhóm ${groupData.roomCount} phòng`,
          body: `Phòng: ${roomNumbers} - Số tiền: ${formatVNCurrency(parsedAmount)}`,
          tag: `payment-qr-${createdPayment.id}`,
          action_url: paymentPath,
          notification_type: 'payment_qr',
          data: {
            url: paymentPath,
            type: 'payment_qr',
            paymentId: createdPayment.id,
            roomNumber: roomNumbers,
          },
        },
      })

      if (pushError) throw pushError

      if (data?.sent === 0) {
        toast.warning('Chưa có thiết bị nào đăng ký nhận thông báo')
      } else {
        toast.success(`Đã gửi QR đến ${data?.sent || 1} thiết bị`)
      }
    } catch (error) {
      console.error('Send notification error:', error)
      toast.error('Không thể gửi thông báo')
    } finally {
      setIsSendingNotification(false)
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'checked_in':
        return 'Đang ở'
      case 'checked_out':
        return 'Đã trả'
      case 'confirmed':
        return 'Đã đặt'
      default:
        return status
    }
  }

  const getPaymentPercentage = (booking: GroupBookingRoom) => {
    const total = booking.total_amount || 0
    const paid = booking.amount_paid || 0
    if (total === 0) return 100
    return Math.min(100, Math.round((paid / total) * 100))
  }

  const formatCompactCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}tr`
    }
    if (amount >= 1000) {
      return `${Math.round(amount / 1000)}k`
    }
    return amount.toString()
  }

  if (isLoadingGroup) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Thanh toán nhóm</DialogTitle>
            <DialogDescription>Đang tải thông tin...</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (!groupData) {
    return null
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-hidden flex flex-col p-0">
          {/* Header */}
          <DialogHeader className="px-4 pt-4 pb-2">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" />
              {step === 'select' && 'Thanh toán nhóm'}
              {step === 'qr' && 'Quét mã QR'}
              {step === 'success' && 'Thành công'}
            </DialogTitle>
            <DialogDescription>
              {groupData.guestName} • {groupData.roomCount} phòng
            </DialogDescription>
          </DialogHeader>

          {/* Step: Select payment */}
          {step === 'select' && (
            <div className="flex flex-col gap-3 px-4 pb-4 overflow-hidden">
              {/* Compact Room List with Progress Bars */}
              <ScrollArea className="max-h-[200px]">
                <div className="space-y-2">
                  {groupData.bookings.map((booking) => {
                    // Use calculated total from roomCostsByBooking if available (accounts for overdue)
                    const costEntry = roomCostsByBooking?.find(c => c.bookingId === booking.id)
                    const displayTotal = costEntry?.calculatedTotal || booking.total_amount || 0
                    const displayPaid = (booking.amount_paid || 0) + (booking.deposit_amount || 0)
                    const percentage = displayTotal > 0 ? Math.min(100, Math.round((displayPaid / displayTotal) * 100)) : 0
                    const remaining = displayTotal - displayPaid
                    const isPaid = remaining <= 0
                    
                    return (
                      <div
                        key={booking.id}
                        className={cn(
                          "border rounded-lg p-2.5 space-y-1.5",
                          isPaid && "bg-green-50 border-green-200 dark:bg-green-950/20"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <DoorOpen className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="font-medium text-sm">
                              {booking.room?.room_number}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {booking.room?.room_type}
                            </span>
                          </div>
                          <span className={cn(
                            "text-xs px-1.5 py-0.5 rounded",
                            isPaid ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"
                          )}>
                            {isPaid ? '✓ Đã TT' : getStatusLabel(booking.status)}
                          </span>
                        </div>
                        
                        {/* Progress bar */}
                        <div className="flex items-center gap-2">
                          <Progress 
                            value={percentage} 
                            className={cn(
                              "h-1.5 flex-1",
                              isPaid && "[&>div]:bg-green-500"
                            )}
                          />
                          <span className="text-xs font-mono text-muted-foreground w-8 text-right">
                            {percentage}%
                          </span>
                        </div>
                        
                        {/* Amount info */}
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">
                            {formatCompactCurrency(displayPaid)} / {formatCompactCurrency(displayTotal)}
                          </span>
                          {!isPaid && remaining > 0 && (
                            <span className="text-amber-600 font-medium">
                              Còn {formatCompactCurrency(remaining)}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>

              <Separator />

              {/* Totals Summary - Compact - Use calculated values */}
              <div className="bg-muted/50 rounded-lg p-3 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tổng tính toán ({groupData.roomCount} phòng)</span>
                  <span className="font-mono">{formatVNCurrency(calculatedTotal ?? groupData.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Đã thanh toán</span>
                  <span className="font-mono text-green-600">
                    -{formatVNCurrency((calculatedTotal ?? groupData.totalAmount) - remainingAmount)}
                  </span>
                </div>
                <Separator className="my-1.5" />
                <div className="flex justify-between font-medium">
                  <span>CÒN LẠI</span>
                  <span className="font-mono text-primary text-lg">
                    {formatVNCurrency(remainingAmount)}
                  </span>
                </div>
              </div>

              {remainingAmount > 0 ? (
                <>
                  {/* Quick Pay Full Button */}
                  <Button
                    className="w-full h-11"
                    disabled={isProcessing}
                    onClick={() => {
                      setAmount(remainingAmount.toString())
                      if (paymentMethod === 'cash') {
                        handleCashPayment(remainingAmount)
                      } else {
                        handleBankTransfer(remainingAmount)
                      }
                    }}
                  >
                    {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Thanh toán đủ {formatVNCurrency(remainingAmount)}
                  </Button>

                  {/* Or Custom Amount */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="h-px flex-1 bg-border" />
                      <span className="text-xs text-muted-foreground">Hoặc nhập số tiền</span>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                    
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={amount ? parseInt(amount).toLocaleString('vi-VN') : ''}
                        onChange={(e) => handleAmountChange(e.target.value)}
                        placeholder="Số tiền"
                        className="flex-1 text-right font-mono h-9"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 px-3"
                        onClick={() => setQuickAmount(0.5)}
                      >
                        50%
                      </Button>
                    </div>
                    {parsedAmount > remainingAmount && (
                      <p className="text-xs text-red-500">Vượt quá số còn lại</p>
                    )}
                  </div>

                  {/* Payment Method */}
                  <RadioGroup
                    value={paymentMethod}
                    onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
                    className="grid grid-cols-2 gap-2"
                  >
                    <Label
                      htmlFor="group-cash"
                      className={cn(
                        'flex items-center justify-center gap-2 py-2.5 rounded-lg border cursor-pointer transition-colors',
                        paymentMethod === 'cash'
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-muted hover:border-muted-foreground/30'
                      )}
                    >
                      <RadioGroupItem value="cash" id="group-cash" className="sr-only" />
                      <Banknote className="h-4 w-4" />
                      <span className="text-sm font-medium">Tiền mặt</span>
                    </Label>

                    <Label
                      htmlFor="group-bank"
                      className={cn(
                        'flex items-center justify-center gap-2 py-2.5 rounded-lg border cursor-pointer transition-colors',
                        paymentMethod === 'bank_transfer'
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-muted hover:border-muted-foreground/30',
                        !bankSettings && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <RadioGroupItem
                        value="bank_transfer"
                        id="group-bank"
                        className="sr-only"
                        disabled={!bankSettings}
                      />
                      <CreditCard className="h-4 w-4" />
                      <span className="text-sm font-medium">Chuyển khoản</span>
                    </Label>
                  </RadioGroup>

                  {/* Custom Amount Action Button */}
                  {parsedAmount > 0 && parsedAmount < remainingAmount && (
                    <Button
                      variant="outline"
                      className="w-full"
                      disabled={!isValidAmount || isProcessing}
                      onClick={() => paymentMethod === 'cash' ? handleCashPayment() : handleBankTransfer()}
                    >
                      {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      {paymentMethod === 'cash' ? 'Xác nhận tiền mặt' : 'Tạo mã QR'}
                      {' '}({formatVNCurrency(parsedAmount)})
                    </Button>
                  )}
                </>
              ) : (
                <div className="py-4 text-center">
                  <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-2" />
                  <p className="text-green-600 font-medium">
                    Nhóm đã thanh toán đầy đủ
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step: QR Code */}
          {step === 'qr' && bankSettings && createdPayment && (
            <div className="space-y-3 px-4 pb-4">
              <div className="bg-muted/50 rounded-lg p-2 text-center text-sm">
                <span className="text-muted-foreground">Phòng: </span>
                <span className="font-medium">
                  {groupData.bookings.map(b => b.room?.room_number).join(', ')}
                </span>
              </div>

              <BankQRCode
                bankCode={bankSettings.bank_code}
                bankName={bankSettings.bank_name}
                accountNumber={bankSettings.account_number}
                accountHolder={bankSettings.account_holder}
                amount={parsedAmount}
                paymentContent={createdPayment.transaction_reference || ''}
              />

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setShowMobileQR(true)}
                >
                  <Maximize2 className="h-4 w-4 mr-1.5" />
                  Toàn màn hình
                </Button>

                <Button
                  variant="outline"
                  type="button"
                  onClick={handleSendQRNotification}
                  disabled={isSendingNotification}
                >
                  {isSendingNotification ? (
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  ) : (
                    <Smartphone className="h-4 w-4 mr-1.5" />
                  )}
                  Gửi QR
                </Button>
              </div>

              <Button className="w-full" onClick={handleManualConfirm} disabled={isProcessing}>
                {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Đã nhận được tiền
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Tự động xác nhận khi nhận chuyển khoản
              </p>
            </div>
          )}

          {/* Step: Success */}
          {step === 'success' && (
            <div className="py-8 px-4 flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-7 w-7 text-green-600" />
              </div>
              <div className="text-center">
                <p className="font-semibold">Thanh toán thành công!</p>
                <p className="text-sm text-muted-foreground">
                  {formatVNCurrency(parsedAmount)} cho {groupData.roomCount} phòng
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Mobile QR Fullscreen */}
      {bankSettings && createdPayment && (
        <MobilePaymentQRDisplay
          open={showMobileQR}
          onClose={() => setShowMobileQR(false)}
          qrData={{
            bankCode: bankSettings.bank_code,
            accountNumber: bankSettings.account_number,
            accountHolder: bankSettings.account_holder,
            amount: parsedAmount,
            paymentContent: createdPayment.transaction_reference || '',
          }}
          bookingInfo={{
            guestName: groupData.guestName,
            roomNumber: groupData.bookings.map(b => b.room?.room_number).join(', '),
          }}
        />
      )}
    </>
  )
}
