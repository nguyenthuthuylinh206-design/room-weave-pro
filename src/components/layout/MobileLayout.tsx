import { Outlet } from 'react-router-dom'
import { MobileBottomNav } from './MobileBottomNav'
import { InstallPWA } from '@/components/pwa/InstallPWA'

export const MobileLayout = () => {
  return (
    <div className="min-h-screen bg-background">
      <main className="pb-16">
        <Outlet />
      </main>
      <MobileBottomNav />
      <InstallPWA />
    </div>
  )
}
