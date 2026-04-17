import { Outlet } from 'react-router-dom'
import { MobileBottomNav } from './MobileBottomNav'
import { InstallPWA } from '@/components/pwa/InstallPWA'

export const MobileLayout = () => {
  return (
    <div className="min-h-dvh bg-background safe-area-x">
      <main className="pb-safe-20 safe-area-top">
        <Outlet />
      </main>
      <MobileBottomNav />
      <InstallPWA />
    </div>
  )
}
