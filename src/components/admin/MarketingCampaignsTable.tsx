import { useState } from 'react';
import { MarketingCampaign } from '@/types/super-admin.types';
import { useMarketingCampaigns } from '@/hooks/super-admin/useMarketingCampaigns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Edit, Play, Pause, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

export function MarketingCampaignsTable() {
  const { data: campaigns, isLoading } = useMarketingCampaigns();

  const getStatusColor = (status: string) => {
    const colors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      draft: 'secondary',
      scheduled: 'outline',
      active: 'default',
      paused: 'destructive',
      completed: 'secondary',
    };
    return colors[status] || 'outline';
  };

  const getCampaignTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      price_promotion: 'Khuyến mãi giá',
      feature_launch: 'Ra mắt tính năng',
      seasonal_offer: 'Ưu đãi theo mùa',
      win_back: 'Thu hút lại',
      upgrade_incentive: 'Khuyến khích nâng cấp',
    };
    return labels[type] || type;
  };

  const calculateConversionRate = (campaign: MarketingCampaign) => {
    if (campaign.emails_sent === 0) return 0;
    return ((campaign.conversions / campaign.emails_sent) * 100).toFixed(2);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Chiến dịch Marketing</CardTitle>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Tạo chiến dịch
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên chiến dịch</TableHead>
              <TableHead>Loại</TableHead>
              <TableHead>Thời gian</TableHead>
              <TableHead>Hiệu suất</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaigns?.map((campaign) => (
              <TableRow key={campaign.id}>
                <TableCell>
                  <div className="font-medium">{campaign.name}</div>
                  {campaign.description && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {campaign.description}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {getCampaignTypeLabel(campaign.campaign_type)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {format(new Date(campaign.starts_at), 'dd/MM/yyyy')}
                    {campaign.ends_at && (
                      <>
                        {' - '}
                        {format(new Date(campaign.ends_at), 'dd/MM/yyyy')}
                      </>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">Gửi:</span>
                      <span className="font-medium">
                        {campaign.emails_sent}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">Chuyển đổi:</span>
                      <span className="font-medium">
                        {campaign.conversions} ({calculateConversionRate(campaign)}%)
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusColor(campaign.status)}>
                    {campaign.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    {campaign.status === 'active' ? (
                      <Button variant="ghost" size="sm">
                        <Pause className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm">
                        <Play className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="sm">
                      <TrendingUp className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
