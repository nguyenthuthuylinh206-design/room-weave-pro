import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface KpiCardLargeProps {
  label: string
  value: number
  percent?: number | null
  icon: LucideIcon
  to?: string
  tone?: 'default' | 'success' | 'info' | 'warning' | 'danger' | 'maintenance' | 'reserved'
  loading?: boolean
}

const TONE: Record<NonNullable<KpiCardLargeProps['tone']>, { value: string; icon: string; iconBg: string }> = {
  default:     { value: 'text-foreground',    icon: 'text-muted-foreground', iconBg: 'bg-muted/50' },
  success:     { value: 'text-green-600',     icon: 'text-green-600',        iconBg: 'bg-green-500/10' },
  info:        { value: 'text-blue-600',      icon: 'text-blue-600',         iconBg: 'bg-blue-500/10' },
  warning:     { value: 'text-amber-600',     icon: 'text-amber-600',        iconBg: 'bg-amber-500/10' },
  danger:      { value: 'text-red-600',       icon: 'text-red-600',          iconBg: 'bg-red-500/10' },
  maintenance: { value: 'text-zinc-700 dark:text-zinc-300', icon: 'text-zinc-600', iconBg: 'bg-zinc-500/10' },
  reserved:    { value: 'text-purple-600',    icon: 'text-purple-600',       iconBg: 'bg-purple-500/10' },
}

export function KpiCardLarge({ label, value, percent, icon: Icon, to, tone = 'default', loading }: KpiCardLargeProps) {
  const t = TONE[tone]
  const body = (
    <div className="flex items-center justify-between gap-2 border rounded-lg p-3 hover:bg-muted/30 transition-colors h-full">
      <div className="flex flex-col gap-0.5 min-w-0">
        <div className="text-xs text-muted-foreground truncate">{label}</div>
        <div className={cn('text-2xl font-semibold tabular-nums leading-tight', t.value)}>
          {loading ? '…' : value}
        </div>
        {percent != null && (
          <div className="text-[11px] text-muted-foreground tabular-nums">{percent.toFixed(1)}%</div>
        )}
      </div>
      <div className={cn('h-10 w-10 rounded-md flex items-center justify-center shrink-0', t.iconBg)}>
        <Icon className={cn('h-5 w-5', t.icon)} />
      </div>
    </div>
  )
  return to ? <Link to={to} className="block">{body}</Link> : body
}
