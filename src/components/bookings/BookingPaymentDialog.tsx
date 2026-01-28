import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Banknote, CreditCard, Maximize2, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatVNCurrency } from '@/lib/pricing';
import { BankQRCode } from '@/components/payment/BankQRCode';
import { MobilePaymentQRDisplay } from '@/components/payment/MobilePaymentQRDisplay';
import { useBankPaymentSettings } from '@/hooks/useBankPaymentSettings';
import {
  useCreateBookingPayment,
  useUpdateBookingAmountPaid,
  useConfirmBookingPayment,
  generatePaymentReference,
  BookingPayment,
} from '@/hooks/useBookingPayments';
import { cn } from '@/lib/utils';

export interface BookingPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: {
    id: string;
    guest_name: string;
    room_number: string;
    total_amount: number;
    amount_paid: number;
    tenant_id: string;
    hotel_id: string;
  };
  onPaymentComplete?: () => void;
}

type PaymentMethod = 'cash' | 'bank_transfer';
type Step = 'select' | 'qr' | 'success';

export function BookingPaymentDialog({
  open,
  onOpenChange,
  booking,
  onPaymentComplete,
}: BookingPaymentDialogProps) {
  const remainingAmount = booking.total_amount - booking.amount_paid;
  
  const [step, setStep] = useState<Step>('select');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [amount, setAmount] = useState(remainingAmount.toString());
  const [showMobileQR, setShowMobileQR] = useState(false);
  const [createdPayment, setCreatedPayment] = useState<BookingPayment | null>(null);

  const { data: bankSettings } = useBankPaymentSettings();
  const createPayment = useCreateBookingPayment();
  const updateBookingAmount = useUpdateBookingAmountPaid();
  const confirmPayment = useConfirmBookingPayment();

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setStep('select');
      setPaymentMethod('cash');
      setAmount(remainingAmount.toString());
      setCreatedPayment(null);
    }
  }, [open, remainingAmount]);

  const parsedAmount = parseFloat(amount.replace(/[^0-9]/g, '')) || 0;
  const isValidAmount = parsedAmount > 0 && parsedAmount <= remainingAmount;

  const handleAmountChange = (value: string) => {
    // Only allow numbers
    const numericValue = value.replace(/[^0-9]/g, '');
    setAmount(numericValue);
  };

  const handleCashPayment = async () => {
    if (!isValidAmount) {
      toast.error('Số tiền không hợp lệ');
      return;
    }

    try {
      // Create payment record
      await createPayment.mutateAsync({
        tenant_id: booking.tenant_id,
        hotel_id: booking.hotel_id,
        booking_id: booking.id,
        amount: parsedAmount,
        payment_method: 'cash',
        metadata: {
          guest_name: booking.guest_name,
          room_number: booking.room_number,
        },
      });

      // Update booking amount_paid
      await updateBookingAmount.mutateAsync({
        bookingId: booking.id,
        amountToAdd: parsedAmount,
        totalAmount: booking.total_amount,
      });

      setStep('success');
      toast.success(`Đã nhận ${formatVNCurrency(parsedAmount)} tiền mặt`);
      
      setTimeout(() => {
        onOpenChange(false);
        onPaymentComplete?.();
      }, 1500);
    } catch (error) {
      console.error('Cash payment error:', error);
      toast.error('Không thể xử lý thanh toán');
    }
  };

  const handleBankTransfer = async () => {
    if (!isValidAmount) {
      toast.error('Số tiền không hợp lệ');
      return;
    }

    if (!bankSettings) {
      toast.error('Chưa cấu hình tài khoản ngân hàng');
      return;
    }

    try {
      const reference = generatePaymentReference(booking.room_number);

      const payment = await createPayment.mutateAsync({
        tenant_id: booking.tenant_id,
        hotel_id: booking.hotel_id,
        booking_id: booking.id,
        amount: parsedAmount,
        payment_method: 'bank_transfer',
        transaction_reference: reference,
        metadata: {
          guest_name: booking.guest_name,
          room_number: booking.room_number,
        },
      });

      setCreatedPayment(payment);
      setStep('qr');
    } catch (error) {
      console.error('Bank transfer error:', error);
      toast.error('Không thể tạo mã thanh toán');
    }
  };

  const handleManualConfirm = async () => {
    if (!createdPayment) return;

    try {
      await confirmPayment.mutateAsync(createdPayment.id);
      
      await updateBookingAmount.mutateAsync({
        bookingId: booking.id,
        amountToAdd: parsedAmount,
        totalAmount: booking.total_amount,
      });

      setStep('success');
      
      setTimeout(() => {
        onOpenChange(false);
        onPaymentComplete?.();
      }, 1500);
    } catch (error) {
      console.error('Manual confirm error:', error);
      toast.error('Không thể xác nhận thanh toán');
    }
  };

  const isProcessing = createPayment.isPending || updateBookingAmount.isPending || confirmPayment.isPending;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {step === 'select' && 'Thu tiền phòng'}
              {step === 'qr' && 'Quét mã thanh toán'}
              {step === 'success' && 'Thanh toán thành công'}
            </DialogTitle>
          </DialogHeader>

          {/* Step: Select payment method */}
          {step === 'select' && (
            <div className="space-y-4">
              {/* Booking Info */}
              <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Phòng</span>
                  <span className="font-medium">{booking.room_number}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Khách</span>
                  <span className="font-medium">{booking.guest_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tổng tiền</span>
                  <span className="font-medium">{formatVNCurrency(booking.total_amount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Đã thanh toán</span>
                  <span className="font-medium text-green-600">{formatVNCurrency(booking.amount_paid)}</span>
                </div>
                <div className="flex justify-between text-sm border-t pt-1 mt-1">
                  <span className="text-muted-foreground font-medium">Còn lại</span>
                  <span className="font-semibold text-primary">{formatVNCurrency(remainingAmount)}</span>
                </div>
              </div>

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
                    htmlFor="cash"
                    className={cn(
                      'flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-colors',
                      paymentMethod === 'cash'
                        ? 'border-primary bg-primary/5'
                        : 'border-muted hover:border-muted-foreground/30'
                    )}
                  >
                    <RadioGroupItem value="cash" id="cash" className="sr-only" />
                    <Banknote className={cn(
                      'h-6 w-6',
                      paymentMethod === 'cash' ? 'text-primary' : 'text-muted-foreground'
                    )} />
                    <span className={cn(
                      'text-sm font-medium',
                      paymentMethod === 'cash' ? 'text-primary' : ''
                    )}>
                      Tiền mặt
                    </span>
                  </Label>

                  <Label
                    htmlFor="bank_transfer"
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
                      id="bank_transfer"
                      className="sr-only"
                      disabled={!bankSettings}
                    />
                    <CreditCard className={cn(
                      'h-6 w-6',
                      paymentMethod === 'bank_transfer' ? 'text-primary' : 'text-muted-foreground'
                    )} />
                    <span className={cn(
                      'text-sm font-medium',
                      paymentMethod === 'bank_transfer' ? 'text-primary' : ''
                    )}>
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
            </div>
          )}

          {/* Step: QR Code */}
          {step === 'qr' && bankSettings && createdPayment && (
            <div className="space-y-4">
              <BankQRCode
                bankCode={bankSettings.bank_code}
                bankName={bankSettings.bank_name}
                accountNumber={bankSettings.account_number}
                accountHolder={bankSettings.account_holder}
                amount={parsedAmount}
                paymentContent={createdPayment.transaction_reference || ''}
              />

              {/* Mobile QR Button */}
              <Button
                variant="outline"
                className="w-full"
                type="button"
                onClick={() => setShowMobileQR(true)}
              >
                <Maximize2 className="h-4 w-4 mr-2" />
                Mở QR toàn màn hình
              </Button>

              {/* Manual Confirm */}
              <Button
                className="w-full"
                onClick={handleManualConfirm}
                disabled={isProcessing}
              >
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
                <p className="font-semibold text-lg">Thanh toán thành công!</p>
                <p className="text-muted-foreground">
                  Đã nhận {formatVNCurrency(parsedAmount)}
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
            guestName: booking.guest_name,
            roomNumber: booking.room_number,
          }}
        />
      )}
    </>
  );
}
