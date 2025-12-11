import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, BarChart3, Mail, TrendingUp, Users } from 'lucide-react';
import { CampaignsTable } from './CampaignsTable';
import { EmailTemplateLibrary } from './EmailTemplateLibrary';
import { ABTestingManager } from './ABTestingManager';
import { CampaignAnalytics } from './CampaignAnalytics';
import { useMarketingCampaigns } from '@/hooks/super-admin/useMarketingCampaigns';
import { useNavigate } from 'react-router-dom';

export function AdvancedCampaignManagement() {
  const navigate = useNavigate();
  const { data: campaigns = [] } = useMarketingCampaigns();

  // Calculate stats
  const stats = {
    total: campaigns.length,
    active: campaigns.filter((c: any) => c.status === 'active').length,
    totalSent: campaigns.reduce((sum: number, c: any) => sum + (c.sent_count || 0), 0),
    avgOpenRate: campaigns.length > 0
      ? (campaigns.reduce((sum: number, c: any) => {
          const sent = c.sent_count || 0;
          const opened = c.opened_count || 0;
          return sum + (sent > 0 ? (opened / sent) * 100 : 0);
        }, 0) / campaigns.length).toFixed(1)
      : '0',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Chiến dịch Marketing</h1>
          <p className="text-muted-foreground mt-1">
            Tạo, quản lý và theo dõi các chiến dịch email
          </p>
        </div>
        <Button onClick={() => navigate('/super-admin/campaigns/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Tạo chiến dịch mới
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tổng chiến dịch
            </CardTitle>
            <div className="p-2 rounded-lg bg-blue-500">
              <Mail className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">{stats.active} đang hoạt động</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tổng đã gửi
            </CardTitle>
            <div className="p-2 rounded-lg bg-green-500">
              <Users className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSent}</div>
            <p className="text-xs text-muted-foreground">Email đã gửi thành công</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tỷ lệ mở TB
            </CardTitle>
            <div className="p-2 rounded-lg bg-purple-500">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgOpenRate}%</div>
            <p className="text-xs text-muted-foreground">Trên tất cả chiến dịch</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Hiệu suất
            </CardTitle>
            <div className="p-2 rounded-lg bg-orange-500">
              <BarChart3 className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {parseFloat(stats.avgOpenRate) > 20 ? 'Tốt' : 'Trung bình'}
            </div>
            <p className="text-xs text-muted-foreground">
              {parseFloat(stats.avgOpenRate) > 20 ? 'Trên mức trung bình' : 'Cần cải thiện'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="campaigns" className="space-y-4">
        <TabsList>
          <TabsTrigger value="campaigns">Tất cả chiến dịch</TabsTrigger>
          <TabsTrigger value="templates">Mẫu email</TabsTrigger>
          <TabsTrigger value="ab-testing">A/B Testing</TabsTrigger>
          <TabsTrigger value="analytics">Phân tích</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns">
          <CampaignsTable />
        </TabsContent>

        <TabsContent value="templates">
          <EmailTemplateLibrary />
        </TabsContent>

        <TabsContent value="ab-testing">
          <ABTestingManager />
        </TabsContent>

        <TabsContent value="analytics">
          <CampaignAnalytics />
        </TabsContent>
      </Tabs>
    </div>
  );
}
