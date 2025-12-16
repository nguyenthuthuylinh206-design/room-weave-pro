import { useTranslation } from 'react-i18next'
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

const statusValues: RoomStatus[] = [
  'vacant',
  'occupied',
  'check_in',
  'check_out',
  'cleaning',
  'maintenance',
  'out_of_order',
]

export function RoomStatusSelector({ roomId, currentStatus, className }: RoomStatusSelectorProps) {
  const { t } = useTranslation('rooms')
  const updateRoom = useUpdateRoom()

  const handleStatusChange = (newStatus: RoomStatus) => {
    updateRoom.mutate({
      id: roomId,
      data: { status: newStatus }
    })
  }

  return (
    <div onClick={(e) => {
      e.stopPropagation()
      e.preventDefault()
    }}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            className={className} 
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
            }}
          >
            <RoomStatusBadge status={currentStatus} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {statusValues.map((status) => (
            <DropdownMenuItem
              key={status}
              onClick={() => handleStatusChange(status)}
              className="cursor-pointer"
            >
              <div className="flex items-center justify-between w-full gap-2">
                <span>{t(`status.${status}`)}</span>
                {currentStatus === status && (
                  <Check className="h-4 w-4" />
                )}
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
