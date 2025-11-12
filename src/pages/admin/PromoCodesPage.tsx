import { PromoCodesTable } from '@/components/admin/PromoCodesTable';
import { Shield } from 'lucide-react';

export function PromoCodesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-lg bg-primary/10">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Mã khuyến mãi</h1>
          <p className="text-muted-foreground">
            Quản lý mã giảm giá và chương trình khuyến mãi
          </p>
        </div>
      </div>

      <PromoCodesTable />
    </div>
  );
}
