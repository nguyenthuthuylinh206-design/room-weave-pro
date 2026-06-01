import { useNavigate } from 'react-router-dom'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import type { Guest } from '@/hooks/useGuests'
import type { GuestSortKey } from '@/hooks/useGuestsV2'
import { GuestQuickActions } from './GuestQuickActions'

const VIP_LABEL: Record<string, string> = {
  normal: 'Thường', silver: 'Bạc', gold: 'Vàng', vip: 'VIP', blacklist: 'Blacklist',
}
const VIP_COLOR: Record<string, string> = {
  silver: 'text-slate-500',
  gold: 'text-amber-600',
  vip: 'text-purple-600',
  blacklist: 'text-red-600',
}

interface Props {
  guests: Guest[]
  isLoading?: boolean
  sortBy: GuestSortKey
  sortDir: 'asc' | 'desc'
  onSort: (key: GuestSortKey) => void
  canManage: boolean
  onMerge?: (g: Guest) => void
  onEdit?: (g: Guest) => void
}

function SortHeader({ active, dir, children, onClick, className }: any) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('inline-flex items-center gap-1 hover:text-foreground transition-colors', className)}
    >
      {children}
      {active ? (
        dir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-40" />
      )}
    </button>
  )
}

export function GuestDataTable({ guests, isLoading, sortBy, sortDir, onSort, canManage, onMerge, onEdit }: Props) {
  const navigate = useNavigate()

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(8)].map((_, i) => <div key={i} className="h-10 rounded bg-muted animate-pulse" />)}
      </div>
    )
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr className="border-b">
              <th className="text-left font-medium px-3 py-2">
                <SortHeader active={sortBy === 'full_name'} dir={sortDir} onClick={() => onSort('full_name')}>Họ tên</SortHeader>
              </th>
              <th className="text-left font-medium px-3 py-2">SĐT</th>
              <th className="text-left font-medium px-3 py-2">Email</th>
              <th className="text-left font-medium px-3 py-2">Hạng</th>
              <th className="text-right font-medium px-3 py-2">
                <SortHeader active={sortBy === 'total_stays'} dir={sortDir} onClick={() => onSort('total_stays')}>Lần ở</SortHeader>
              </th>
              <th className="text-right font-medium px-3 py-2">
                <SortHeader active={sortBy === 'total_spent'} dir={sortDir} onClick={() => onSort('total_spent')}>Chi tiêu</SortHeader>
              </th>
              <th className="text-left font-medium px-3 py-2">
                <SortHeader active={sortBy === 'last_stay_date'} dir={sortDir} onClick={() => onSort('last_stay_date')}>Lần cuối</SortHeader>
              </th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {guests.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-10 text-muted-foreground">Không có khách hàng</td>
              </tr>
            ) : guests.map((g) => (
              <tr
                key={g.id}
                className="border-b last:border-0 hover:bg-accent/40 cursor-pointer"
                onClick={() => navigate(`/guests/${g.id}`)}
              >
                <td className="px-3 py-2">
                  <div className="font-medium truncate max-w-[220px]">{g.full_name}</div>
                  {g.id_number && <div className="text-xs text-muted-foreground font-mono">{g.id_type?.toUpperCase()}: {g.id_number}</div>}
                </td>
                <td className="px-3 py-2 font-mono text-xs">{g.phone || '—'}</td>
                <td className="px-3 py-2 text-xs truncate max-w-[200px]">{g.email || '—'}</td>
                <td className={cn('px-3 py-2 text-xs font-medium', VIP_COLOR[g.vip_level])}>
                  {VIP_LABEL[g.vip_level] || g.vip_level}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{g.total_stays}</td>
                <td className="px-3 py-2 text-right font-mono text-xs tabular-nums">
                  {g.total_spent > 0 ? formatCurrency(g.total_spent) : '—'}
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {g.last_stay_date ? format(new Date(g.last_stay_date), 'dd/MM/yyyy') : '—'}
                </td>
                <td className="px-1 py-2 text-right">
                  <GuestQuickActions guest={g} canManage={canManage} onMerge={onMerge} onEdit={onEdit} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
