import { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTenantSubscription, useUpdateTenantSubscription } from '@/hooks/useSubscription';
import { useBankPaymentSettings } from '@/hooks/useBankPaymentSettings';
import { Info, Loader2, Package, CreditCard } from 'lucide-react';
import {
  PRICE_PER_ROOM_DAILY,
  DURATION_OPTIONS,
  calculateSubscriptionPrice,
  formatVNCurrency,
  calculateEndDate,
} from '@/lib/pricing';
import { BankTransferPaymentDialog } from '@/components/payment/BankTransferPaymentDialog';

interface PlanChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialRooms?: number;
  initialDuration?: number;
}

export function PlanChangeDialog({
  open,
  onOpenChange,
  initialRooms = 50,
  initialDuration = 365,
}: PlanChangeDialogProps) {
  const { data: subscription } = useTenantSubscription();
  const { data: bankSettings } = useBankPaymentSettings();
  const updateSubscription = useUpdateTenantSubscription();

  const [selectedDuration, setSelectedDuration] = useState(initialDuration);
  const [showBankPayment, setShowBankPayment] = useState(false);

  // Use registered rooms from subscription (read-only)
  const registeredRooms = subscription?.registered_rooms || initialRooms;

  // Update duration when initial value changes
  useEffect(() => {
    setSelectedDuration(initialDuration);
  }, [initialDuration]);

  const pricing = useMemo(
    () => calculateSubscriptionPrice(registeredRooms, selectedDuration),
    [registeredRooms, selectedDuration]
  );

  const currentEndDate = subscription?.subscription_end_date 
    ? new Date(subscription.subscription_end_date) 
    : new Date();
  const newEndDate = calculateEndDate(currentEndDate, selectedDuration);

  const handleConfirm = async () => {
    // If bank payment is available, show payment dialog and auto-create invoice
    if (bankSettings) {
      setShowBankPayment(true);
    } else {
      // Direct confirm without bank payment
      await updateSubscription.mutateAsync({
        rooms: registeredRooms,
        durationDays: selectedDuration,
      });
      onOpenChange(false);
    }
  };

  const handlePaymentDialogClose = (isOpen: boolean) => {
    setShowBankPayment(isOpen);
    if (!isOpen) {
      onOpenChange(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gia hạn gói dịch vụ</DialogTitle>
            <DialogDescription>
              Chọn thời hạn gia hạn theo nhu cầu
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {/* Current Info */}
            {registeredRooms > 0 && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Đăng ký hiện tại: <strong>{registeredRooms} phòng</strong>
                  {subscription?.subscription_end_date && (
                    <>
                      {' '}• Hết hạn:{' '}
                      <strong>
                        {new Date(subscription.subscription_end_date).toLocaleDateString('vi-VN')}
                      </strong>
                    </>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Room Count - Read Only */}
            <div className="space-y-2">
              <Label>Số phòng gia hạn</Label>
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border">
                <Package className="h-5 w-5 text-muted-foreground" />
                <span className="font-semibold text-lg">{registeredRooms} phòng</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Cần mua thêm phòng? Sử dụng nút "Mua thêm phòng" ở trang gói dịch vụ.
              </p>
            </div>

            {/* Duration Selection */}
            <div className="space-y-3">
              <Label>Thời hạn gia hạn</Label>
              <RadioGroup
                value={selectedDuration.toString()}
                onValueChange={(v) => setSelectedDuration(parseInt(v))}
                className="grid grid-cols-2 gap-2"
              >
                {DURATION_OPTIONS.map((option) => (
                  <div key={option.days} className="relative">
                    <RadioGroupItem
                      value={option.days.toString()}
                      id={`dialog-duration-${option.days}`}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={`dialog-duration-${option.days}`}
                      className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-colors"
                    >
                      <span className="font-medium">{option.label}</span>
                      {option.discount > 0 && (
                        <Badge variant="secondary" className="mt-1 text-xs">
                          -{option.discount}%
                        </Badge>
                      )}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <Separator />

            {/* Price Summary */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Giá gốc</span>
                <span>
                  {registeredRooms} × {formatVNCurrency(PRICE_PER_ROOM_DAILY)} × {pricing.days} ngày ={' '}
                  {formatVNCurrency(pricing.basePrice)}
                </span>
              </div>
              {pricing.discountPercent > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Giảm giá ({pricing.discountPercent}%)</span>
                  <span>- {formatVNCurrency(pricing.discount)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-semibold text-base">
                <span>Tổng thanh toán</span>
                <span className="text-primary">{formatVNCurrency(pricing.finalPrice)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Hạn mới</span>
                <span>{newEndDate.toLocaleDateString('vi-VN')}</span>
              </div>
            </div>

            {/* Payment Method Hint */}
            {bankSettings && (
              <Alert className="border-primary/30 bg-primary/5">
                <CreditCard className="h-4 w-4 text-primary" />
                <AlertDescription>
                  Thanh toán qua chuyển khoản ngân hàng với QR Code
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button onClick={handleConfirm} disabled={updateSubscription.isPending}>
              {updateSubscription.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {bankSettings ? 'Tiếp tục thanh toán' : 'Xác nhận gia hạn'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bank Transfer Payment Dialog */}
      <BankTransferPaymentDialog
        open={showBankPayment}
        onOpenChange={handlePaymentDialogClose}
        amount={pricing.finalPrice}
        description={`Gia hạn gói dịch vụ ${registeredRooms} phòng - ${selectedDuration} ngày`}
        autoCreateInvoice={true}
        metadata={{
          type: 'renewal',
          rooms: registeredRooms,
          duration_days: selectedDuration,
        }}
      />
    </>
  );
}
