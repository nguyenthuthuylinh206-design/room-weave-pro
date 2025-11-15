import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { RoomStatusBadge } from './RoomStatusBadge'
import type { RoomStatus } from '@/types/rooms.types'
import { useUpdateRoom } from '@/hooks/useRooms'

interface RoomStatusSelectorProps {
  roomId: string
  currentStatus: RoomStatus
  className?: string
}

const statusOptions: { value: RoomStatus; label: string }[] = [
  { value: 'vacant', label: 'Trống' },
  { value: 'occupied', label: 'Đang ở' },
  { value: 'check_in', label: 'Check In' },
  { value: 'check_out', label: 'Check Out' },
  { value: 'cleaning', label: 'Đang dọn' },
  { value: 'maintenance', label: 'Bảo trì' },
  { value: 'out_of_order', label: 'Hỏng' },
]

export function RoomStatusSelector({ roomId, currentStatus, className }: RoomStatusSelectorProps) {
  const updateRoom = useUpdateRoom()

  const handleStatusChange = (newStatus: RoomStatus) => {
    updateRoom.mutate({
      id: roomId,
      data: { status: newStatus }
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className={className} size="sm">
          <RoomStatusBadge status={currentStatus} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {statusOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => handleStatusChange(option.value)}
            className="cursor-pointer"
          >
            <div className="flex items-center justify-between w-full gap-2">
              <span>{option.label}</span>
              {currentStatus === option.value && (
                <Check className="h-4 w-4" />
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
