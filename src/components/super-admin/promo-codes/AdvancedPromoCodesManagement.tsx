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
          <h1 className="text-3xl font-bold">Promotional Codes</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage discount codes for your tenants
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setBulkGenOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Bulk Generate
          </Button>
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Code
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Codes
            </CardTitle>
            <div className="p-2 rounded-lg bg-purple-500">
              <Tag className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.active} active codes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Usage
            </CardTitle>
            <div className="p-2 rounded-lg bg-blue-500">
              <Users className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsage}</div>
            <p className="text-xs text-muted-foreground">
              Times codes were applied
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Discount Given
            </CardTitle>
            <div className="p-2 rounded-lg bg-green-500">
              <DollarSign className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats.totalDiscount.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Estimated total value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Conversion Rate
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
              Codes used vs created
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="percentage">Percentage Off</SelectItem>
              <SelectItem value="fixed_amount">Fixed Amount</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="used_up">Used Up</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">All Codes</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
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
      name: 'New Customer Welcome',
      code: 'WELCOME20',
      discount: '20% off',
      description: 'Welcome discount for new signups',
    },
    {
      name: 'Seasonal Sale',
      code: 'SUMMER2024',
      discount: '$50 off',
      description: 'Summer seasonal promotion',
    },
    {
      name: 'Referral Bonus',
      code: 'REFER30',
      discount: '30% off',
      description: 'Referral program discount',
    },
    {
      name: 'Enterprise Trial',
      code: 'ENTFREE',
      discount: '100% off',
      description: 'Free trial for enterprise plan',
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
              <Button size="sm">Use Template</Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
