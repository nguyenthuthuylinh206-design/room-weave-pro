 import { useState, useEffect } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { usePWAUpdate } from '@/hooks/usePWAUpdate';

export function PWAUpdatePrompt() {
  const { needRefresh, update, dismiss } = usePWAUpdate();
  const [isUpdating, setIsUpdating] = useState(false);

   // Auto-update after 10 seconds if not dismissed
   useEffect(() => {
     if (needRefresh && !isUpdating) {
       const timer = setTimeout(() => {
         handleUpdate();
       }, 10000);
       
       return () => clearTimeout(timer);
     }
   }, [needRefresh, isUpdating]);
 
  if (!needRefresh) return null;

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      await update();
      // App will reload automatically
    } catch (error) {
      console.error('[PWA] Update failed:', error);
      setIsUpdating(false);
    }
  };

  return (
    <Card className="fixed bottom-20 left-4 right-4 z-50 border-primary/20 bg-card shadow-lg md:bottom-6 md:left-auto md:right-6 md:w-80">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <RefreshCw className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm">Có phiên bản mới</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Nhấn "Cập nhật" để sử dụng các tính năng mới nhất
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={dismiss}
            disabled={isUpdating}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex gap-2 mt-3">
          <Button
            onClick={handleUpdate}
            disabled={isUpdating}
            size="sm"
            className="flex-1"
          >
            {isUpdating ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin mr-1" />
                Đang cập nhật...
              </>
            ) : (
              'Cập nhật ngay'
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={dismiss}
            disabled={isUpdating}
          >
            Để sau
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
