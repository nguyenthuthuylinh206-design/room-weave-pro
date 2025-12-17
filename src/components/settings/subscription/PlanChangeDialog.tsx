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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTenantSubscription, useUpdateTenantSubscription } from '@/hooks/useSubscription';
import { Info, Loader2 } from 'lucide-react';
import {
  PRICE_PER_ROOM_DAILY,
  DURATION_OPTIONS,
  calculateSubscriptionPrice,
  formatVNCurrency,
  calculateEndDate,
} from '@/lib/pricing';

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
  const updateSubscription = useUpdateTenantSubscription();

  const [rooms, setRooms] = useState(initialRooms);
  const [selectedDuration, setSelectedDuration] = useState(initialDuration);

  // Update state when initial values change
  useEffect(() => {
    setRooms(initialRooms);
    setSelectedDuration(initialDuration);
  }, [initialRooms, initialDuration]);

  const pricing = useMemo(
    () => calculateSubscriptionPrice(rooms, selectedDuration),
    [rooms, selectedDuration]
  );

  const currentRooms = subscription?.registered_rooms || 0;
  const endDate = calculateEndDate(new Date(), selectedDuration);

  const handleConfirm = async () => {
    await updateSubscription.mutateAsync({
      rooms,
      durationDays: selectedDuration,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Đăng ký / Gia hạn gói dịch vụ</DialogTitle>
          <DialogDescription>
            Điều chỉnh số phòng và thời hạn đăng ký theo nhu cầu
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Current Info */}
          {currentRooms > 0 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Đăng ký hiện tại: <strong>{currentRooms} phòng</strong>
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

          {/* Room Input */}
          <div className="space-y-2">
            <Label htmlFor="dialog-rooms">Số phòng đăng ký</Label>
            <div className="flex items-center gap-3">
              <Input
                id="dialog-rooms"
                type="number"
                min={1}
                value={rooms}
                onChange={(e) => setRooms(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-32"
              />
              <span className="text-muted-foreground">phòng</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Giá: {formatVNCurrency(PRICE_PER_ROOM_DAILY)}/phòng/ngày
            </p>
          </div>

          {/* Duration Selection */}
          <div className="space-y-3">
            <Label>Thời hạn đăng ký</Label>
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
                {rooms} × {formatVNCurrency(PRICE_PER_ROOM_DAILY)} × {pricing.days} ngày ={' '}
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
              <span>Hết hạn vào</span>
              <span>{endDate.toLocaleDateString('vi-VN')}</span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button onClick={handleConfirm} disabled={updateSubscription.isPending}>
            {updateSubscription.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Xác nhận đăng ký
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
