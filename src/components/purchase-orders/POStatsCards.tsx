import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Clock, CheckCircle, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface POStats {
  total_pos: number;
  pending_approval: number;
  total_value_30d: number;
  completed_30d: number;
}

interface POStatsCardsProps {
  stats?: POStats;
}

const POStatsCards: React.FC<POStatsCardsProps> = ({ stats }) => {
  if (!stats) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tổng đơn</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total_pos}</div>
          <p className="text-xs text-muted-foreground">Tất cả đơn đặt hàng</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Chờ duyệt</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.pending_approval}</div>
          <p className="text-xs text-muted-foreground">Cần xử lý</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">GT 30 ngày</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(stats.total_value_30d)}
          </div>
          <p className="text-xs text-muted-foreground">Tổng giá trị</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Hoàn thành</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.completed_30d}</div>
          <p className="text-xs text-muted-foreground">30 ngày qua</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default POStatsCards;
