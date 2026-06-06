/**
 * Chuẩn hoá thông báo lỗi cho người dùng cuối (tiếng Việt).
 *
 * Dùng cho mọi toast/alert thay vì hiển thị raw `error.message` từ Supabase/Postgres/Network
 * (vốn là tiếng Anh kỹ thuật và có thể leak chi tiết schema).
 *
 * Ưu tiên sử dụng qua pattern:
 *   toast.error('Tiêu đề', { description: getFriendlyError(error) })
 */
export function getFriendlyError(error: unknown): string {
  if (typeof error === 'string') return error

  const raw = (error as any)?.message
  const msg = typeof raw === 'string' ? raw : ''

  // Map lỗi Supabase/Postgres phổ biến
  if (msg.includes('duplicate key')) return 'Dữ liệu này đã tồn tại, vui lòng kiểm tra lại.'
  if (msg.includes('violates foreign key')) return 'Không thể thực hiện vì dữ liệu liên quan đang được sử dụng.'
  if (msg.includes('violates not-null')) return 'Vui lòng điền đầy đủ thông tin bắt buộc.'
  if (msg.includes('JWT') || msg.includes('token')) return 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.'
  if (msg.includes('network') || msg.includes('fetch')) return 'Không có kết nối mạng. Vui lòng thử lại.'
  if (msg.includes('permission') || msg.includes('policy')) return 'Bạn không có quyền thực hiện thao tác này.'
  if (msg.includes('timeout')) return 'Yêu cầu mất quá nhiều thời gian. Vui lòng thử lại.'

  return 'Đã xảy ra lỗi. Vui lòng thử lại hoặc liên hệ hỗ trợ.'
}
