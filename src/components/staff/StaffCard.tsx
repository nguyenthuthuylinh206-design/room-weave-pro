import { Phone, MapPin, Clock, Send } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { StaffStatusBadge } from './StaffStatusBadge'
import type { StaffWithStatus } from '@/hooks/useStaffStatus'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'

interface StaffCardProps {
  staff: StaffWithStatus
  onViewDetail?: (staff: StaffWithStatus) => void
}

export function StaffCard({ staff, onViewDetail }: StaffCardProps) {
  const navigate = useNavigate()
  
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

  const handleTelegram = (e: React.MouseEvent) => {
    e.stopPropagation()
    
    // Priority 1: Username - works without prior contact (opens chat directly)
    if (staff.telegram_username) {
      window.open(`https://t.me/${staff.telegram_username}`, '_blank')
      return
    }
    
    // Priority 2: Telegram ID - only works if already chatted before
    if (staff.telegram_chat_id) {
      window.location.href = `tg://user?id=${staff.telegram_chat_id}`
      return
    }
    
    // No connection: Show toast and navigate to setup
    toast.info(`${staff.full_name} chưa kết nối Telegram Bot`)
    navigate(`/settings/users?edit=${staff.id}`)
  }

  const hasTelegramConnection = staff.telegram_chat_id || staff.telegram_username

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

      {/* Contact buttons group */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-10 w-10 min-h-[44px] min-w-[44px]",
            hasTelegramConnection 
              ? "text-blue-500 hover:text-blue-600 hover:bg-blue-50" 
              : "text-muted-foreground/40 hover:text-muted-foreground/60"
          )}
          onClick={handleTelegram}
          title={
            staff.telegram_chat_id 
              ? "Mở Telegram" 
              : staff.telegram_username 
                ? `Telegram @${staff.telegram_username}`
                : `${staff.full_name} chưa kết nối Telegram Bot`
          }
        >
          <Send className="h-5 w-5" />
        </Button>

        {staff.phone && (
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 min-h-[44px] min-w-[44px] text-muted-foreground hover:text-foreground"
            onClick={handleCall}
            title={`Gọi ${staff.phone}`}
          >
            <Phone className="h-5 w-5" />
          </Button>
        )}
      </div>
    </div>
  )
}
