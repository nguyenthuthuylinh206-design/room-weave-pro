import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '@/hooks/useUser'
import { AppRole } from '@/types/database.types'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

interface RoleGuardProps {
  children: React.ReactNode
  allowedRoles: AppRole[]
}

export const RoleGuard = ({ children, allowedRoles }: RoleGuardProps) => {
  const { user, isLoading, hasAnyRole } = useUser()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isLoading && user && !hasAnyRole(allowedRoles)) {
      navigate('/unauthorized', { replace: true })
    }
  }, [user, isLoading, allowedRoles, hasAnyRole, navigate])

  if (isLoading) {
    return <LoadingSpinner fullScreen />
  }

  if (!user || !hasAnyRole(allowedRoles)) {
    return null
  }

  return <>{children}</>
}
