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
import { useSubscriptionPlans } from "@/hooks/useSubscription";
import { AlertCircle, CheckCircle2, Info, Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface PlanChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
}

export function PlanChangeDialog({ open, onOpenChange, planId }: PlanChangeDialogProps) {
  const { data: validation, isLoading } = useValidatePlanChange(planId);
  const { data: plans } = useSubscriptionPlans();

  const selectedPlan = plans?.find(p => p.id === planId);

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

            {/* Plan details */}
            {selectedPlan && (
              <div className="space-y-3">
                <h4 className="font-semibold">Chi tiết gói</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Giá tháng:</span>
                    <div className="font-semibold">
                      {selectedPlan.price_monthly?.toLocaleString('vi-VN')}đ
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Giá năm:</span>
                    <div className="font-semibold">
                      {selectedPlan.price_yearly?.toLocaleString('vi-VN')}đ
                    </div>
                  </div>
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
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button
            disabled={!validation?.can_change || isLoading}
            onClick={() => {
              // TODO: Implement plan change mutation
              console.log('Change to plan:', planId);
              onOpenChange(false);
            }}
          >
            Xác nhận thay đổi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
