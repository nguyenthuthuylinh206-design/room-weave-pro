import { AlertTriangle, AlertCircle, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useBookingIssues } from '@/hooks/useBookingConsumables'
import { cn } from '@/lib/utils'

interface BookingIssuesCardProps {
  roomId: string
  checkInDate: string
  checkOutDate?: string | null
  damageCharges?: number | null
}

export function BookingIssuesCard({ roomId, checkInDate, checkOutDate, damageCharges }: BookingIssuesCardProps) {
  const { data: issues, isLoading } = useBookingIssues(roomId, checkInDate, checkOutDate || undefined)

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const totalDamaged = issues?.reduce((sum, i) => sum + (typeof i.items_damaged === 'number' ? i.items_damaged : 0), 0) || 0
  const totalLost = issues?.reduce((sum, i) => sum + (typeof i.items_lost === 'number' ? i.items_lost : 0), 0) || 0
  const totalCharges = damageCharges || 0
  const hasIssues = totalDamaged > 0 || totalLost > 0 || totalCharges > 0
  const formatVND = (v: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(v)

  return (
    <Card className={cn(
      hasIssues && 'border-orange-200 dark:border-orange-800'
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className={cn(
              'h-4 w-4',
              hasIssues ? 'text-orange-600' : 'text-muted-foreground'
            )} />
            Vấn đề phát sinh
          </CardTitle>
          {hasIssues && (
            <Badge variant="outline" className="border-orange-500 text-orange-600">
              {totalDamaged + totalLost} sự cố
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!hasIssues ? (
          <div className="text-center py-6">
            <div className="h-12 w-12 mx-auto rounded-full bg-green-100 dark:bg-green-950/30 flex items-center justify-center mb-2">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm text-muted-foreground">Không có vấn đề phát sinh</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary - 3 cột không nền màu */}
            <div className="grid grid-cols-3 divide-x divide-border rounded-lg border">
              <div className="p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <AlertCircle className={cn('h-3.5 w-3.5', totalDamaged > 0 ? 'text-orange-600' : 'text-muted-foreground')} />
                  <span className="text-xs text-muted-foreground">Đồ hỏng</span>
                </div>
                <p className={cn('text-lg font-bold', totalDamaged > 0 ? 'text-orange-600' : 'text-muted-foreground')}>
                  {totalDamaged}
                </p>
              </div>
              <div className="p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <AlertTriangle className={cn('h-3.5 w-3.5', totalLost > 0 ? 'text-red-600' : 'text-muted-foreground')} />
                  <span className="text-xs text-muted-foreground">Đồ mất</span>
                </div>
                <p className={cn('text-lg font-bold', totalLost > 0 ? 'text-red-600' : 'text-muted-foreground')}>
                  {totalLost}
                </p>
              </div>
              <div className="p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-xs text-muted-foreground">Chi phí đền bù</span>
                </div>
                <p className={cn('text-base font-bold font-mono', totalCharges > 0 ? 'text-red-600' : 'text-muted-foreground')}>
                  {formatVND(totalCharges)}
                </p>
              </div>
            </div>

            {/* Issue Timeline */}
            <div className="divide-y divide-border">
              {issues?.map((issue) => (
                <div key={issue.id} className="py-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {issue.checked_at 
                          ? format(new Date(issue.checked_at), 'dd/MM HH:mm', { locale: vi })
                          : 'N/A'
                        }
                      </span>
                    </div>
                    <Badge variant="outline" className="text-xs capitalize">
                      {issue.check_type}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-2">
                    {(typeof issue.items_damaged === 'number' && issue.items_damaged > 0) && (
                      <span className="text-sm text-orange-600">
                        Hỏng: {issue.items_damaged}
                      </span>
                    )}
                    {(typeof issue.items_lost === 'number' && issue.items_lost > 0) && (
                      <span className="text-sm text-red-600">
                        Mất: {issue.items_lost}
                      </span>
                    )}
                  </div>
                  {issue.notes && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {issue.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
