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
          <h1 className="text-3xl font-bold">Renewal Reminders</h1>
          <p className="text-muted-foreground mt-1">
            Automated renewal notifications for expiring subscriptions
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => scheduleReminders.mutate()}
            disabled={scheduleReminders.isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${scheduleReminders.isPending ? 'animate-spin' : ''}`} />
            Schedule Reminders
          </Button>
          <Button onClick={() => setActiveTab('scheduler')}>
            <Calendar className="h-4 w-4 mr-2" />
            View Schedule
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Reminders
            </CardTitle>
            <Bell className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalReminders || 0}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pendingReminders || 0}</div>
            <p className="text-xs text-muted-foreground">Ready to send</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sent
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.sentReminders || 0}</div>
            <p className="text-xs text-muted-foreground">Successfully delivered</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Delivery Rate
            </CardTitle>
            <Zap className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.deliveryRate || 0}%</div>
            <p className="text-xs text-muted-foreground">Success rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Reminders Alert */}
      {pendingReminders.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="font-medium text-yellow-900">
                    {pendingReminders.length} reminder(s) ready to send
                  </p>
                  <p className="text-sm text-yellow-700">
                    These reminders are scheduled and ready to be delivered
                  </p>
                </div>
              </div>
              <Button
                onClick={() => setActiveTab('list')}
                variant="outline"
                className="border-yellow-300 bg-white"
              >
                <Send className="h-4 w-4 mr-2" />
                Review & Send
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="list">All Reminders</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="scheduler">Scheduler</TabsTrigger>
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
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <QuickActionButton
              icon={Send}
              label="Send Pending Reminders"
              description="Send all scheduled reminders now"
              color="blue"
            />
            <QuickActionButton
              icon={RefreshCw}
              label="Schedule New Reminders"
              description="Generate reminders for expiring subscriptions"
              color="green"
            />
            <QuickActionButton
              icon={Settings}
              label="Configure Automation"
              description="Set up automatic reminder rules"
              color="purple"
            />
            <QuickActionButton
              icon={Calendar}
              label="View Calendar"
              description="See upcoming reminder schedule"
              color="orange"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function QuickActionButton({ icon: Icon, label, description, color }: any) {
  const colors = {
    blue: 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200',
    green: 'bg-green-50 hover:bg-green-100 text-green-700 border-green-200',
    purple: 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200',
    orange: 'bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200',
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
