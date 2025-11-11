import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { MobileHeader } from './MobileHeader'
import { BottomNav } from './BottomNav'
import { useBreakpoint } from '@/lib/breakpoints'
import { useAuth } from '@/hooks/useAuth'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { QuotaWarningBanner } from '@/components/settings/usage/QuotaWarningBanner'

export const MainLayout = () => {
  const { isMobile } = useBreakpoint()
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!user) {
    return null // AuthGuard will redirect
  }

  if (isMobile) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <MobileHeader />
        <main className="flex-1 overflow-auto pb-16">
          <div className="p-4">
            <QuotaWarningBanner />
          </div>
          <Outlet />
        </main>
        <BottomNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header onMenuClick={() => {}} />
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto px-4 py-6 sm:px-6 lg:px-8">
            <div className="mb-4">
              <QuotaWarningBanner />
            </div>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
