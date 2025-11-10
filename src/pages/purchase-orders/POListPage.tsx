import React, { useState } from 'react';
import { usePurchaseOrders, usePOStats } from '@/hooks/usePurchaseOrders';
import { POFilters as POFiltersType } from '@/types/purchase-order.types';
import POTable from '@/components/purchase-orders/POTable';
import POFilters from '@/components/purchase-orders/POFilters';
import POStatsCards from '@/components/purchase-orders/POStatsCards';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, FileDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

const POListPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState<string>('all');
  const [filters, setFilters] = useState<POFiltersType>({
    status: 'all',
    sort_by: 'date',
    sort_order: 'desc'
  });
  const [selectedPOs, setSelectedPOs] = useState<string[]>([]);

  const { data: stats } = usePOStats();
  const { data: purchaseOrders, isLoading } = usePurchaseOrders(filters);

  const handleFilterChange = (newFilters: Partial<POFiltersType>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleTabChange = (value: string) => {
    setSelectedTab(value);
    if (value === 'all') {
      handleFilterChange({ status: 'all' });
    } else {
      handleFilterChange({ status: value as any });
    }
  };

  const getTabCount = (status: string) => {
    if (!purchaseOrders) return 0;
    if (status === 'all') return purchaseOrders.length;
    return purchaseOrders.filter(po => po.status === status).length;
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Đơn đặt hàng</h1>
          <p className="text-muted-foreground mt-1">
            Quản lý đơn đặt hàng từ nhà cung cấp
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <FileDown className="w-4 h-4 mr-2" />
            Xuất Excel
          </Button>
          <Button onClick={() => navigate('/purchase-orders/new')}>
            <Plus className="w-4 h-4 mr-2" />
            Tạo đơn mới
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="all">
            Tất cả ({getTabCount('all')})
          </TabsTrigger>
          <TabsTrigger value="draft">
            Nháp ({getTabCount('draft')})
          </TabsTrigger>
          <TabsTrigger value="submitted">
            Chờ duyệt ({getTabCount('submitted')})
          </TabsTrigger>
          <TabsTrigger value="approved">
            Đã duyệt ({getTabCount('approved')})
          </TabsTrigger>
          <TabsTrigger value="ordered">
            Đã đặt ({getTabCount('ordered')})
          </TabsTrigger>
          <TabsTrigger value="partial">
            Nhận 1 phần ({getTabCount('partial')})
          </TabsTrigger>
          <TabsTrigger value="received">
            Hoàn thành ({getTabCount('received')})
          </TabsTrigger>
          <TabsTrigger value="cancelled">
            Đã hủy ({getTabCount('cancelled')})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Stats Cards */}
      <POStatsCards stats={stats} />

      {/* Filters */}
      <POFilters filters={filters} onChange={handleFilterChange} />

      {/* Quick Filters */}
      <div className="flex flex-wrap gap-2">
        <Badge
          variant="outline"
          className="cursor-pointer hover:bg-accent"
          onClick={() => handleFilterChange({ created_by: 'me' })}
        >
          Do tôi tạo
        </Badge>
        <Badge
          variant="outline"
          className="cursor-pointer hover:bg-accent"
          onClick={() => handleFilterChange({ status: 'submitted' })}
        >
          Cần duyệt của tôi
        </Badge>
        <Badge
          variant="outline"
          className="cursor-pointer hover:bg-accent"
          onClick={() => handleFilterChange({ min_amount: 10000000 })}
        >
          Tổng giá trị &gt; 10M
        </Badge>
      </div>

      {/* Content */}
      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <POTable
          purchaseOrders={purchaseOrders || []}
          selectedPOs={selectedPOs}
          onSelectionChange={setSelectedPOs}
        />
      )}
    </div>
  );
};

export default POListPage;
