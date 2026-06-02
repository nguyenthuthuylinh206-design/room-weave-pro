import { useHousekeepingKpi } from '@/hooks/useHousekeepingKpi'
import { useRoomsNeedingActionToday } from '@/hooks/useRoomsNeedingActionToday'
import { useHotelContext } from '@/contexts/HotelContext'
import { KpiRow } from '@/components/housekeeping/dashboard/KpiRow'
import { ActionRow } from '@/components/housekeeping/dashboard/ActionRow'

export default function HousekeepingDashboardPage() {
  const { selectedHotel, isAllHotelsMode } = useHotelContext()
  const hotelId = isAllHotelsMode ? null : selectedHotel?.id

  const kpi = useHousekeepingKpi(hotelId)
  const buckets = useRoomsNeedingActionToday(hotelId)

  return (
    <div className="flex flex-col gap-4 p-3 sm:p-4 max-w-[1440px] mx-auto w-full">
      <header className="flex items-baseline justify-between gap-2">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold">Tổng quan buồng phòng</h1>
          <p className="text-xs text-muted-foreground">
            {selectedHotel?.name || (isAllHotelsMode ? 'Tất cả khách sạn' : '—')}
          </p>
        </div>
      </header>

      {isAllHotelsMode && (
        <div className="border rounded-lg p-3 text-sm text-amber-700 bg-amber-50 dark:bg-amber-950/20 dark:text-amber-400">
          Chọn một khách sạn cụ thể để xem cockpit Trưởng buồng phòng.
        </div>
      )}

      {!isAllHotelsMode && (
        <>
          <section>
            <KpiRow data={kpi.data} loading={kpi.isLoading} />
          </section>

          <section>
            <div className="flex items-baseline justify-between mb-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Cần xử lý ngay</h2>
            </div>
            <ActionRow data={buckets.data} loading={buckets.isLoading} />
          </section>

          <section className="border rounded-lg p-4 text-sm text-muted-foreground">
            Sơ đồ phòng và tiến độ nhân viên sẽ ra mắt ở phiên bản kế tiếp.
          </section>
        </>
      )}
    </div>
  )
}
