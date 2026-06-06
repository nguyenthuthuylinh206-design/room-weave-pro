import { Navigate } from 'react-router-dom'
import { useUser } from '@/hooks/useUser'
import { hasPermission } from '@/lib/permissions'

/**
 * Redirect /settings → trang đầu tiên trong Settings mà role có quyền.
 * Tránh tình huống staff click "Cài đặt" rồi bị PermissionRoute chặn ở General.
 */
export default function SettingsRedirect() {
  const { role, isLoading } = useUser()

  if (isLoading) return null

  // Owner / Hotel Manager / Department Manager → General (cần manage_settings)
  if (hasPermission(role, 'manage_settings')) {
    return <Navigate to="/settings/general" replace />
  }

  // Staff hoặc role không có manage_settings → Đổi mật khẩu (ai cũng có)
  return <Navigate to="/settings/change-password" replace />
}
