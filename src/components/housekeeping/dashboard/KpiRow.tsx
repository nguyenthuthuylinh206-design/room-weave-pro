import { KpiTile } from './KpiTile'
import type { HousekeepingKpi } from '@/hooks/useHousekeepingKpi'

interface KpiRowProps {
  data?: HousekeepingKpi
  loading?: boolean
}

export function KpiRow({ data, loading }: KpiRowProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
      <KpiTile label="Tổng phòng" value={data?.totalRooms ?? 0} loading={loading} to="/rooms" />
      <KpiTile label="Đang có khách" value={data?.occupied ?? 0} loading={loading} to="/rooms?view=grid&status=occupied" tone="info" />
      <KpiTile label="Trả phòng hôm nay" value={data?.checkoutToday ?? 0} loading={loading} to="/bookings?tab=checkout-today" tone="warning" />
      <KpiTile label="Cần dọn" value={data?.needCleaning ?? 0} loading={loading} to="/rooms?view=grid&status=vacant_dirty" tone={data && data.needCleaning > 0 ? 'danger' : 'default'} />
      <KpiTile label="Bảo trì" value={data?.maintenance ?? 0} loading={loading} to="/maintenance/requests" tone={data && data.maintenance > 0 ? 'warning' : 'default'} />
      <KpiTile label="Thiếu đồ" value={data?.missingItems ?? 0} loading={loading} to="/rooms?view=grid&missing=1" tone={data && data.missingItems > 0 ? 'danger' : 'default'} />
    </div>
  )
}
