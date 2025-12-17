import { useState, useMemo } from 'react';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Plus, Calculator, Calendar, Percent, Info } from 'lucide-react';
import { useRoomSubscriptionLimit } from '@/hooks/useRoomSubscriptionLimit';
import { useUpdateTenantSubscription } from '@/hooks/useSubscription';
import { PRICE_PER_ROOM_DAILY, formatVNCurrency } from '@/lib/pricing';

interface AddRoomsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddRoomsDialog({ open, onOpenChange }: AddRoomsDialogProps) {
  const [additionalRooms, setAdditionalRooms] = useState(10);
  const {
    registeredRooms,
    actualRooms,
    remainingDays,
    discountPercent,
  } = useRoomSubscriptionLimit();
  const updateSubscription = useUpdateTenantSubscription();

  // Calculate price for additional rooms
  const pricing = useMemo(() => {
    if (remainingDays <= 0) return null;
    
    const basePrice = additionalRooms * PRICE_PER_ROOM_DAILY * remainingDays;
    const discount = Math.round(basePrice * (discountPercent / 100));
    const finalPrice = basePrice - discount;
    
    return {
      basePrice,
      discount,
      discountPercent,
      finalPrice,
      pricePerRoom: Math.round(finalPrice / additionalRooms),
    };
  }, [additionalRooms, remainingDays, discountPercent]);

  const handleConfirm = async () => {
    if (!pricing) return;
    
    const newTotalRooms = registeredRooms + additionalRooms;
    
    // Update subscription with new room count but keep same duration
    await updateSubscription.mutateAsync({
      rooms: newTotalRooms,
      durationDays: remainingDays, // Keep remaining days
      isAddingRooms: true, // Flag to indicate this is adding rooms, not renewal
    });
    
    onOpenChange(false);
  };

  if (remainingDays <= 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Không thể mua thêm phòng</DialogTitle>
            <DialogDescription>
              Gói đăng ký của bạn đã hết hạn. Vui lòng gia hạn trước khi mua thêm phòng.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Mua thêm phòng
          </DialogTitle>
          <DialogDescription>
            Thêm phòng vào gói đăng ký hiện tại. Giá được tính theo số ngày còn lại.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Current Status */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-muted/50">
            <div>
              <div className="text-sm text-muted-foreground">Phòng đã đăng ký</div>
              <div className="text-xl font-semibold">{registeredRooms}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Phòng thực tế</div>
              <div className="text-xl font-semibold">{actualRooms}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Ngày còn lại</div>
              <div className="text-xl font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {remainingDays}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Chiết khấu áp dụng</div>
              <div className="text-xl font-semibold flex items-center gap-2">
                <Percent className="h-4 w-4" />
                {discountPercent}%
              </div>
            </div>
          </div>

          {/* Discount Info */}
          {discountPercent > 0 && (
            <Alert className="border-green-500/50 bg-green-500/10">
              <Info className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                Bạn được áp dụng chiết khấu {discountPercent}% theo thời hạn đăng ký gốc!
              </AlertDescription>
            </Alert>
          )}

          {/* Room Input */}
          <div className="space-y-2">
            <Label>Số phòng muốn thêm</Label>
            <Input
              type="number"
              min={1}
              max={1000}
              value={additionalRooms}
              onChange={(e) => setAdditionalRooms(Math.max(1, parseInt(e.target.value) || 1))}
            />
            <p className="text-sm text-muted-foreground">
              Sau khi mua: {registeredRooms} + {additionalRooms} = {registeredRooms + additionalRooms} phòng
            </p>
          </div>

          <Separator />

          {/* Price Breakdown */}
          {pricing && (
            <div className="space-y-3 p-4 rounded-lg border">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Calculator className="h-4 w-4" />
                Chi tiết giá
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {additionalRooms} phòng × {formatVNCurrency(PRICE_PER_ROOM_DAILY)} × {remainingDays} ngày
                  </span>
                  <span>{formatVNCurrency(pricing.basePrice)}</span>
                </div>
                
                {pricing.discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Chiết khấu ({pricing.discountPercent}%)</span>
                    <span>-{formatVNCurrency(pricing.discount)}</span>
                  </div>
                )}
                
                <Separator />
                
                <div className="flex justify-between font-semibold text-base">
                  <span>Tổng thanh toán</span>
                  <span className="text-primary">{formatVNCurrency(pricing.finalPrice)}</span>
                </div>
                
                <div className="text-xs text-muted-foreground text-right">
                  ≈ {formatVNCurrency(pricing.pricePerRoom)}/phòng cho {remainingDays} ngày còn lại
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={updateSubscription.isPending || additionalRooms < 1}
          >
            {updateSubscription.isPending ? 'Đang xử lý...' : `Thanh toán ${pricing ? formatVNCurrency(pricing.finalPrice) : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
