/**
 * Map các mã lỗi RPC/PostgreSQL sang thông điệp tiếng Việt thân thiện.
 *
 * Dùng chung cho mọi mutation: cứ catch (err) → toast(mapDbError(err.message)).
 */
export function mapDbError(message: string | undefined | null): string {
  const msg = String(message ?? '')

  // Read-only mode (Phase 1)
  if (msg.includes('TENANT_READ_ONLY')) {
    return 'Tài khoản đang ở chế độ chỉ đọc. Vui lòng gia hạn để tiếp tục thao tác.'
  }

  // Permission
  if (msg.includes('FORBIDDEN')) return 'Bạn không có quyền thực hiện thao tác này.'
  if (msg.includes('NOT_AUTHENTICATED')) return 'Vui lòng đăng nhập lại.'
  if (msg.includes('NOT_FOUND')) return 'Không tìm thấy dữ liệu yêu cầu.'

  // Tenant isolation
  if (msg.includes('TENANT_MISMATCH')) return 'Dữ liệu không thuộc tài khoản của bạn.'

  // Rate limit (Phase 1 — Lượt 3)
  if (msg.includes('RATE_LIMITED')) return 'Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.'

  return msg || 'Đã xảy ra lỗi không xác định.'
}
