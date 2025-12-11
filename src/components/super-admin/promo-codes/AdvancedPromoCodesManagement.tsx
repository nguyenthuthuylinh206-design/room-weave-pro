import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, TrendingUp, Tag, Users, DollarSign } from 'lucide-react';
import { PromoCodesTable } from './PromoCodesTable';
import { PromoCodeAnalytics } from './PromoCodeAnalytics';
import { PromoCodeForm } from './PromoCodeForm';
import { BulkPromoCodeGenerator } from './BulkPromoCodeGenerator';
import { usePromoCodes } from '@/hooks/super-admin/usePromoCodes';

export function AdvancedPromoCodesManagement() {
  const [formOpen, setFormOpen] = useState(false);
  const [bulkGenOpen, setBulkGenOpen] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const { data: promoCodes = [] } = usePromoCodes();

  // Calculate stats
  const stats = {
    total: promoCodes.length,
    active: promoCodes.filter((p: any) => p.is_active).length,
    totalUsage: promoCodes.reduce((sum: number, p: any) => sum + (p.times_used || 0), 0),
    totalDiscount: promoCodes.reduce((sum: number, p: any) => {
      return sum + (p.times_used || 0) * (p.discount_type === 'percentage' ? 20 : p.discount_value);
    }, 0),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Mã khuyến mãi</h1>
          <p className="text-muted-foreground mt-1">
            Tạo và quản lý mã giảm giá cho khách hàng
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setBulkGenOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Tạo hàng loạt
          </Button>
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Tạo mã mới
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tổng số mã
            </CardTitle>
            <div className="p-2 rounded-lg bg-purple-500">
              <Tag className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.active} mã đang hoạt động
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tổng lượt sử dụng
            </CardTitle>
            <div className="p-2 rounded-lg bg-blue-500">
              <Users className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsage}</div>
            <p className="text-xs text-muted-foreground">
              Số lần mã được áp dụng
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tổng giảm giá đã áp dụng
            </CardTitle>
            <div className="p-2 rounded-lg bg-green-500">
              <DollarSign className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalDiscount.toLocaleString('vi-VN')}đ
            </div>
            <p className="text-xs text-muted-foreground">
              Giá trị ước tính
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tỷ lệ chuyển đổi
            </CardTitle>
            <div className="p-2 rounded-lg bg-orange-500">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.total > 0 ? ((stats.totalUsage / stats.total) * 100).toFixed(1) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Mã đã dùng / mã tạo ra
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Lọc theo loại" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả loại</SelectItem>
              <SelectItem value="percentage">Giảm theo %</SelectItem>
              <SelectItem value="fixed_amount">Giảm cố định</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Lọc theo trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              <SelectItem value="active">Hoạt động</SelectItem>
              <SelectItem value="expired">Hết hạn</SelectItem>
              <SelectItem value="used_up">Đã dùng hết</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">Tất cả mã</TabsTrigger>
          <TabsTrigger value="analytics">Phân tích</TabsTrigger>
          <TabsTrigger value="templates">Mẫu có sẵn</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <PromoCodesTable />
        </TabsContent>

        <TabsContent value="analytics">
          <PromoCodeAnalytics />
        </TabsContent>

        <TabsContent value="templates">
          <PromoCodeTemplates />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <PromoCodeForm
        promoCode={null}
        open={formOpen}
        onOpenChange={setFormOpen}
      />
      <BulkPromoCodeGenerator
        open={bulkGenOpen}
        onOpenChange={setBulkGenOpen}
      />
    </div>
  );
}

function PromoCodeTemplates() {
  const templates = [
    {
      name: 'Chào mừng khách mới',
      code: 'WELCOME20',
      discount: 'Giảm 20%',
      description: 'Ưu đãi chào mừng khách hàng mới đăng ký',
    },
    {
      name: 'Khuyến mãi mùa hè',
      code: 'SUMMER2024',
      discount: 'Giảm 500.000đ',
      description: 'Chương trình khuyến mãi mùa hè',
    },
    {
      name: 'Giới thiệu bạn bè',
      code: 'REFER30',
      discount: 'Giảm 30%',
      description: 'Ưu đãi chương trình giới thiệu',
    },
    {
      name: 'Dùng thử doanh nghiệp',
      code: 'ENTFREE',
      discount: 'Miễn phí 100%',
      description: 'Dùng thử miễn phí gói doanh nghiệp',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {templates.map((template) => (
        <Card key={template.code} className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg">{template.name}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
              </div>
              <Badge variant="secondary">{template.discount}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="font-mono font-bold text-lg text-purple-600">
                {template.code}
              </div>
              <Button size="sm">Sử dụng mẫu</Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
