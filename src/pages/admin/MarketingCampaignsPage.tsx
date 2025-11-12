import { MarketingCampaignsTable } from '@/components/admin/MarketingCampaignsTable';
import { Shield } from 'lucide-react';

export function MarketingCampaignsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-lg bg-primary/10">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Chiến dịch Marketing</h1>
          <p className="text-muted-foreground">
            Tạo và quản lý các chiến dịch marketing, email, khuyến mãi
          </p>
        </div>
      </div>

      <MarketingCampaignsTable />
    </div>
  );
}
