import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

interface KpiTileProps {
  label: string
  value: number | string
  to?: string
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'info'
  loading?: boolean
}

const TONE_CLASS: Record<NonNullable<KpiTileProps['tone']>, string> = {
  default: 'text-foreground',
  success: 'text-green-600',
  warning: 'text-amber-600',
  danger: 'text-red-600',
  info: 'text-blue-600',
}

export function KpiTile({ label, value, to, tone = 'default', loading }: KpiTileProps) {
  const content = (
    <div className="flex flex-col gap-1 border rounded-lg p-3 hover:bg-muted/40 transition-colors min-w-[120px] flex-1">
      <div className="text-xs text-muted-foreground uppercase tracking-wide truncate">{label}</div>
      <div className={cn('text-2xl font-semibold tabular-nums', TONE_CLASS[tone])}>
        {loading ? <span className="text-muted-foreground">…</span> : value}
      </div>
    </div>
  )
  if (!to) return content
  return (
    <Link to={to} className="flex-1 min-w-[120px]">
      {content}
    </Link>
  )
}
