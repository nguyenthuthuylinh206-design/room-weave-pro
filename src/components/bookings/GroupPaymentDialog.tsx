import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
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

export interface GroupPaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bookingGroupId: string
  tenantId: string
  hotelId: string
  onPaymentComplete?: () => void
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
      setAmount(groupData.remainingAmount.toString())
      setCreatedPayment(null)
    }
  }, [open, groupData?.remainingAmount])

  const remainingAmount = groupData?.remainingAmount || 0
  const parsedAmount = parseFloat(amount.replace(/[^0-9]/g, '')) || 0
  const isValidAmount = parsedAmount > 0 && parsedAmount <= remainingAmount

  const handleAmountChange = (value: string) => {
    const numericValue = value.replace(/[^0-9]/g, '')
    setAmount(numericValue)
  }

  /**
   * Distribute payment amount across bookings
   * Priority: Checked-out rooms first, then by remaining amount
   */
  const distributePayment = async (paymentAmount: number, bookings: GroupBookingRoom[]) => {
    // Sort: checked_out first, then by remaining amount descending
    const sortedBookings = [...bookings].sort((a, b) => {
      if (a.status === 'checked_out' && b.status !== 'checked_out') return -1
      if (b.status === 'checked_out' && a.status !== 'checked_out') return 1
      const aRemaining = (a.total_amount || 0) - (a.amount_paid || 0)
      const bRemaining = (b.total_amount || 0) - (b.amount_paid || 0)
      return bRemaining - aRemaining
    })

    let remaining = paymentAmount

    for (const booking of sortedBookings) {
      if (remaining <= 0) break

      const bookingOwed = (booking.total_amount || 0) - (booking.amount_paid || 0)
      if (bookingOwed <= 0) continue

      const payForThis = Math.min(remaining, bookingOwed)
      const newAmountPaid = (booking.amount_paid || 0) + payForThis
      const paymentStatus = newAmountPaid >= (booking.total_amount || 0) ? 'paid' : 'partial'

      await supabase
        .from('room_bookings')
        .update({
          amount_paid: newAmountPaid,
          payment_status: paymentStatus,
          paid_at: paymentStatus === 'paid' ? new Date().toISOString() : null,
        })
        .eq('id', booking.id)

      remaining -= payForThis
    }
  }

  const handleCashPayment = async () => {
    if (!isValidAmount || !groupData) {
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
        amount: parsedAmount,
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
      await distributePayment(parsedAmount, groupData.bookings)

      setStep('success')
      toast.success(`Đã nhận ${formatVNCurrency(parsedAmount)} tiền mặt cho ${groupData.roomCount} phòng`)

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

  const handleBankTransfer = async () => {
    if (!isValidAmount || !groupData) {
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
        amount: parsedAmount,
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
      await distributePayment(parsedAmount, groupData.bookings)

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
        return <Badge className="bg-green-500 text-[10px]">Đang ở</Badge>
      case 'checked_out':
        return <Badge variant="outline" className="text-[10px]">Đã trả</Badge>
      case 'confirmed':
        return <Badge variant="secondary" className="text-[10px]">Đã đặt</Badge>
      default:
        return null
    }
  }

  if (isLoadingGroup) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
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
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {step === 'select' && `Thanh toán nhóm - ${groupData.guestName}`}
              {step === 'qr' && 'Quét mã thanh toán nhóm'}
              {step === 'success' && 'Thanh toán thành công'}
            </DialogTitle>
          </DialogHeader>

          {/* Step: Select payment */}
          {step === 'select' && (
            <div className="flex flex-col gap-4 overflow-hidden">
              {/* Room list */}
              <ScrollArea className="max-h-[280px] pr-4">
                <div className="space-y-3">
                  {groupData.bookings.map((booking) => {
                    const roomRemaining = (booking.total_amount || 0) - (booking.amount_paid || 0)
                    return (
                      <div
                        key={booking.id}
                        className="border rounded-lg p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <DoorOpen className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              Phòng {booking.room?.room_number}
                            </span>
                            <span className="text-xs text-muted-foreground capitalize">
                              {booking.room?.room_type}
                            </span>
                          </div>
                          {getStatusLabel(booking.status)}
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Tổng:</span>
                          <span className="font-mono">
                            {formatVNCurrency(booking.total_amount || 0)}
                          </span>
                        </div>
                        {(booking.amount_paid || 0) > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Đã TT:</span>
                            <span className="font-mono text-green-600">
                              -{formatVNCurrency(booking.amount_paid || 0)}
                            </span>
                          </div>
                        )}
                        {roomRemaining > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Còn:</span>
                            <span className="font-mono text-amber-600">
                              {formatVNCurrency(roomRemaining)}
                            </span>
                          </div>
                        )}
                        {roomRemaining <= 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-green-600 font-medium flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Đã thanh toán đủ
                            </span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>

              <Separator />

              {/* Totals */}
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tổng cộng ({groupData.roomCount} phòng):</span>
                  <span className="font-mono font-medium">
                    {formatVNCurrency(groupData.totalAmount)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Đã thanh toán:</span>
                  <span className="font-mono text-green-600">
                    -{formatVNCurrency(groupData.totalPaid)}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between font-medium">
                  <span>CÒN PHẢI THU:</span>
                  <span className="font-mono text-primary text-lg">
                    {formatVNCurrency(remainingAmount)}
                  </span>
                </div>
              </div>

              {remainingAmount > 0 ? (
                <>
                  {/* Amount Input */}
                  <div className="space-y-2">
                    <Label>Số tiền thu</Label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={amount ? parseInt(amount).toLocaleString('vi-VN') : ''}
                      onChange={(e) => handleAmountChange(e.target.value)}
                      placeholder="Nhập số tiền"
                      className="text-right font-mono text-lg"
                    />
                    {parsedAmount > remainingAmount && (
                      <p className="text-xs text-red-500">Số tiền vượt quá số còn lại</p>
                    )}
                  </div>

                  {/* Payment Method */}
                  <div className="space-y-2">
                    <Label>Phương thức thanh toán</Label>
                    <RadioGroup
                      value={paymentMethod}
                      onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
                      className="grid grid-cols-2 gap-3"
                    >
                      <Label
                        htmlFor="group-cash"
                        className={cn(
                          'flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-colors',
                          paymentMethod === 'cash'
                            ? 'border-primary bg-primary/5'
                            : 'border-muted hover:border-muted-foreground/30'
                        )}
                      >
                        <RadioGroupItem value="cash" id="group-cash" className="sr-only" />
                        <Banknote
                          className={cn(
                            'h-6 w-6',
                            paymentMethod === 'cash' ? 'text-primary' : 'text-muted-foreground'
                          )}
                        />
                        <span
                          className={cn(
                            'text-sm font-medium',
                            paymentMethod === 'cash' ? 'text-primary' : ''
                          )}
                        >
                          Tiền mặt
                        </span>
                      </Label>

                      <Label
                        htmlFor="group-bank"
                        className={cn(
                          'flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-colors',
                          paymentMethod === 'bank_transfer'
                            ? 'border-primary bg-primary/5'
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
                        <CreditCard
                          className={cn(
                            'h-6 w-6',
                            paymentMethod === 'bank_transfer'
                              ? 'text-primary'
                              : 'text-muted-foreground'
                          )}
                        />
                        <span
                          className={cn(
                            'text-sm font-medium',
                            paymentMethod === 'bank_transfer' ? 'text-primary' : ''
                          )}
                        >
                          Chuyển khoản
                        </span>
                      </Label>
                    </RadioGroup>
                    {!bankSettings && (
                      <p className="text-xs text-muted-foreground">
                        Cần cấu hình tài khoản ngân hàng trong Cài đặt → Thanh toán
                      </p>
                    )}
                  </div>

                  {/* Action Button */}
                  <Button
                    className="w-full"
                    disabled={!isValidAmount || isProcessing}
                    onClick={paymentMethod === 'cash' ? handleCashPayment : handleBankTransfer}
                  >
                    {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {paymentMethod === 'cash' ? 'Xác nhận đã nhận tiền' : 'Tạo mã QR thanh toán'}
                  </Button>
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
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-2 text-center text-sm">
                <span className="text-muted-foreground">
                  Thanh toán cho {groupData.roomCount} phòng:{' '}
                </span>
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

              <Button
                variant="outline"
                className="w-full"
                type="button"
                onClick={() => setShowMobileQR(true)}
              >
                <Maximize2 className="h-4 w-4 mr-2" />
                Mở QR toàn màn hình
              </Button>

              <Button
                variant="outline"
                className="w-full"
                type="button"
                onClick={handleSendQRNotification}
                disabled={isSendingNotification}
              >
                {isSendingNotification ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Smartphone className="h-4 w-4 mr-2" />
                )}
                Gửi QR sang điện thoại
              </Button>

              <Button className="w-full" onClick={handleManualConfirm} disabled={isProcessing}>
                {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Đã nhận được tiền
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Hệ thống sẽ tự động xác nhận khi nhận được chuyển khoản
              </p>
            </div>
          )}

          {/* Step: Success */}
          {step === 'success' && (
            <div className="py-8 flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-lg">Thanh toán nhóm thành công!</p>
                <p className="text-muted-foreground">
                  Đã nhận {formatVNCurrency(parsedAmount)} cho {groupData.roomCount} phòng
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
