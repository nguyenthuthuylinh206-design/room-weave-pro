import { useState } from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWAUpdate } from '@/hooks/usePWAUpdate';

export function PWAUpdatePrompt() {
  const { needRefresh, update, dismiss } = usePWAUpdate();
  const [isUpdating, setIsUpdating] = useState(false);

  if (!needRefresh) return null;

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      await update();
      // App will reload automatically via controllerchange listener
    } catch (error) {
      console.error('[PWA] Update failed:', error);
      setIsUpdating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-background/60 backdrop-blur-sm sm:items-center"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-update-title"
    >
      <div className="w-full max-w-md rounded-t-2xl border border-border bg-card p-6 shadow-2xl sm:rounded-2xl sm:mx-4 animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:fade-in duration-300">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-4">
            <Sparkles className="h-7 w-7 text-primary" />
          </div>
          <h3 id="pwa-update-title" className="text-lg font-semibold text-foreground">
            Có bản cập nhật mới
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Phiên bản mới đã sẵn sàng. Cập nhật để trải nghiệm các tính năng mới nhất.
          </p>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={dismiss}
            disabled={isUpdating}
            className="flex-1"
          >
            Để sau
          </Button>
          <Button
            onClick={handleUpdate}
            disabled={isUpdating}
            className="flex-1"
          >
            {isUpdating ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                Đang cập nhật...
              </>
            ) : (
              'Cập nhật ngay'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
