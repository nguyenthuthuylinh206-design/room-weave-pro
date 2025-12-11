import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TenantsTable } from './TenantsTable';
import { TenantAnalytics } from './TenantAnalytics';
import { BulkActions } from './BulkActions';
import { PendingTenantsTab } from './PendingTenantsTab';
import { Plus, Download, Search, Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePendingTenants } from '@/hooks/super-admin/useTenantApproval';

export function AdvancedTenantsManagement() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTenants, setSelectedTenants] = useState<string[]>([]);
  
  const { data: pendingTenants } = usePendingTenants();
  const pendingCount = pendingTenants?.length || 0;

  const handleExport = () => {
    console.log('Export tenants data');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Quản lý khách hàng</h1>
          <p className="text-muted-foreground mt-1">
            Quản lý tất cả khách hàng và gói đăng ký của họ
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Thêm khách hàng
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm khách hàng..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Lọc theo trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              <SelectItem value="active">Hoạt động</SelectItem>
              <SelectItem value="trial">Dùng thử</SelectItem>
              <SelectItem value="cancelled">Đã hủy</SelectItem>
              <SelectItem value="suspended">Tạm ngưng</SelectItem>
              <SelectItem value="grace_period">Gia hạn</SelectItem>
            </SelectContent>
          </Select>

          <Select value={planFilter} onValueChange={setPlanFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Lọc theo gói" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả gói</SelectItem>
              <SelectItem value="basic">Cơ bản</SelectItem>
              <SelectItem value="premium">Cao cấp</SelectItem>
              <SelectItem value="enterprise">Doanh nghiệp</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Xuất dữ liệu
          </Button>
        </div>
      </Card>

      {/* Bulk Actions */}
      {selectedTenants.length > 0 && (
        <BulkActions
          selectedTenants={selectedTenants}
          onClearSelection={() => setSelectedTenants([])}
        />
      )}

      {/* Content Tabs */}
      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">Danh sách khách hàng</TabsTrigger>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Chờ phê duyệt
            {pendingCount > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 min-w-5 px-1.5">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="analytics">Phân tích</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <TenantsTable
            statusFilter={statusFilter}
            planFilter={planFilter}
            searchQuery={searchQuery}
            selectedTenants={selectedTenants}
            onSelectionChange={setSelectedTenants}
          />
        </TabsContent>

        <TabsContent value="pending">
          <PendingTenantsTab />
        </TabsContent>

        <TabsContent value="analytics">
          <TenantAnalytics />
        </TabsContent>
      </Tabs>
    </div>
  );
}
