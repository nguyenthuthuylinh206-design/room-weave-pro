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
  const hasDistribution =
    !!params.get('distribution_order_id') ||
    !!params.get('room_order_id') ||
    !!params.get('inspection')
  // Opt-in Lean cho delivery (Phase 3 chưa làm UI) khi URL có ?lean=1
  const optInLean = params.get('lean') === '1'

  // Per-hotel flag — default ON
  const useLean = (leanCfg as any)?.use_lean ?? true

  // Lean replenish: redirect sang /check-replenish khi flag bật (mặc định ON).
  // Bỏ qua khi user opt-out qua ?lean=0 để fallback wizard cũ.
  const optOutLean = params.get('lean') === '0'
  if (checkType === 'replenish' && useLean && !optOutLean) {
    const qs = new URLSearchParams(params)
    qs.delete('type')
    qs.delete('lean')
    const tail = qs.toString()
    return (
      <Navigate
        to={`/rooms/${id}/check-replenish${tail ? `?${tail}` : ''}`}
        replace
      />
    )
  }

  // Delivery + checkout-inspection legacy: giữ wizard cũ trừ khi opt-in Lean.
  if ((checkType === 'delivery' || checkType === 'replenish' || hasDistribution) && !optInLean) {
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
