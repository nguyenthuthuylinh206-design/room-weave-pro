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
import { Plus, Download } from 'lucide-react';
import { Card } from '@/components/ui/card';

export function AdvancedTenantsManagement() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTenants, setSelectedTenants] = useState<string[]>([]);

  const handleExport = () => {
    console.log('Export tenants data');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tenant Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage all tenants and their subscriptions
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Tenant
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4">
          <Input
            placeholder="Search tenants..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-xs"
          />
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="trial">Trial</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="grace_period">Grace Period</SelectItem>
            </SelectContent>
          </Select>

          <Select value={planFilter} onValueChange={setPlanFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by plan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Plans</SelectItem>
              <SelectItem value="basic">Basic</SelectItem>
              <SelectItem value="premium">Premium</SelectItem>
              <SelectItem value="enterprise">Enterprise</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
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
          <TabsTrigger value="list">All Tenants</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
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

        <TabsContent value="analytics">
          <TenantAnalytics />
        </TabsContent>
      </Tabs>
    </div>
  );
}
