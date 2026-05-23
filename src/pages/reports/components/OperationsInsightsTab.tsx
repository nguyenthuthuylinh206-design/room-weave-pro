import { Skeleton } from '@/components/ui/skeleton'
import { useHotelContext } from '@/contexts/HotelContext'
import { useRevenueReport } from '@/hooks/useRevenueReport'
import { useOperationsInsights, useOperationsAdvice } from '@/hooks/useOperationsInsights'
import { KpiHeroCard } from '@/components/reports/insights/KpiHeroCard'
import { AdviceCard } from '@/components/reports/insights/AdviceCard'
import { InsightsTrendChart } from '@/components/reports/insights/InsightsTrendChart'
import { ExportInsightsPdfButton } from '@/components/reports/insights/ExportInsightsPdfButton'
import { formatCurrency } from '@/lib/utils'

interface Props {
  dateRange: { start: Date; end: Date }
}

export function OperationsInsightsTab({ dateRange }: Props) {
  const { selectedHotel, isAllHotelsMode } = useHotelContext()
  const revenue = useRevenueReport('custom', dateRange)
  const insights = useOperationsInsights(dateRange)
  const advice = useOperationsAdvice(insights.data)

  if (insights.isLoading || !insights.data) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-64" />
        <Skeleton className="h-48" />
      </div>
    )
  }

  if (insights.error) {
    return (
      <div className="border rounded-lg p-8 text-center text-sm text-muted-foreground">
        Chưa đủ dữ liệu để đánh giá. Cần ít nhất một số booking và chi phí trong kỳ.
      </div>
    )
  }

  const { snapshot, derived, ruleFindings } = insights.data
  const aiList = advice.data ?? []
  const adviceItems = aiList.length > 0 ? aiList : []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Đánh giá vận hành</h2>
          <p className="text-sm text-muted-foreground">
            {dateRange.start.toLocaleDateString('vi-VN')} – {dateRange.end.toLocaleDateString('vi-VN')}
            {' • '}
            {snapshot.totalRooms} phòng
          </p>
        </div>
        <ExportInsightsPdfButton
          insights={insights.data}
          advice={aiList}
          fallbackFindings={ruleFindings}
          hotelName={isAllHotelsMode ? 'Tất cả khách sạn' : selectedHotel?.name}
        />
      </div>

      {/* 4 KPI hero */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiHeroCard
          label="Lợi nhuận thuần"
          value={formatCurrency(derived.profit)}
          delta={derived.revenueGrowth}
          hint="Doanh thu thuần − tổng chi phí"
        />
        <KpiHeroCard
          label="Biên lợi nhuận"
          value={`${derived.profitMargin.toFixed(1)}%`}
          benchmark={{ metric: 'profitMargin', value: derived.profitMargin }}
          hint="Lãi / 100đ doanh thu"
        />
        <KpiHeroCard
          label="DT / phòng / ngày"
          value={formatCurrency(derived.revpar)}
          benchmark={{ metric: 'revpar', value: derived.revpar }}
          hint="RevPAR — chuẩn ngành"
        />
        <KpiHeroCard
          label="Tỷ lệ lấp đầy"
          value={`${derived.occupancy.toFixed(1)}%`}
          delta={derived.occupancyGrowth}
          benchmark={{ metric: 'occupancy', value: derived.occupancy }}
        />
      </div>

      {/* KPI phụ */}
      <div className="border rounded-lg divide-y">
        <RowKpi label="Giá phòng trung bình (ADR)" value={formatCurrency(derived.adr)} />
        <RowKpi label="Chi phí / phòng / ngày" value={formatCurrency(derived.costPerRoomDay)} />
        <RowKpi label="Doanh thu dịch vụ thêm" value={`${derived.extraRevenueShare.toFixed(1)}%`} />
        <RowKpi
          label="Số booking"
          value={`${snapshot.bookingsCount} (kỳ trước ${snapshot.prevBookingsCount})`}
        />
      </div>

      {/* Xu hướng */}
      {revenue.data && <InsightsTrendChart data={revenue.data.monthlyTrends} />}

      {/* Lời khuyên */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Lời khuyên ưu tiên</h3>
          {advice.isLoading && (
            <span className="text-xs text-muted-foreground">AI đang phân tích...</span>
          )}
        </div>

        {advice.isLoading && adviceItems.length === 0 && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
        )}

        {!advice.isLoading && adviceItems.length === 0 && ruleFindings.length === 0 && (
          <div className="border rounded-lg p-6 text-center text-sm text-muted-foreground">
            Chưa có lời khuyên — vận hành đang ổn định.
          </div>
        )}

        {/* AI advice nếu có */}
        {adviceItems.length > 0 &&
          adviceItems.map((a, i) => (
            <AdviceCard key={`ai-${i}`} item={{ kind: 'ai', ...a }} />
          ))}

        {/* Fallback rule-based khi AI lỗi */}
        {adviceItems.length === 0 && !advice.isLoading && ruleFindings.length > 0 && (
          <>
            {advice.error && (
              <p className="text-xs text-amber-600">
                AI tạm thời không khả dụng — hiển thị gợi ý cơ bản.
              </p>
            )}
            {ruleFindings.slice(0, 5).map((f) => (
              <AdviceCard key={f.id} item={{ kind: 'rule', ...f }} />
            ))}
          </>
        )}
      </section>
    </div>
  )
}

function RowKpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between p-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold tabular-nums">{value}</span>
    </div>
  )
}
