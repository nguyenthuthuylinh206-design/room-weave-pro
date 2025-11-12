import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useValidatePlanChange } from "@/hooks/useValidatePlanChange";
import { useSubscriptionPlans, useUpdateTenantSubscription } from "@/hooks/useSubscription";
import { AlertCircle, CheckCircle2, Info, Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useState } from "react";

interface PlanChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
}

export function PlanChangeDialog({ open, onOpenChange, planId }: PlanChangeDialogProps) {
  const { data: validation, isLoading } = useValidatePlanChange(planId);
  const { data: plans } = useSubscriptionPlans();
  const updateSubscription = useUpdateTenantSubscription();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const selectedPlan = plans?.find(p => p.id === planId);

  const handleConfirm = async () => {
    await updateSubscription.mutateAsync({
      planId,
      billingCycle,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Xác nhận thay đổi gói</DialogTitle>
          <DialogDescription>
            Bạn đang chọn gói: <strong>{selectedPlan?.name}</strong>
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Blockers - Preventing change */}
            {validation?.blockers && validation.blockers.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Không thể thay đổi gói</AlertTitle>
                <AlertDescription className="space-y-2 mt-2">
                  {validation.blockers.map((blocker: any, index: number) => (
                    <div key={index} className="text-sm">
                      <strong>{blocker.resource}:</strong> {blocker.message}
                    </div>
                  ))}
                </AlertDescription>
              </Alert>
            )}

            {/* Warnings */}
            {validation?.warnings && validation.warnings.length > 0 && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Lưu ý</AlertTitle>
                <AlertDescription className="space-y-2 mt-2">
                  {validation.warnings.map((warning: any, index: number) => (
                    <div key={index} className="text-sm">
                      <strong>{warning.resource}:</strong> {warning.message}
                    </div>
                  ))}
                </AlertDescription>
              </Alert>
            )}

            {/* Success - Can change */}
            {validation?.can_change && (
              <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <AlertTitle className="text-green-700 dark:text-green-400">
                  Có thể thay đổi
                </AlertTitle>
                <AlertDescription className="text-green-600 dark:text-green-400">
                  Bạn có thể nâng cấp lên gói này ngay bây giờ.
                </AlertDescription>
              </Alert>
            )}

            <Separator />

            {/* Billing Cycle Selection */}
            {validation?.can_change && selectedPlan && (
              <div className="space-y-3">
                <h4 className="font-semibold">Chọn chu kỳ thanh toán</h4>
                <RadioGroup value={billingCycle} onValueChange={(value) => setBillingCycle(value as 'monthly' | 'yearly')}>
                  <div className="flex items-center space-x-2 border rounded-lg p-3">
                    <RadioGroupItem value="monthly" id="monthly" />
                    <Label htmlFor="monthly" className="flex-1 cursor-pointer">
                      <div className="font-semibold">Thanh toán hàng tháng</div>
                      <div className="text-sm text-muted-foreground">
                        {selectedPlan.price_monthly?.toLocaleString('vi-VN')}đ/tháng
                      </div>
                    </Label>
                  </div>
                  {selectedPlan.price_yearly && (
                    <div className="flex items-center space-x-2 border rounded-lg p-3">
                      <RadioGroupItem value="yearly" id="yearly" />
                      <Label htmlFor="yearly" className="flex-1 cursor-pointer">
                        <div className="font-semibold flex items-center gap-2">
                          Thanh toán hàng năm
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                            Tiết kiệm {Math.round((1 - (selectedPlan.price_yearly / (selectedPlan.price_monthly * 12))) * 100)}%
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {selectedPlan.price_yearly.toLocaleString('vi-VN')}đ/năm
                        </div>
                      </Label>
                    </div>
                  )}
                </RadioGroup>
              </div>
            )}

            {/* Plan details */}
            {selectedPlan && (
              <div className="space-y-3">
                <h4 className="font-semibold">Chi tiết gói</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Khách sạn:</span>
                    <div className="font-semibold">
                      {selectedPlan.max_hotels === null ? 'Không giới hạn' : selectedPlan.max_hotels}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Người dùng:</span>
                    <div className="font-semibold">
                      {selectedPlan.max_users === null ? 'Không giới hạn' : selectedPlan.max_users}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Phòng:</span>
                    <div className="font-semibold">Không giới hạn</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Sản phẩm:</span>
                    <div className="font-semibold">Không giới hạn</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Lưu trữ:</span>
                    <div className="font-semibold">
                      {selectedPlan.max_storage_gb === null ? 'Không giới hạn' : `${selectedPlan.max_storage_gb} GB`}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={updateSubscription.isPending}>
            Hủy
          </Button>
          <Button
            disabled={!validation?.can_change || isLoading || updateSubscription.isPending}
            onClick={handleConfirm}
          >
            {updateSubscription.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Đang xử lý...
              </>
            ) : (
              'Xác nhận thay đổi'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
