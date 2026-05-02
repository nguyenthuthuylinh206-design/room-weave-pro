import { Navigate, useParams, useSearchParams } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { useRoom } from '@/hooks/useRooms'
import { useRoomCheckLeanConfig } from '@/hooks/useRoomCheckLeanConfig'

const RoomCheckPage = lazy(() =>
  import('@/pages/rooms/RoomCheckPage').then((m) => ({
    default: m.RoomCheckPage,
  })),
)

/**
 * Lean rollout router cho /rooms/:id/check.
 *
 * Quyết định route thực:
 * - Nếu URL có tín hiệu wizard-only (replenish, delivery, distribution_order_id,
 *   inspection, room_order_id) → giữ nguyên wizard cũ.
 * - Còn lại → redirect sang /check-lean theo per-hotel flag
 *   `settings.room_check.use_lean` (mặc định true ở giai đoạn này).
 *
 * Mọi query string được giữ nguyên qua redirect.
 */
export default function RoomCheckRouter() {
  const { id } = useParams<{ id: string }>()
  const [params] = useSearchParams()

  const { data: roomData, isLoading } = useRoom(id)
  const hotelId = roomData?.room?.hotel_id ?? null
  const { data: leanCfg, isLoading: cfgLoading } = useRoomCheckLeanConfig(hotelId)

  // Đợi room + cfg trước khi quyết định để tránh flash redirect sai
  if (isLoading || (hotelId && cfgLoading)) {
    return null
  }

  const checkType = params.get('type') || ''
  const wizardOnlyType = checkType === 'replenish' || checkType === 'delivery'
  const hasDistribution =
    !!params.get('distribution_order_id') ||
    !!params.get('room_order_id') ||
    !!params.get('inspection')

  // Lean v1 KHÔNG bao quát: delivery + replenish + checkout-inspection legacy.
  // Giữ wizard cũ cho các flow này.
  if (wizardOnlyType || hasDistribution) {
    return (
      <Suspense fallback={null}>
        <RoomCheckPage />
      </Suspense>
    )
  }

  // Per-hotel flag — default ON
  const useLean = (leanCfg as any)?.use_lean ?? true
  if (!useLean) {
    return (
      <Suspense fallback={null}>
        <RoomCheckPage />
      </Suspense>
    )
  }

  // Redirect sang Lean, giữ nguyên query
  const qs = params.toString()
  return (
    <Navigate
      to={`/rooms/${id}/check-lean${qs ? `?${qs}` : ''}`}
      replace
    />
  )
}
