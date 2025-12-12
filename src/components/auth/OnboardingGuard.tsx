import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
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

    // Check if user needs onboarding
    // - user is null = not in users table
    // - missing tenant_id
    // - manager/staff missing hotel_id
    const needsOnboarding = user === null || 
      (user && !user.tenant_id) ||
      (user && (user.user_level_code === 'manager' || user.user_level_code === 'staff') && !user.hotel_id)
    
    if (needsOnboarding) {
      navigate('/onboarding', { replace: true })
    }
  }, [isAuthenticated, user, authLoading, userLoading, navigate, location.pathname])

  if (authLoading || userLoading) {
    return <LoadingSpinner fullScreen />
  }

  // User is authenticated but needs onboarding - let the effect handle navigation
  const needsOnboarding = user === null || 
    (user && !user.tenant_id) ||
    (user && (user.user_level_code === 'manager' || user.user_level_code === 'staff') && !user.hotel_id)
  
  if (isAuthenticated && needsOnboarding) {
    if (location.pathname === '/onboarding') {
      return <>{children}</>
    }
    return <LoadingSpinner fullScreen />
  }

  return <>{children}</>
}
