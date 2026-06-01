import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { cn, formatCurrency } from '@/lib/utils'
import type { Guest } from '@/hooks/useGuests'
import { GuestQuickActions } from './GuestQuickActions'

const VIP_LABEL: Record<string, string> = {
  normal: 'Thường', silver: 'Bạc', gold: 'Vàng', vip: 'VIP', blacklist: 'Blacklist',
}
const VIP_COLOR: Record<string, string> = {
  silver: 'text-slate-500', gold: 'text-amber-600', vip: 'text-purple-600', blacklist: 'text-red-600',
}

interface Props {
  guests: Guest[]
  isLoading?: boolean
  canManage: boolean
  onMerge?: (g: Guest) => void
  onEdit?: (g: Guest) => void
}

export function GuestCardList({ guests, isLoading, canManage, onMerge, onEdit }: Props) {
  const navigate = useNavigate()

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />)}
      </div>
    )
  }

  if (guests.length === 0) {
    return <div className="text-center text-sm text-muted-foreground py-10">Không có khách hàng</div>
  }

  return (
    <div className="border rounded-lg divide-y">
      {guests.map((g) => (
        <div
          key={g.id}
          className="flex items-center gap-3 p-3 hover:bg-accent/40 cursor-pointer"
          onClick={() => navigate(`/guests/${g.id}`)}
        >
          <div className="h-9 w-9 flex-shrink-0 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
            {g.full_name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium truncate">{g.full_name}</span>
              {g.vip_level !== 'normal' && (
                <span className={cn('text-xs font-medium', VIP_COLOR[g.vip_level])}>
                  {VIP_LABEL[g.vip_level]}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {g.phone && <span className="font-mono">{g.phone}</span>}
              {g.last_stay_date && <span>· Lần cuối {format(new Date(g.last_stay_date), 'dd/MM')}</span>}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-xs text-muted-foreground">{g.total_stays} lượt</div>
            {g.total_spent > 0 && <div className="text-xs font-mono">{formatCurrency(g.total_spent)}</div>}
          </div>
          <GuestQuickActions guest={g} canManage={canManage} onMerge={onMerge} onEdit={onEdit} />
        </div>
      ))}
    </div>
  )
}
