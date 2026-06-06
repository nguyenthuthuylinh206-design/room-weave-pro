import { Outlet, useLocation } from 'react-router-dom'
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
import { SuspendedOverlay } from './SuspendedOverlay'
import { ReadOnlyBanner } from './ReadOnlyBanner'
import { FreeTrialPopup } from '@/components/promotions/FreeTrialPopup'
import { AnnouncementHost } from '@/components/announcements/AnnouncementHost'
import { ChatLauncher } from '@/components/chat/ChatLauncher'
import { ChatPopupProvider } from '@/components/chat/ChatPopupContext'
import { RequireShiftProvider } from '@/contexts/RequireShiftContext'
import { ChatNotificationListener } from '@/components/chat/ChatNotificationListener'
import { useUser } from '@/hooks/useUser'
import { useGracePeriod } from '@/hooks/useGracePeriod'
import { usePostUpdateToast } from '@/hooks/usePostUpdateToast'
import { useActiveBanner } from '@/hooks/useActiveBanner'
import { isStaff } from '@/lib/userAccess'
import { useIdlePrefetch } from '@/hooks/useIdlePrefetch'
import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useHotelContext } from '@/contexts/HotelContext'
import { setPrefetchContext } from '@/lib/route-data-prefetch'

const MainLayoutContent = () => {
  const { isMobile } = useBreakpoint()
  const { user } = useUser()
  const location = useLocation()
  const { isGracePeriodExpired } = useGracePeriod()
  const isStaffUser = isStaff(user)
  const { active: activeBanner, dismiss: dismissBanner } = useActiveBanner()
  const isSuspended = isGracePeriodExpired && !location.pathname.startsWith('/settings/subscription')

  // Idle-prefetch các route phổ biến theo permission để chuyển trang gần như tức thì.
  useIdlePrefetch()

  // Đăng ký context (tenant + hotel + queryClient) cho data prefetch trên hover/pointerdown.
  const queryClient = useQueryClient()
  const { selectedHotel, isAllHotelsMode } = useHotelContext()
  useEffect(() => {
    setPrefetchContext({
      queryClient,
      tenantId: user?.tenant_id,
      hotelId: selectedHotel?.id,
      isAllHotelsMode,
    })
  }, [queryClient, user?.tenant_id, selectedHotel?.id, isAllHotelsMode])

  const priorityBanner = (
    <>
      {(activeBanner === 'suspended' || activeBanner === 'grace_expired') && (
        <GracePeriodBanner onDismiss={() => dismissBanner(activeBanner)} />
      )}
      {activeBanner === 'read_only' && <ReadOnlyBanner />}
      {activeBanner === 'announcement' && <AnnouncementHost slot="top" />}
    </>
  )

  if (isMobile) {
    return (
      <div className="min-h-dvh flex flex-col bg-background overflow-x-hidden safe-area-x">
        {priorityBanner}
        <MobileHeader />
        {isStaffUser && <ShiftStatusBanner />}
        <main className="flex-1 overflow-y-auto overflow-x-hidden pb-safe">
          {isSuspended ? (
            <SuspendedOverlay />
          ) : (
            <>
              {activeBanner === 'quota_warning' && (
                <div className="p-4">
                  <QuotaWarningBanner onDismiss={() => dismissBanner('quota_warning')} />
                </div>
              )}
              <Outlet />
            </>
          )}
        </main>
        <AnnouncementHost slot="bottom" />
        <MobileBottomNav />
      </div>
    )
  }

  return (
    <div className="min-h-dvh flex bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        {showSubscriptionBanner && <GracePeriodBanner />}
        <ReadOnlyBanner />
        <AnnouncementHost slot="top" />
        <Header onMenuClick={() => {}} />
        {isStaffUser && <ShiftStatusBanner />}
        <main className="flex-1 overflow-auto">
          {isSuspended ? (
            <SuspendedOverlay />
          ) : (
            <div className="container mx-auto px-4 py-6 sm:px-6 lg:px-8">
              <div className="mb-4">
                <QuotaWarningBanner />
              </div>
              <Outlet />
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export const MainLayout = () => {
  const { user, loading } = useAuth()
  usePostUpdateToast()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <HotelProvider>
      <RequireShiftProvider>
        <ChatPopupProvider>
          <MainLayoutContent />
          <PushNotificationPrompt />
          <PWAUpdatePrompt />
          <ChatLauncher />
          <ChatNotificationListener />
          <AnnouncementHost slot="popup" />
          <FreeTrialPopup />
        </ChatPopupProvider>
      </RequireShiftProvider>
    </HotelProvider>
  )
}
