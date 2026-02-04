import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useGracePeriod } from '@/hooks/useGracePeriod';
import { useState } from 'react';

export function GracePeriodBanner() {
  const navigate = useNavigate();
  const { isInGracePeriod, isGracePeriodExpired, graceDaysRemaining, isLoading } = useGracePeriod();
  const [dismissed, setDismissed] = useState(false);

  // Don't show if still loading or dismissed
  if (isLoading || dismissed) return null;

  // Show suspended banner if grace period expired
  if (isGracePeriodExpired) {
    return (
      <div className="bg-destructive text-destructive-foreground px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="text-sm font-medium">
            Tài khoản đã bị tạm ngưng! Vui lòng gia hạn gói để tiếp tục sử dụng dịch vụ.
          </span>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => navigate('/settings/subscription')}
          className="shrink-0"
        >
          Gia hạn ngay
        </Button>
      </div>
    );
  }

  // Show warning banner if in grace period
  if (isInGracePeriod) {
    return (
      <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="text-sm">
            Gói đăng ký đã hết hạn! Còn <strong>{graceDaysRemaining} ngày</strong> để gia hạn.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => navigate('/settings/subscription')}
            className="shrink-0"
          >
            Gia hạn ngay
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setDismissed(true)}
            className="h-7 w-7 p-0 text-white hover:bg-white/20"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
