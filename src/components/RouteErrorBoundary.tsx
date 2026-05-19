import { useEffect, useState } from 'react';
import { useRouteError, isRouteErrorResponse, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  isChunkLoadError,
  purgeCachesAndReload,
  hasReloadAttempted,
} from '@/lib/chunk-reload';

/**
 * errorElement cho React Router data router.
 *
 * - Lỗi chunk (deploy mới → hash cũ): tự purge cache + reload 1 lần / session,
 *   nếu đã reload mà vẫn lỗi → show CTA "Tải lại bản mới" thay vì màn hình
 *   "Unexpected Application Error" mặc định.
 * - Lỗi route response (404/403…): show thông báo Vietnamese gọn.
 * - Lỗi render khác: show error message + nút Tải lại, KHÔNG auto reload.
 */
export function RouteErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();
  const [autoReloading, setAutoReloading] = useState(false);

  const chunk = isChunkLoadError(error);

  useEffect(() => {
    if (chunk && !hasReloadAttempted()) {
      setAutoReloading(true);
      try {
        sessionStorage.setItem('__chunk_reload_attempted__', '1');
      } catch {
        /* ignore */
      }
      purgeCachesAndReload();
    }
  }, [chunk]);

  if (chunk) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background p-4">
        <div className="max-w-sm w-full text-center space-y-3">
          <h2 className="text-base font-semibold">Đã có bản cập nhật mới</h2>
          <p className="text-sm text-muted-foreground">
            {autoReloading
              ? 'Đang tải lại phiên bản mới…'
              : 'Vui lòng tải lại để dùng phiên bản mới nhất.'}
          </p>
          <Button
            onClick={() => {
              try {
                sessionStorage.removeItem('__chunk_reload_attempted__');
              } catch {
                /* ignore */
              }
              purgeCachesAndReload();
            }}
            className="w-full h-9"
          >
            Tải lại ngay
          </Button>
        </div>
      </div>
    );
  }

  if (isRouteErrorResponse(error)) {
    const status = error.status;
    const title =
      status === 404
        ? 'Không tìm thấy trang'
        : status === 403
          ? 'Không có quyền truy cập'
          : `Lỗi ${status}`;
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background p-4">
        <div className="max-w-sm w-full text-center space-y-3">
          <h2 className="text-base font-semibold">{title}</h2>
          {error.statusText && (
            <p className="text-sm text-muted-foreground break-words">
              {error.statusText}
            </p>
          )}
          <div className="flex gap-2 justify-center">
            <Button variant="outline" className="h-9" onClick={() => navigate(-1)}>
              Quay lại
            </Button>
            <Button className="h-9" onClick={() => navigate('/')}>
              Về trang chủ
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const message =
    (error as any)?.message ??
    (typeof error === 'string' ? error : 'Đã xảy ra lỗi không xác định');

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4">
      <div className="max-w-md w-full space-y-3 text-center">
        <h2 className="text-base font-semibold text-destructive">Đã xảy ra lỗi</h2>
        <p className="text-sm text-muted-foreground break-words">{message}</p>
        <div className="flex gap-2 justify-center">
          <Button
            variant="outline"
            className="h-9"
            onClick={() => window.location.reload()}
          >
            Tải lại trang
          </Button>
          <Button className="h-9" onClick={() => navigate('/')}>
            Về trang chủ
          </Button>
        </div>
      </div>
    </div>
  );
}
