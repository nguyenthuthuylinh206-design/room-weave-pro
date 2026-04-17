import { Outlet } from 'react-router-dom'
import { MobileBottomNav } from './MobileBottomNav'
import { InstallPWA } from '@/components/pwa/InstallPWA'

export const MobileLayout = () => {
  return (
    <div
      className="min-h-dvh bg-background"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <main className="pb-safe-20">
        <Outlet />
      </main>
      <MobileBottomNav />
      <InstallPWA />
    </div>
  )
}
