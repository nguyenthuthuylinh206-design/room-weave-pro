import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useTenantSubscription } from "@/hooks/useSubscription";
import { useTenantUsage } from "@/hooks/useTenantUsage";
import { formatDate } from "date-fns";
import { vi } from "date-fns/locale";
import { AlertCircle, Calendar, CheckCircle2, Package, TrendingUp, XCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

export function SubscriptionOverview() {
  const { data: subscription, isLoading: loadingSubscription } = useTenantSubscription();
  const { data: usage, isLoading: loadingUsage } = useTenantUsage();

  if (loadingSubscription || loadingUsage) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }

  if (!subscription) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Lỗi</AlertTitle>
        <AlertDescription>Không thể tải thông tin đăng ký</AlertDescription>
      </Alert>
    );
  }

  const statusConfig = {
    active: { label: "Đang hoạt động", variant: "default" as const, icon: CheckCircle2, color: "text-green-500" },
    trial: { label: "Dùng thử", variant: "secondary" as const, icon: TrendingUp, color: "text-blue-500" },
    past_due: { label: "Quá hạn", variant: "destructive" as const, icon: AlertCircle, color: "text-yellow-500" },
    suspended: { label: "Đã tạm ngưng", variant: "destructive" as const, icon: XCircle, color: "text-red-500" },
    canceled: { label: "Đã hủy", variant: "outline" as const, icon: XCircle, color: "text-gray-500" },
  };

  const currentStatus = statusConfig[subscription.subscription_status as keyof typeof statusConfig] || statusConfig.active;
  const StatusIcon = currentStatus.icon;

  const daysUntilRenewal = subscription.subscription_end_date
    ? Math.ceil((new Date(subscription.subscription_end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div className="space-y-6">
      {/* Current Plan Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Gói hiện tại: {subscription.subscription_plan?.name || "N/A"}
              </CardTitle>
              <CardDescription>
                {subscription.subscription_plan?.description}
              </CardDescription>
            </div>
            <Badge variant={currentStatus.variant} className="gap-1">
              <StatusIcon className={`h-3 w-3 ${currentStatus.color}`} />
              {currentStatus.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Giá (ước tính)</div>
              <div className="text-2xl font-bold">
                {subscription.subscription_plan?.price_monthly?.toLocaleString('vi-VN')}đ/tháng
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Ngày hết hạn
              </div>
              <div className="text-lg font-semibold">
                {subscription.subscription_end_date
                  ? formatDate(new Date(subscription.subscription_end_date), 'dd/MM/yyyy', { locale: vi })
                  : 'N/A'
                }
              </div>
              {daysUntilRenewal > 0 && (
                <div className="text-xs text-muted-foreground">
                  Còn {daysUntilRenewal} ngày
                </div>
              )}
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Loại gói</div>
              <div className="text-lg font-semibold capitalize">
                {subscription.subscription_plan?.code || 'N/A'}
              </div>
            </div>
          </div>

          {subscription.subscription_status === 'past_due' && subscription.trial_ends_at && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Thời gian gia hạn sắp hết</AlertTitle>
              <AlertDescription>
                Vui lòng gia hạn gói đăng ký trước ngày{' '}
                {formatDate(new Date(subscription.trial_ends_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button onClick={() => {
              const plansTab = document.querySelector('[value="plans"]') as HTMLButtonElement;
              plansTab?.click();
            }}>
              Nâng cấp gói
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Usage Card */}
      {usage && (
        <Card>
          <CardHeader>
            <CardTitle>Mức sử dụng</CardTitle>
            <CardDescription>Theo dõi việc sử dụng tài nguyên của bạn</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Khách sạn</span>
                  <span className="text-muted-foreground">
                    {usage.current_hotels_count} / {subscription.subscription_plan?.max_hotels || '∞'}
                  </span>
                </div>
                <Progress
                  value={
                    subscription.subscription_plan?.max_hotels
                      ? (usage.current_hotels_count / subscription.subscription_plan.max_hotels) * 100
                      : 0
                  }
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Người dùng</span>
                  <span className="text-muted-foreground">
                    {usage.current_users_count} / {subscription.subscription_plan?.max_users || '∞'}
                  </span>
                </div>
                <Progress
                  value={
                    subscription.subscription_plan?.max_users
                      ? (usage.current_users_count / subscription.subscription_plan.max_users) * 100
                      : 0
                  }
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Phòng</span>
                  <span className="text-muted-foreground">
                    {usage.current_rooms_count} / ∞
                  </span>
                </div>
                <Progress
                  value={usage.current_rooms_count > 0 ? 50 : 0}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Sản phẩm</span>
                  <span className="text-muted-foreground">
                    {usage.current_items_count} / ∞
                  </span>
                </div>
                <Progress value={usage.current_items_count > 0 ? 50 : 0} />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Lưu trữ</span>
                  <span className="text-muted-foreground">
                    {(usage.current_storage_bytes / (1024 ** 3)).toFixed(2)} GB /{' '}
                    {subscription.subscription_plan?.max_storage_gb || '∞'} GB
                  </span>
                </div>
                <Progress
                  value={
                    subscription.subscription_plan?.max_storage_gb
                      ? ((usage.current_storage_bytes / (1024 ** 3)) / subscription.subscription_plan.max_storage_gb) * 100
                      : 0
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
