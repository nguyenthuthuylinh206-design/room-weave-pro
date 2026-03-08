import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { MobileHeader } from './MobileHeader'
import { MobileBottomNav } from './MobileBottomNav'
import { useBreakpoint } from '@/lib/breakpoints'
import { useAuth } from '@/contexts/AuthContext'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { QuotaWarningBanner } from '@/components/settings/usage/QuotaWarningBanner'
import { HotelProvider } from '@/contexts/HotelContext'
import { PushNotificationPrompt } from '@/components/notifications'
import { PWAUpdatePrompt } from '@/components/pwa'
import { ShiftStatusBanner } from '@/components/staff/ShiftStatusBanner'
import { GracePeriodBanner } from './GracePeriodBanner'
import { useUser } from '@/hooks/useUser'
import { isStaff, isTenantOwner } from '@/lib/userAccess'

const MainLayoutContent = () => {
  const { isMobile } = useBreakpoint()
  const { user } = useUser()
  const isStaffUser = isStaff(user)
  const isOwnerUser = isTenantOwner(user)

  if (isMobile) {
    return (
      <div className="min-h-screen flex flex-col bg-background overflow-x-hidden">
        {/* Grace Period Banner - Only for owners */}
        {isOwnerUser && <GracePeriodBanner />}
        <MobileHeader />
        {/* Shift Status Banner - Only for staff who haven't checked in */}
        {isStaffUser && <ShiftStatusBanner />}
        <main className="flex-1 overflow-y-auto overflow-x-hidden pb-16">
          <div className="p-4">
            <QuotaWarningBanner />
          </div>
          <Outlet />
        </main>
        <MobileBottomNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        {/* Grace Period Banner - Only for owners */}
        {isOwnerUser && <GracePeriodBanner />}
        <Header onMenuClick={() => {}} />
        {/* Shift Status Banner - Only for staff who haven't checked in */}
        {isStaffUser && <ShiftStatusBanner />}
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

export const MainLayout = () => {
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

  return (
    <HotelProvider>
      <MainLayoutContent />
      <PushNotificationPrompt />
      <PWAUpdatePrompt />
    </HotelProvider>
  )
}
