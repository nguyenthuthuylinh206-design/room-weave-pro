import { Phone, Mail, MapPin, Building2, Clock, User, Send } from 'lucide-react'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { StaffStatusBadge } from './StaffStatusBadge'
import { StaffActivityTimeline } from './StaffActivityTimeline'
import { useStaffActivities } from '@/hooks/useStaffActivity'
import type { StaffWithStatus } from '@/hooks/useStaffStatus'

interface StaffDetailSheetProps {
  staff: StaffWithStatus | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function StaffDetailSheet({ staff, open, onOpenChange }: StaffDetailSheetProps) {
  const { data: activities, isLoading: loadingActivities } = useStaffActivities(staff?.id, 20)

  if (!staff) return null

  const initials = staff.full_name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="p-4 pb-0">
          <SheetTitle className="sr-only">Chi tiết nhân viên</SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1">
          {/* Header */}
          <div className="p-4 text-center">
            <Avatar className="h-20 w-20 mx-auto mb-3">
              <AvatarImage src={staff.avatar_url || undefined} alt={staff.full_name} />
              <AvatarFallback className="text-lg font-medium">{initials}</AvatarFallback>
            </Avatar>
            <h2 className="text-lg font-semibold">{staff.full_name}</h2>
            <p className="text-sm text-muted-foreground">
              {staff.position_name || staff.user_level_code || 'Nhân viên'}
            </p>
            <div className="mt-2 flex justify-center">
              <StaffStatusBadge status={staff.status} />
            </div>
          </div>

          {/* Quick actions */}
          <div className="px-4 pb-4 flex gap-2">
            {(staff.telegram_username || staff.telegram_chat_id) && (
              <Button 
                className="flex-1" 
                variant="default"
                onClick={() => {
                  if (staff.telegram_username) {
                    window.open(`https://t.me/${staff.telegram_username}`, '_blank')
                  } else if (staff.telegram_chat_id) {
                    window.location.href = `tg://user?id=${staff.telegram_chat_id}`
                  }
                }}
              >
                <Send className="h-4 w-4 mr-2" />
                Telegram
              </Button>
            )}
            {staff.phone && (
              <Button 
                className="flex-1" 
                variant={(staff.telegram_username || staff.telegram_chat_id) ? "outline" : "default"}
                onClick={() => window.location.href = `tel:${staff.phone}`}
              >
                <Phone className="h-4 w-4 mr-2" />
                Gọi điện
              </Button>
            )}
            <Button 
              className="flex-1" 
              variant="outline"
              onClick={() => window.location.href = `mailto:${staff.email}`}
            >
              <Mail className="h-4 w-4 mr-2" />
              Email
            </Button>
          </div>

          <Separator />

          {/* Current activity */}
          {staff.status === 'busy' && staff.current_activity && (
            <>
              <div className="p-4">
                <h3 className="text-sm font-medium mb-3">Hoạt động hiện tại</h3>
                <div className="space-y-2 text-sm">
                  {staff.current_location && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4 flex-shrink-0" />
                      <span>{staff.current_location}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 flex-shrink-0 text-primary" />
                    <span className="text-primary font-medium">{staff.current_activity}</span>
                  </div>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Contact info */}
          <div className="p-4">
            <h3 className="text-sm font-medium mb-3">Thông tin liên hệ</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{staff.email}</span>
              </div>
              {staff.phone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4 flex-shrink-0" />
                  <span>{staff.phone}</span>
                </div>
              )}
              {(staff.telegram_username || staff.telegram_chat_id) && (
                <div className="flex items-center gap-2">
                  <Send className="h-4 w-4 flex-shrink-0 text-blue-500" />
                  {staff.telegram_username ? (
                    <a 
                      href={`https://t.me/${staff.telegram_username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      @{staff.telegram_username}
                    </a>
                  ) : (
                    <span className="text-muted-foreground text-xs">
                      ID: {staff.telegram_chat_id} <span className="opacity-70">(cần đã từng chat)</span>
                    </span>
                  )}
                </div>
              )}
              {staff.hotel_name && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building2 className="h-4 w-4 flex-shrink-0" />
                  <span>{staff.hotel_name}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-4 w-4 flex-shrink-0" />
                <span>{staff.user_level_code || 'staff'}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Activity timeline */}
          <div className="p-4">
            <h3 className="text-sm font-medium mb-3">Hoạt động gần đây</h3>
            {loadingActivities ? (
              <div className="text-sm text-muted-foreground">Đang tải...</div>
            ) : (
              <StaffActivityTimeline activities={activities || []} />
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
