import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

export function AdvancedReminderManagement() {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const { data: allReminders = [] } = useRenewalReminders();
  const { data: pendingReminders = [] } = usePendingReminders();
  const { data: stats } = useReminderStats();
  const scheduleReminders = useScheduleReminders();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Nhắc nhở gia hạn</h1>
          <p className="text-muted-foreground mt-1">
            Thông báo gia hạn tự động cho các gói đăng ký sắp hết hạn
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => scheduleReminders.mutate()}
            disabled={scheduleReminders.isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${scheduleReminders.isPending ? 'animate-spin' : ''}`} />
            Lên lịch nhắc nhở
          </Button>
          <Button onClick={() => setActiveTab('scheduler')}>
            <Calendar className="h-4 w-4 mr-2" />
            Xem lịch
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tổng nhắc nhở
            </CardTitle>
            <Bell className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalReminders || 0}</div>
            <p className="text-xs text-muted-foreground">Tất cả thời gian</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Đang chờ
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pendingReminders || 0}</div>
            <p className="text-xs text-muted-foreground">Sẵn sàng gửi</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Đã gửi
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.sentReminders || 0}</div>
            <p className="text-xs text-muted-foreground">Gửi thành công</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tỷ lệ gửi
            </CardTitle>
            <Zap className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.deliveryRate || 0}%</div>
            <p className="text-xs text-muted-foreground">Tỷ lệ thành công</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Reminders Alert */}
      {pendingReminders.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/30 dark:border-yellow-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="font-medium text-yellow-900 dark:text-yellow-100">
                    {pendingReminders.length} nhắc nhở sẵn sàng gửi
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    Các nhắc nhở này đã được lên lịch và sẵn sàng để gửi
                  </p>
                </div>
              </div>
              <Button
                onClick={() => setActiveTab('list')}
                variant="outline"
                className="border-yellow-300 bg-white dark:bg-yellow-900"
              >
                <Send className="h-4 w-4 mr-2" />
                Xem xét & Gửi
              </Button>
            </div>
          </CardContent>
        </Card>
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
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <ReminderAnalytics />
        <Card>
          <CardHeader>
            <CardTitle>Thao tác nhanh</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <QuickActionButton
              icon={Send}
              label="Gửi nhắc nhở đang chờ"
              description="Gửi tất cả nhắc nhở đã lên lịch ngay bây giờ"
              color="blue"
            />
            <QuickActionButton
              icon={RefreshCw}
              label="Lên lịch nhắc nhở mới"
              description="Tạo nhắc nhở cho các gói sắp hết hạn"
              color="green"
            />
            <QuickActionButton
              icon={Settings}
              label="Cấu hình tự động"
              description="Thiết lập quy tắc nhắc nhở tự động"
              color="purple"
            />
            <QuickActionButton
              icon={Calendar}
              label="Xem lịch"
              description="Xem lịch nhắc nhở sắp tới"
              color="orange"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function QuickActionButton({ icon: Icon, label, description, color }: any) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:hover:bg-blue-900 dark:text-blue-300 dark:border-blue-800',
    green: 'bg-green-50 hover:bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:hover:bg-green-900 dark:text-green-300 dark:border-green-800',
    purple: 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950 dark:hover:bg-purple-900 dark:text-purple-300 dark:border-purple-800',
    orange: 'bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950 dark:hover:bg-orange-900 dark:text-orange-300 dark:border-orange-800',
  };

  return (
    <button
      className={`w-full flex items-center gap-3 p-4 rounded-lg border-2 transition-colors ${colors[color]}`}
    >
      <Icon className="h-5 w-5" />
      <div className="flex-1 text-left">
        <p className="font-medium">{label}</p>
        <p className="text-xs opacity-80">{description}</p>
      </div>
    </button>
  );
}
