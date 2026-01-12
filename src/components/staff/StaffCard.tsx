import { Phone, MapPin, Clock } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { StaffStatusBadge } from './StaffStatusBadge'
import type { StaffWithStatus } from '@/hooks/useStaffStatus'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'

interface StaffCardProps {
  staff: StaffWithStatus
  onViewDetail?: (staff: StaffWithStatus) => void
}

export function StaffCard({ staff, onViewDetail }: StaffCardProps) {
  const initials = staff.full_name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const lastSeenText = staff.last_seen_at
    ? formatDistanceToNow(new Date(staff.last_seen_at), { addSuffix: true, locale: vi })
    : null

  const handleCall = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (staff.phone) {
      window.location.href = `tel:${staff.phone}`
    }
  }

  return (
    <div 
      className="flex items-start gap-3 p-3 border-b last:border-b-0 hover:bg-muted/30 transition-colors cursor-pointer"
      onClick={() => onViewDetail?.(staff)}
    >
      <Avatar className="h-10 w-10 flex-shrink-0">
        <AvatarImage src={staff.avatar_url || undefined} alt={staff.full_name} />
        <AvatarFallback className="text-xs font-medium">{initials}</AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{staff.full_name}</p>
            <p className="text-xs text-muted-foreground truncate">
              {staff.position_name || staff.user_level_code || 'Nhân viên'}
              {staff.hotel_name && <span className="ml-1">• {staff.hotel_name}</span>}
            </p>
          </div>
          <StaffStatusBadge status={staff.status} size="sm" />
        </div>

        {/* Current activity info */}
        {staff.status === 'busy' && staff.current_activity && (
          <div className="mt-2 flex flex-col gap-1">
            {staff.current_location && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{staff.current_location}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-xs text-primary">
              <Clock className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{staff.current_activity}</span>
            </div>
          </div>
        )}

        {/* Last seen for offline users */}
        {staff.status === 'offline' && lastSeenText && (
          <p className="mt-1 text-xs text-muted-foreground">
            Hoạt động {lastSeenText}
          </p>
        )}
      </div>

      {/* Call button */}
      {staff.phone && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 flex-shrink-0"
          onClick={handleCall}
          title={`Gọi ${staff.phone}`}
        >
          <Phone className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
