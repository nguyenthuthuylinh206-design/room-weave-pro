import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  Bell, 
  Send, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  Settings,
  Calendar,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { RemindersTable } from './RemindersTable';
import { ReminderAutomationRules } from './ReminderAutomationRules';
import { ReminderTemplates } from './ReminderTemplates';
import { ReminderScheduler } from './ReminderScheduler';
import { ReminderAnalytics } from './ReminderAnalytics';
import {
  useRenewalReminders,
  usePendingReminders,
  useScheduleReminders,
  useReminderStats,
} from '@/hooks/super-admin/useRenewalReminders';
import { PageHeader } from '../shared/PageHeader';
import { StatCard } from '../shared/StatCard';

export function AdvancedReminderManagement() {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const { data: allReminders = [] } = useRenewalReminders();
  const { data: pendingReminders = [] } = usePendingReminders();
  const { data: stats } = useReminderStats();
  const scheduleReminders = useScheduleReminders();

  return (
    <div className="space-y-4">
      {/* Header */}
      <PageHeader
        title="Nhắc nhở gia hạn"
        description="Thông báo gia hạn tự động cho các gói đăng ký sắp hết hạn"
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => scheduleReminders.mutate()}
              disabled={scheduleReminders.isPending}
            >
              <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", scheduleReminders.isPending && 'animate-spin')} />
              Lên lịch nhắc nhở
            </Button>
            <Button size="sm" onClick={() => setActiveTab('scheduler')}>
              <Calendar className="h-3.5 w-3.5 mr-1.5" />
              Xem lịch
            </Button>
          </>
        }
      />

      {/* Stats Cards */}
      <div className="grid gap-3 md:grid-cols-4">
        <StatCard
          title="Tổng nhắc nhở"
          value={stats?.totalReminders || 0}
          icon={Bell}
          description="Tất cả thời gian"
        />
        <StatCard
          title="Đang chờ"
          value={stats?.pendingReminders || 0}
          icon={Clock}
          description="Sẵn sàng gửi"
        />
        <StatCard
          title="Đã gửi"
          value={stats?.sentReminders || 0}
          icon={CheckCircle2}
          description="Gửi thành công"
        />
        <StatCard
          title="Tỷ lệ gửi"
          value={`${stats?.deliveryRate || 0}%`}
          icon={Zap}
          description="Tỷ lệ thành công"
        />
      </div>

      {/* Pending Reminders Alert */}
      {pendingReminders.length > 0 && (
        <div className="flex items-center justify-between p-3 border rounded-lg border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <div>
              <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                {pendingReminders.length} nhắc nhở sẵn sàng gửi
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Các nhắc nhở này đã được lên lịch và sẵn sàng để gửi
              </p>
            </div>
          </div>
          <Button
            onClick={() => setActiveTab('list')}
            variant="outline"
            size="sm"
            className="h-8 border-amber-300 bg-white dark:bg-amber-900"
          >
            <Send className="h-3.5 w-3.5 mr-1.5" />
            Xem xét & Gửi
          </Button>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="dashboard">Tổng quan</TabsTrigger>
          <TabsTrigger value="list">Tất cả nhắc nhở</TabsTrigger>
          <TabsTrigger value="automation">Tự động hóa</TabsTrigger>
          <TabsTrigger value="templates">Mẫu</TabsTrigger>
          <TabsTrigger value="scheduler">Lịch</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <ReminderDashboard />
        </TabsContent>

        <TabsContent value="list">
          <RemindersTable />
        </TabsContent>

        <TabsContent value="automation">
          <ReminderAutomationRules />
        </TabsContent>

        <TabsContent value="templates">
          <ReminderTemplates />
        </TabsContent>

        <TabsContent value="scheduler">
          <ReminderScheduler />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ReminderDashboard() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <ReminderAnalytics />
        <div className="border rounded-lg p-4">
          <h3 className="text-sm font-medium mb-3">Thao tác nhanh</h3>
          <div className="space-y-1.5">
            <QuickActionButton
              icon={Send}
              label="Gửi nhắc nhở đang chờ"
              description="Gửi tất cả nhắc nhở đã lên lịch ngay bây giờ"
              iconColor="text-blue-600"
            />
            <QuickActionButton
              icon={RefreshCw}
              label="Lên lịch nhắc nhở mới"
              description="Tạo nhắc nhở cho các gói sắp hết hạn"
              iconColor="text-green-600"
            />
            <QuickActionButton
              icon={Settings}
              label="Cấu hình tự động"
              description="Thiết lập quy tắc nhắc nhở tự động"
              iconColor="text-purple-600"
            />
            <QuickActionButton
              icon={Calendar}
              label="Xem lịch"
              description="Xem lịch nhắc nhở sắp tới"
              iconColor="text-orange-600"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickActionButton({ icon: Icon, label, description, iconColor }: any) {
  return (
    <button
      className="w-full flex items-center gap-3 p-3 rounded-md border hover:bg-accent transition-colors text-left"
    >
      <Icon className={cn("h-4 w-4", iconColor)} />
      <div className="flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </button>
  );
}
