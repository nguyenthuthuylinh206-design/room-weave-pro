import { ReactNode, useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  getLocalCredential,
  clearLocalCredential,
  wasExplicitlyLoggedOut,
} from '@/lib/credential-manager';
import { isStandalonePWA, isPreviewOrIframe } from '@/lib/pwa-environment';

interface AutoLoginGateProps {
  children: ReactNode;
}

/**
 * Khi mở app trong PWA đã cài (standalone) và có credential đã lưu, tự động
 * đăng nhập ngầm — bỏ qua mọi form. Trình duyệt thường giữ nguyên hành vi cũ.
 */
export const AutoLoginGate = ({ children }: AutoLoginGateProps) => {
  const { signIn, isAuthenticated } = useAuth();
  const triedRef = useRef(false);

  const credential = (() => {
    if (typeof window === 'undefined') return null;
    if (isPreviewOrIframe()) return null;
    if (!isStandalonePWA()) return null;
    if (wasExplicitlyLoggedOut()) return null;
    return getLocalCredential();
  })();

  const [phase, setPhase] = useState<'idle' | 'signing-in' | 'failed' | 'cancelled'>(
    credential ? 'signing-in' : 'idle'
  );

  useEffect(() => {
    if (!credential || triedRef.current || isAuthenticated) return;
    triedRef.current = true;

    (async () => {
      const { error } = await signIn(credential.email, credential.password);
      if (error) {
        // Credential không còn hợp lệ → xoá, hiện form bình thường
        clearLocalCredential();
        toast.error('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.');
        setPhase('failed');
        return;
      }
      // Thành công → AuthContext sẽ chuyển trạng thái, Login.tsx tự redirect
      window.location.assign('/auth/callback');
    })();
  }, [credential, signIn, isAuthenticated]);

  if (phase === 'signing-in' && credential) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <div className="flex flex-col items-center space-y-4 text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <div>
            <p className="text-sm text-muted-foreground">Đang đăng nhập</p>
            <p className="font-medium text-foreground">{credential.email}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              clearLocalCredential();
              setPhase('cancelled');
            }}
          >
            Hủy và đăng nhập tài khoản khác
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AutoLoginGate;
