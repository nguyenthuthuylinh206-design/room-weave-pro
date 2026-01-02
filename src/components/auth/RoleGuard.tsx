import { Navigate } from 'react-router-dom'
import { useUser } from '@/hooks/useUser'
import { AppRole } from '@/types/database.types'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

interface RoleGuardProps {
  children: React.ReactNode
  allowedRoles: AppRole[]
}

export const RoleGuard = ({ children, allowedRoles }: RoleGuardProps) => {
  const { user, isLoading, hasAnyRole } = useUser()

  if (isLoading) {
    return <LoadingSpinner fullScreen />
  }

  if (!user) {
    return <Navigate to="/auth/login" replace />
  }

  if (!hasAnyRole(allowedRoles)) {
    return <Navigate to="/unauthorized" replace />
  }

  return <>{children}</>
}
