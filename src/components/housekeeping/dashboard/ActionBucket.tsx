import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

interface ActionBucketProps {
  title: string
  count: number
  emptyText?: string
  viewAllTo?: string
  tone?: 'danger' | 'warning' | 'info'
  children: React.ReactNode
}

const TONE_HEADER: Record<NonNullable<ActionBucketProps['tone']>, string> = {
  danger: 'text-red-600',
  warning: 'text-amber-600',
  info: 'text-blue-600',
}

export function ActionBucket({ title, count, emptyText = 'Không có', viewAllTo, tone = 'danger', children }: ActionBucketProps) {
  return (
    <div className="border rounded-lg flex flex-col min-h-[180px]">
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium">{title}</span>
          <span className={`text-sm font-semibold tabular-nums ${count > 0 ? TONE_HEADER[tone] : 'text-muted-foreground'}`}>
            {count}
          </span>
        </div>
        {viewAllTo && count > 0 && (
          <Link to={viewAllTo} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5">
            Tất cả <ChevronRight className="h-3 w-3" />
          </Link>
        )}
      </div>
      <div className="flex-1 p-2">
        {count === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-muted-foreground">{emptyText}</div>
        ) : (
          <ul className="flex flex-col divide-y">{children}</ul>
        )}
      </div>
    </div>
  )
}

interface BucketRowProps {
  to?: string
  primary: string
  secondary?: string
  trailing?: string
  trailingTone?: 'default' | 'warning' | 'danger'
}

export function BucketRow({ to, primary, secondary, trailing, trailingTone = 'default' }: BucketRowProps) {
  const trailingClass =
    trailingTone === 'danger' ? 'text-red-600' : trailingTone === 'warning' ? 'text-amber-600' : 'text-muted-foreground'

  const content = (
    <div className="flex items-center justify-between py-1.5 px-1 hover:bg-muted/40 rounded">
      <div className="flex flex-col min-w-0">
        <span className="text-sm font-medium truncate">{primary}</span>
        {secondary && <span className="text-xs text-muted-foreground truncate">{secondary}</span>}
      </div>
      {trailing && <span className={`text-xs font-medium tabular-nums shrink-0 ml-2 ${trailingClass}`}>{trailing}</span>}
    </div>
  )

  return <li>{to ? <Link to={to}>{content}</Link> : content}</li>
}
