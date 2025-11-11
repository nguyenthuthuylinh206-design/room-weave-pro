import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useUser } from '@/hooks/useUser'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

interface OnboardingGuardProps {
  children: React.ReactNode
}

export const OnboardingGuard = ({ children }: OnboardingGuardProps) => {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const { user, isLoading: userLoading } = useUser()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    // Skip checks if still loading or not authenticated
    if (authLoading || userLoading || !isAuthenticated) return

    // Skip check if already on onboarding page
    if (location.pathname === '/onboarding') return

    // Check if user needs onboarding (user is null = not in users table, or missing tenant/hotel)
    if (user === null || (user && (!user.tenant_id || !user.hotel_id))) {
      navigate('/onboarding', { replace: true })
    }
  }, [isAuthenticated, user, authLoading, userLoading, navigate, location.pathname])

  if (authLoading || userLoading) {
    return <LoadingSpinner fullScreen />
  }

  // User is authenticated but needs onboarding - let the effect handle navigation
  if (isAuthenticated && (user === null || (user && (!user.tenant_id || !user.hotel_id)))) {
    if (location.pathname === '/onboarding') {
      return <>{children}</>
    }
    return <LoadingSpinner fullScreen />
  }

  return <>{children}</>
}
