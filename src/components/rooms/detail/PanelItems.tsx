import { useNavigate } from 'react-router-dom'
import { CheckCircle2, XCircle, Package, RefreshCw, Printer, ClipboardCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RoomItemsList } from '@/components/rooms/RoomItemsList'
import type { RoomItemWithDetails } from '@/types/rooms.types'

interface Props {
  roomId: string
  items: RoomItemWithDetails[]
  roomType: string
  onApplyStandards: () => void
  isApplying: boolean
}

export function PanelItems({ roomId, items, roomType, onApplyStandards, isApplying }: Props) {
  const navigate = useNavigate()
  const standard = items.filter((i) => i.has_standard)
  const completeCount = standard.filter((i) => i.missing_quantity === 0).length
  const missingCount = standard.filter((i) => i.missing_quantity > 0).length
  const otherCount = items.filter((i) => !i.has_standard).length

  return (
    <div className="border rounded-lg p-4 h-full flex flex-col min-h-0">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <p className="text-sm font-semibold">Đồ dùng trong phòng</p>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-green-600">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {completeCount} đủ
            </span>
            {missingCount > 0 && (
              <span className="flex items-center gap-1 text-red-600">
                <XCircle className="h-3.5 w-3.5" />
                {missingCount} thiếu
              </span>
            )}
            {otherCount > 0 && (
              <span className="text-muted-foreground">+{otherCount} ngoài chuẩn</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={onApplyStandards}
            disabled={isApplying}
          >
            <RefreshCw className={`mr-1 h-3 w-3 ${isApplying ? 'animate-spin' : ''}`} />
            {standard.length === 0 ? 'Áp dụng chuẩn' : 'Đồng bộ chuẩn'}
          </Button>
          <Button
            size="sm"
            className="h-7 text-xs"
            onClick={() => navigate(`/rooms/${roomId}/check`)}
          >
            <ClipboardCheck className="mr-1 h-3 w-3" />
            Kiểm tra
          </Button>
          <Button variant="outline" size="sm" className="h-7 px-2" onClick={() => window.print()}>
            <Printer className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
        {items.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="flex items-center gap-3 p-4 border border-dashed rounded-lg">
              <Package className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Chưa có đồ dùng</p>
                <p className="text-xs text-muted-foreground">
                  Áp dụng tiêu chuẩn phòng {roomType} để bắt đầu
                </p>
              </div>
            </div>
          </div>
        ) : (
          <RoomItemsList items={items as any} roomId={roomId} />
        )}
      </div>
    </div>
  )
}
