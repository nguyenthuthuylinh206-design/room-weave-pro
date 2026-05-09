import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { Truck, ImageIcon } from 'lucide-react'
import { useRoomDistributionHistory } from '@/hooks/useRoomDistributionHistory'
import type { RoomCheckWithUser, RoomItemWithDetails } from '@/types/rooms.types'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'

interface Props {
  roomId: string
  items: RoomItemWithDetails[]
  checks: RoomCheckWithUser[]
  onScrollToDelivery?: () => void
}

export function PanelAssetStatus({ roomId, items, checks, onScrollToDelivery }: Props) {
  const standardItems = items.filter((i) => i.has_standard)
  const completeCount = standardItems.filter((i) => i.missing_quantity === 0).length
  const missingCount = standardItems.filter((i) => i.missing_quantity > 0).length
  const totalStandard = standardItems.length

  // Damaged: aggregate from latest check
  const lastCheck = checks?.[0]
  const damagedCount = Array.isArray(lastCheck?.items_damaged) ? lastCheck!.items_damaged.length : 0

  const completePct = totalStandard > 0 ? Math.round((completeCount / totalStandard) * 100) : 0

  const chartData = [
    { name: 'Đủ', value: Math.max(completeCount, 0), color: 'hsl(142 76% 36%)' },
    { name: 'Thiếu', value: Math.max(missingCount, 0), color: 'hsl(0 84% 60%)' },
    { name: 'Hỏng', value: Math.max(damagedCount, 0), color: 'hsl(38 92% 50%)' },
  ].filter((d) => d.value > 0)

  // Pending deliveries
  const { data: deliveryHistory } = useRoomDistributionHistory(roomId)
  const pendingDelivery = deliveryHistory?.filter(
    (h) => h.room_status === 'pending' || h.room_status === 'delivered'
  ).length || 0

  const photos = (lastCheck?.photos as string[] | undefined)?.slice(0, 4) || []

  return (
    <div className="border rounded-lg p-4 h-full flex flex-col">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">
        Tình trạng tài sản
      </p>

      {/* Donut + legend */}
      <div className="flex items-center gap-3 mb-3">
        <div className="relative h-[120px] w-[120px] flex-shrink-0">
          {totalStandard > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  innerRadius={42}
                  outerRadius={56}
                  dataKey="value"
                  stroke="none"
                >
                  {chartData.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="absolute inset-0 rounded-full border-4 border-muted" />
          )}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold leading-none">{completePct}%</span>
            <span className="text-[10px] text-muted-foreground">đạt chuẩn</span>
          </div>
        </div>

        <div className="flex-1 space-y-1.5 text-xs">
          <LegendRow color="hsl(142 76% 36%)" label="Đủ" value={completeCount} className="text-green-600" />
          <LegendRow color="hsl(0 84% 60%)" label="Thiếu" value={missingCount} className="text-red-600" />
          <LegendRow color="hsl(38 92% 50%)" label="Hỏng" value={damagedCount} className="text-amber-600" />
          <p className="text-[10px] text-muted-foreground pt-1 border-t">
            {totalStandard} món tiêu chuẩn
          </p>
        </div>
      </div>

      {/* Pending deliveries */}
      {pendingDelivery > 0 && (
        <button
          onClick={onScrollToDelivery}
          className="flex items-center gap-2 p-2 rounded border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20 mb-3 hover:bg-amber-100/50 transition-colors"
        >
          <Truck className="h-3.5 w-3.5 text-amber-600" />
          <span className="text-xs font-medium text-amber-800 dark:text-amber-200 flex-1 text-left">
            {pendingDelivery} đơn giao đang chờ
          </span>
          <span className="text-[10px] text-amber-600">Xem →</span>
        </button>
      )}

      {/* Last check */}
      <div className="mt-auto border-t pt-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Lần kiểm tra gần nhất
          </p>
          {lastCheck?.cleanliness_score != null && (
            <span className="text-xs font-medium">{lastCheck.cleanliness_score}/5 ★</span>
          )}
        </div>
        {lastCheck ? (
          <>
            <p className="text-xs text-muted-foreground">
              {format(new Date(lastCheck.checked_at), 'dd/MM HH:mm', { locale: vi })} • {lastCheck.checked_by_name}
            </p>
            {photos.length > 0 ? (
              <div className="grid grid-cols-4 gap-1 mt-2">
                {photos.map((p, i) => (
                  <a key={i} href={p} target="_blank" rel="noopener noreferrer" className="aspect-square rounded overflow-hidden border hover:border-primary">
                    <img src={p} alt="" className="w-full h-full object-cover" />
                  </a>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-2">
                <ImageIcon className="h-3 w-3" />
                Không có ảnh
              </div>
            )}
          </>
        ) : (
          <p className="text-xs text-muted-foreground">Chưa có lần kiểm tra nào</p>
        )}
      </div>
    </div>
  )
}

function LegendRow({ color, label, value, className }: { color: string; label: string; value: number; className?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-2 w-2 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
      <span className="flex-1 text-muted-foreground">{label}</span>
      <span className={`font-semibold ${className || ''}`}>{value}</span>
    </div>
  )
}
