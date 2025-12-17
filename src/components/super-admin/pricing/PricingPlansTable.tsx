import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Calculator, 
  Building2, 
  Calendar, 
  DollarSign, 
  Check,
  Infinity,
  Edit2,
  Save
} from 'lucide-react';
import { usePlansWithTenantCounts, useUpdatePlan } from '@/hooks/super-admin/usePricingManagement';
import { toast } from 'sonner';

const DURATION_OPTIONS = [
  { months: 1, days: 30, label: '1 tháng', discount: 0 },
  { months: 3, days: 90, label: '3 tháng', discount: 5 },
  { months: 6, days: 180, label: '6 tháng', discount: 10 },
  { months: 12, days: 365, label: '1 năm', discount: 15 },
];

const UNLIMITED_FEATURES = [
  'Không giới hạn số khách sạn',
  'Không giới hạn người dùng',
  'Không giới hạn dung lượng',
  'Báo cáo nâng cao',
  'Truy cập API',
  'Hỗ trợ ưu tiên 24/7',
  'Thương hiệu riêng',
  'Nhật ký hoạt động',
];

export function PricingPlansTable() {
  const { data: plans = [], isLoading } = usePlansWithTenantCounts();
  const updatePlan = useUpdatePlan();
  
  // Get the single active plan
  const activePlan = plans.find((p: any) => p.is_active) || plans[0];
  const pricePerRoomDaily = (activePlan as any)?.price_per_room_daily || 1000;

  const [rooms, setRooms] = useState(50);
  const [selectedDuration, setSelectedDuration] = useState(DURATION_OPTIONS[0]);
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [newPrice, setNewPrice] = useState(pricePerRoomDaily);

  const calculatePrice = (days: number, discount: number) => {
    const basePrice = rooms * pricePerRoomDaily * days;
    return Math.round(basePrice * (1 - discount / 100));
  };

  const handleSavePrice = async () => {
    if (!activePlan) return;
    
    try {
      await updatePlan.mutateAsync({
        id: activePlan.id,
        updates: {
          price_per_room_daily: newPrice,
          // Update monthly/yearly for compatibility
          price_monthly: 50 * newPrice * 30,
          price_yearly: 50 * newPrice * 365 * 0.85,
        }
      });
      setIsEditingPrice(false);
      toast.success('Đã cập nhật giá');
    } catch (error) {
      toast.error('Lỗi cập nhật giá');
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Đang tải...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Pricing Model Header */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-primary" />
            Mô hình giá đơn giản
          </CardTitle>
          <CardDescription className="text-base">
            Một gói duy nhất - Đầy đủ tính năng - Giá theo số phòng và thời gian
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-background flex-1">
              <Building2 className="h-10 w-10 text-primary" />
              <div>
                {isEditingPrice ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={newPrice}
                      onChange={(e) => setNewPrice(Number(e.target.value))}
                      className="w-32 text-xl font-bold"
                    />
                    <span className="text-muted-foreground">đ/phòng/ngày</span>
                    <Button size="sm" onClick={handleSavePrice} disabled={updatePlan.isPending}>
                      <Save className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setIsEditingPrice(false)}>
                      Hủy
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="text-3xl font-bold text-primary">
                      {pricePerRoomDaily.toLocaleString('vi-VN')}đ
                    </div>
                    <div className="text-muted-foreground">/phòng/ngày</div>
                    <Button size="sm" variant="ghost" onClick={() => {
                      setNewPrice(pricePerRoomDaily);
                      setIsEditingPrice(true);
                    }}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Unlimited Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Infinity className="h-5 w-5 text-green-600" />
            Tính năng không giới hạn
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {UNLIMITED_FEATURES.map((feature) => (
              <div key={feature} className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Price Calculator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Tính giá đăng ký
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Room Input */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Số phòng của bạn
            </Label>
            <Input
              type="number"
              min={1}
              value={rooms}
              onChange={(e) => setRooms(Math.max(1, parseInt(e.target.value) || 1))}
              className="text-lg font-medium max-w-xs"
            />
          </div>

          {/* Duration Options */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Chọn thời gian đăng ký
            </Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {DURATION_OPTIONS.map((option) => {
                const price = calculatePrice(option.days, option.discount);
                const isSelected = selectedDuration.months === option.months;
                
                return (
                  <Card
                    key={option.months}
                    className={`cursor-pointer transition-all ${
                      isSelected 
                        ? 'ring-2 ring-primary border-primary bg-primary/5' 
                        : 'hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedDuration(option)}
                  >
                    <CardContent className="p-4 text-center">
                      <div className="font-semibold text-lg">{option.label}</div>
                      {option.discount > 0 && (
                        <Badge variant="secondary" className="mt-1 bg-green-100 text-green-700">
                          Giảm {option.discount}%
                        </Badge>
                      )}
                      <div className="mt-3 text-2xl font-bold text-primary">
                        {price.toLocaleString('vi-VN')}đ
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {rooms} phòng × {option.days} ngày
                      </div>
                      {option.discount > 0 && (
                        <div className="text-xs text-muted-foreground line-through">
                          {calculatePrice(option.days, 0).toLocaleString('vi-VN')}đ
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Selected Summary */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">Tổng thanh toán cho {selectedDuration.label}</div>
                  <div className="text-3xl font-bold text-primary">
                    {calculatePrice(selectedDuration.days, selectedDuration.discount).toLocaleString('vi-VN')}đ
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {rooms} phòng × {pricePerRoomDaily.toLocaleString()}đ × {selectedDuration.days} ngày
                    {selectedDuration.discount > 0 && ` - ${selectedDuration.discount}% giảm giá`}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Trung bình/tháng</div>
                  <div className="text-xl font-semibold">
                    {Math.round(calculatePrice(selectedDuration.days, selectedDuration.discount) / selectedDuration.months).toLocaleString('vi-VN')}đ
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Reference Table */}
          <div>
            <Label className="mb-3 block">Bảng giá tham khảo theo số phòng</Label>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-3 text-left font-medium">Số phòng</th>
                    {DURATION_OPTIONS.map((opt) => (
                      <th key={opt.months} className="p-3 text-right font-medium">
                        {opt.label}
                        {opt.discount > 0 && (
                          <span className="text-xs text-green-600 ml-1">(-{opt.discount}%)</span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[10, 20, 30, 50, 100, 200].map((r) => (
                    <tr key={r} className={`border-t ${r === rooms ? 'bg-primary/5' : ''}`}>
                      <td className="p-3 font-medium">{r} phòng</td>
                      {DURATION_OPTIONS.map((opt) => {
                        const price = Math.round(r * pricePerRoomDaily * opt.days * (1 - opt.discount / 100));
                        return (
                          <td key={opt.months} className="p-3 text-right">
                            {price.toLocaleString('vi-VN')}đ
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Tenants */}
      {activePlan && (
        <Card>
          <CardHeader>
            <CardTitle>Thống kê</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-lg bg-muted">
                <div className="text-3xl font-bold">{(activePlan as any).activeTenantCount || 0}</div>
                <div className="text-sm text-muted-foreground">Khách hàng đang sử dụng</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}