import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'
import { useRoomPerformance } from '@/hooks/useRoomPerformance'
import { formatCurrency } from '@/lib/utils'
import type { RoomCheckWithUser } from '@/types/rooms.types'

interface Props {
  roomId: string
  checks: RoomCheckWithUser[]
  totalStandard: number
  missingCount: number
}

function calcHealth(checks: RoomCheckWithUser[], totalItems: number, missingItems: number): number {
  let score = 100
  const since = new Date()
  since.setDate(since.getDate() - 30)
  const recent = checks.filter((c) => new Date(c.checked_at) > since)
  if (recent.length === 0) score -= 30
  else if (recent.length < 5) score -= 15
  const avg = checks.length > 0 ? checks.reduce((s, c) => s + (c.cleanliness_score || 0), 0) / checks.length : 5
  if (avg < 3) score -= 25
  else if (avg < 4) score -= 10
  const missingPct = totalItems > 0 ? (missingItems / totalItems) * 100 : 0
  score -= missingPct * 0.5
  const incomplete = checks.filter((c) => !c.items_complete).length
  const incompletePct = checks.length > 0 ? (incomplete / checks.length) * 100 : 0
  score -= incompletePct * 0.3
  return Math.max(0, Math.min(100, Math.round(score)))
}

function formatShort(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`
  return String(Math.round(n))
}

export function PanelPerformance({ roomId, checks, totalStandard, missingCount }: Props) {
  const { data, isLoading } = useRoomPerformance(roomId, 30)
  const health = calcHealth(checks, totalStandard, missingCount)
  const healthColor = health >= 80 ? 'text-green-600' : health >= 60 ? 'text-amber-600' : 'text-red-600'

  return (
    <div className="border rounded-lg p-4 h-full flex flex-col">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Hiệu suất 30 ngày</p>

      {/* Revenue + sparkline */}
      <div className="mt-2 mb-3">
        {isLoading ? (
          <Skeleton className="h-8 w-32" />
        ) : (
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold">{formatCurrency(data?.totalRevenue || 0)}</span>
          </div>
        )}
        <p className="text-[11px] text-muted-foreground">Doanh thu phòng</p>

        <div className="h-12 mt-2">
          {isLoading ? (
            <Skeleton className="h-full w-full" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.dailyRevenue || []}>
                <Tooltip
                  cursor={false}
                  content={({ active, payload }) =>
                    active && payload?.[0] ? (
                      <div className="bg-card border rounded px-2 py-1 text-[10px] shadow">
                        <div className="text-muted-foreground">{payload[0].payload.date}</div>
                        <div className="font-semibold">{formatCurrency(Number(payload[0].value))}</div>
                      </div>
                    ) : null
                  }
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(var(--primary))"
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 3 KPI tiles */}
      <div className="grid grid-cols-3 gap-2 text-center mb-3">
        <KPI label="Lấp đầy" value={isLoading ? '—' : `${Math.round((data?.occupancyRate || 0) * 100)}%`} />
        <KPI label="ADR" value={isLoading ? '—' : formatShort(data?.adr || 0)} />
        <KPI label="Sức khỏe" value={String(health)} valueClassName={healthColor} />
      </div>

      {/* Bottom stats */}
      <div className="mt-auto border-t pt-3 text-xs space-y-1">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Lượt khách</span>
          <span className="font-medium">{isLoading ? '—' : `${data?.guestCount ?? 0}`}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Đêm trung bình</span>
          <span className="font-medium">
            {isLoading ? '—' : `${(data?.avgStayNights ?? 0).toFixed(1)} đêm`}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Số booking</span>
          <span className="font-medium">{isLoading ? '—' : `${data?.bookingCount ?? 0}`}</span>
        </div>
      </div>
    </div>
  )
}

function KPI({ label, value, valueClassName }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div className="border rounded p-2">
      <p className={`text-base font-bold leading-tight ${valueClassName || ''}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
    </div>
  )
}
