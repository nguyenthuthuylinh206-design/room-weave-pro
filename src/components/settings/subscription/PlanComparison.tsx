import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSubscriptionPlans, useTenantSubscription } from "@/hooks/useSubscription";
import { useValidatePlanChange } from "@/hooks/useValidatePlanChange";
import { Check, Crown, Sparkles, Zap } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PlanChangeDialog } from "./PlanChangeDialog";
import { useState } from "react";

export function PlanComparison() {
  const { data: plans, isLoading } = useSubscriptionPlans();
  const { data: currentSubscription } = useTenantSubscription();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-96 w-full" />
        ))}
      </div>
    );
  }

  const planIconsMap: Record<string, any> = {
    trial: Sparkles,
    basic: Zap,
    premium: Crown,
    enterprise: Crown,
  };

  const planColorsMap: Record<string, string> = {
    trial: "text-blue-500",
    basic: "text-green-500",
    premium: "text-purple-500",
    enterprise: "text-orange-500",
  };

  const handleSelectPlan = (planId: string) => {
    setSelectedPlan(planId);
    setDialogOpen(true);
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans?.map((plan) => {
          const Icon = planIconsMap[plan.code] || Zap;
          const iconColor = planColorsMap[plan.code] || "text-gray-500";
          const isCurrentPlan = currentSubscription?.subscription_plan_id === plan.id;

          return (
            <Card
              key={plan.id}
              className={`relative ${isCurrentPlan ? 'ring-2 ring-primary' : ''}`}
            >
              {isCurrentPlan && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge>Gói hiện tại</Badge>
                </div>
              )}

              <CardHeader>
                <div className="flex items-center justify-between">
                  <Icon className={`h-8 w-8 ${iconColor}`} />
                  {plan.display_order === 1 && (
                    <Badge variant="secondary">Phổ biến</Badge>
                  )}
                </div>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <div className="text-3xl font-bold">
                    {plan.price_monthly?.toLocaleString('vi-VN')}đ
                  </div>
                  <div className="text-sm text-muted-foreground">/tháng</div>
                  {plan.price_yearly && (
                    <div className="text-sm text-muted-foreground">
                      hoặc {plan.price_yearly.toLocaleString('vi-VN')}đ/năm
                    </div>
                  )}
                </div>

                <div className="space-y-2 pt-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>
                      {plan.max_hotels === null ? 'Không giới hạn' : plan.max_hotels} khách sạn
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>
                      {plan.max_users === null ? 'Không giới hạn' : plan.max_users} người dùng
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Không giới hạn phòng</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Không giới hạn sản phẩm</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>
                      {plan.max_storage_gb === null ? 'Không giới hạn' : `${plan.max_storage_gb} GB`} lưu trữ
                    </span>
                  </div>

                  {plan.features && Array.isArray(plan.features) && plan.features.length > 0 && (
                    <>
                      {plan.features.map((feature: string, index: number) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-green-500" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </CardContent>

              <CardFooter>
                {isCurrentPlan ? (
                  <Button variant="outline" className="w-full" disabled>
                    Gói hiện tại
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    variant={plan.display_order === 1 ? "default" : "outline"}
                    onClick={() => handleSelectPlan(plan.id)}
                  >
                    Chọn gói này
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {selectedPlan && (
        <PlanChangeDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          planId={selectedPlan}
        />
      )}
    </>
  );
}
