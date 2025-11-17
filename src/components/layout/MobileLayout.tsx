import { Outlet } from 'react-router-dom'
import { MobileBottomNav } from './MobileBottomNav'

export const MobileLayout = () => {
  return (
    <div className="min-h-screen bg-background">
      <main className="pb-16">
        <Outlet />
      </main>
      <MobileBottomNav />
    </div>
  )
}
