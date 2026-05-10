import { lazy, Suspense } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { OnboardingGuard } from '@/components/auth/OnboardingGuard'
import { MainLayout } from '@/components/layout/MainLayout'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

const LandingPage = lazy(() => import('@/pages/LandingPage'))

/**
 * Root route gate:
 * - Anonymous user truy cập đúng "/" → render LandingPage (không bọc MainLayout).
 * - Mọi trường hợp khác → giữ nguyên hành vi cũ: AuthGuard → OnboardingGuard → MainLayout.
 */
export const RootRoute = () => {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <LoadingSpinner fullScreen />
  }

  const isRoot = location.pathname === '/'
  if (!isAuthenticated && isRoot) {
    return (
      <Suspense fallback={<LoadingSpinner fullScreen />}>
        <LandingPage />
      </Suspense>
    )
  }

  return (
    <AuthGuard>
      <OnboardingGuard>
        <MainLayout />
      </OnboardingGuard>
    </AuthGuard>
  )
}

export default RootRoute
