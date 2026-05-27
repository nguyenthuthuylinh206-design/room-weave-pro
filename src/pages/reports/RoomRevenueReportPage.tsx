import { useState } from 'react'
import { PeriodPresetChips } from '@/components/reports/PeriodPresetChips'
import { resolvePeriod, type PeriodPresetId } from '@/lib/reportPeriods'
import { useRoomRevenueMetrics } from '@/hooks/useRoomRevenueMetrics'
import { RoomRevenueKpiHeadline } from '@/components/reports/room-revenue/RoomRevenueKpiHeadline'
import { OccupancyRevparChart } from '@/components/reports/room-revenue/OccupancyRevparChart'
import { TopRoomsTable } from '@/components/reports/room-revenue/TopRoomsTable'
import { ChannelMixPanel } from '@/components/reports/room-revenue/ChannelMixPanel'
import { RoomRevenueInsights } from '@/components/reports/room-revenue/RoomRevenueInsights'

/**
 * /reports/room-revenue
 * Báo cáo doanh thu phòng — trang chính cho chủ KS xem hàng ngày.
 * 4 KPI: Doanh thu • Occupancy • ADR • RevPAR + chart + top rooms + kênh + insight.
 */
export function RoomRevenueReportPage() {
  const [presetId, setPresetId] = useState<PeriodPresetId>('this_month')
  const period = resolvePeriod(presetId)
  const m = useRoomRevenueMetrics(period)

  return (
    <div className="space-y-4 p-3 sm:p-4 max-w-7xl mx-auto">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Doanh thu phòng</h1>
        <p className="text-sm text-muted-foreground">
          Hôm nay thu bao nhiêu? Lấp đầy bao nhiêu %? Giá trung bình mỗi đêm?
        </p>
      </header>

      <PeriodPresetChips value={presetId} onChange={setPresetId} />

      <RoomRevenueKpiHeadline m={m} />

      <OccupancyRevparChart data={m.rooms?.occupancyTrend || []} loading={m.loading} />

      <TopRoomsTable
        topRooms={m.revenue?.topRooms || []}
        revenueByRoom={m.rooms?.revenueByRoom || []}
        loading={m.loading}
      />

      <ChannelMixPanel bySource={m.revenue?.bySource || []} loading={m.loading} />

      <RoomRevenueInsights m={m} />
    </div>
  )
}

export default RoomRevenueReportPage
