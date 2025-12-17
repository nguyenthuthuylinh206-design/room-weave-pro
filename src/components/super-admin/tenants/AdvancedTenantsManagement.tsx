import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { Plus, Download, Search } from 'lucide-react';
import { Card } from '@/components/ui/card';

export function AdvancedTenantsManagement() {
  const { t } = useTranslation('superAdmin');
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
          <h1 className="text-3xl font-bold">{t('tenants.title')}</h1>
          <p className="text-muted-foreground mt-1">
            {t('tenants.subtitle')}
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          {t('tenants.addTenant')}
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('tenants.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t('tenants.filterByStatus')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('tenants.allStatus')}</SelectItem>
              <SelectItem value="active">{t('tenants.status.active')}</SelectItem>
              <SelectItem value="trial">{t('tenants.status.trial')}</SelectItem>
              <SelectItem value="cancelled">{t('tenants.status.cancelled')}</SelectItem>
              <SelectItem value="suspended">{t('tenants.status.suspended')}</SelectItem>
              <SelectItem value="grace_period">{t('tenants.status.gracePeriod')}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={planFilter} onValueChange={setPlanFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t('tenants.filterByPlan')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('tenants.allPlans')}</SelectItem>
              <SelectItem value="basic">{t('tenants.plans.basic')}</SelectItem>
              <SelectItem value="premium">{t('tenants.plans.premium')}</SelectItem>
              <SelectItem value="enterprise">{t('tenants.plans.enterprise')}</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            {t('tenants.exportData')}
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
          <TabsTrigger value="list">{t('tenants.listTab')}</TabsTrigger>
          <TabsTrigger value="analytics">{t('tenants.analyticsTab')}</TabsTrigger>
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
