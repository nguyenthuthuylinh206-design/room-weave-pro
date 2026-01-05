import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Users, Building2, Copy, Trash2 } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { DEPARTMENTS, GROUP_TYPES, NOTIFICATION_TYPES } from './AddTelegramGroupDialog'

interface TelegramGroupCardProps {
  group: {
    id: string
    chat_id: string
    chat_title: string
    group_type: string
    department?: string | null
    notification_types?: string[] | null
    hotel_id: string | null
    is_active: boolean
    hotels?: { name: string } | null
  }
  onToggle: (groupId: string, isActive: boolean) => void
  onDelete: (groupId: string) => void
}

export function TelegramGroupCard({ group, onToggle, onDelete }: TelegramGroupCardProps) {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({ title: 'Đã copy' })
  }

  const groupTypeLabel = GROUP_TYPES.find(t => t.value === group.group_type)?.label || group.group_type
  const departmentLabel = DEPARTMENTS.find(d => d.value === group.department)?.label

  return (
    <div className="flex items-start justify-between p-3 border rounded-lg gap-3">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <Users className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-medium truncate">{group.chat_title}</p>
          
          {/* Badges row */}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge variant="outline" className="text-xs">
              {groupTypeLabel}
            </Badge>
            
            {group.department && (
              <Badge variant="secondary" className="text-xs">
                {departmentLabel || group.department}
              </Badge>
            )}
            
            {group.hotel_id ? (
              group.hotels && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Building2 className="h-3 w-3" />
                  {group.hotels.name}
                </span>
              )
            ) : (
              <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                Tất cả KS
              </span>
            )}
          </div>

          {/* Notification types */}
          {group.notification_types && group.notification_types.length > 0 && (
            <div className="flex items-center gap-1 mt-2 flex-wrap">
              {group.notification_types.slice(0, 4).map(type => {
                const notifType = NOTIFICATION_TYPES.find(n => n.value === type)
                return notifType ? (
                  <span key={type} className="text-xs" title={notifType.label}>
                    {notifType.icon}
                  </span>
                ) : null
              })}
              {group.notification_types.length > 4 && (
                <span className="text-xs text-muted-foreground">
                  +{group.notification_types.length - 4}
                </span>
              )}
            </div>
          )}

          {/* Chat ID */}
          <button
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-1"
            onClick={() => copyToClipboard(group.chat_id)}
          >
            <Copy className="h-3 w-3" />
            {group.chat_id}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <Switch
          checked={group.is_active}
          onCheckedChange={(checked) => onToggle(group.id, checked)}
        />
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive h-8 w-8"
          onClick={() => onDelete(group.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
