import { TenantsTable } from '@/components/super-admin/tenants/TenantsTable';
import { Shield } from 'lucide-react';

export function TenantsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-lg bg-primary/10">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Tenants Management</h1>
          <p className="text-muted-foreground">
            Quản lý tất cả khách hàng và đăng ký của họ
          </p>
        </div>
      </div>

      <TenantsTable />
    </div>
  );
}
