import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Tag,
  Mail,
  Bell,
  DollarSign,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useSuperAdminAuth } from '@/hooks/useSuperAdminAuth';

const navigation = [
  { name: 'Tổng quan', href: '/super-admin', icon: LayoutDashboard },
  { name: 'Khách hàng', href: '/super-admin/tenants', icon: Users },
  { name: 'Mã khuyến mãi', href: '/super-admin/promo-codes', icon: Tag },
  { name: 'Chiến dịch', href: '/super-admin/campaigns', icon: Mail },
  { name: 'Nhắc nhở', href: '/super-admin/reminders', icon: Bell },
  { name: 'Gói dịch vụ', href: '/super-admin/pricing', icon: DollarSign },
  { name: 'Thống kê', href: '/super-admin/analytics', icon: BarChart3 },
  { name: 'Cài đặt', href: '/super-admin/settings', icon: Settings },
];

const navigationTitles: Record<string, string> = {
  '/super-admin': 'Tổng quan',
  '/super-admin/tenants': 'Quản lý khách hàng',
  '/super-admin/promo-codes': 'Mã khuyến mãi',
  '/super-admin/campaigns': 'Chiến dịch marketing',
  '/super-admin/reminders': 'Nhắc nhở gia hạn',
  '/super-admin/pricing': 'Gói dịch vụ',
  '/super-admin/analytics': 'Thống kê & Báo cáo',
  '/super-admin/settings': 'Cài đặt hệ thống',
};

export function SuperAdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { user, isLoading, signOut } = useSuperAdminAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-muted/30">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Đang tải cổng quản trị...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-muted/30">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 transform bg-card border-r transition-transform duration-300 ease-in-out lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between px-4 border-b">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary to-primary/60">
                <Shield className="h-5 w-5 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-bold text-foreground">Quản trị viên</h1>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-6 w-6" />
            </Button>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 px-3 py-4">
            <nav className="space-y-1">
              {navigation.map((item) => {
                const isActive = item.href === '/super-admin' 
                  ? location.pathname === '/super-admin'
                  : location.pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </ScrollArea>

          {/* User info */}
          <div className="border-t p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-semibold">
                SA
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {user?.email}
                </p>
                <p className="text-xs text-muted-foreground">Quản trị viên cấp cao</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={signOut}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Đăng xuất
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-16 border-b bg-card px-4 flex items-center justify-between lg:px-8">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </Button>
          
          <div className="flex-1 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-foreground">
              {navigationTitles[location.pathname] || 'Tổng quan'}
            </h2>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
