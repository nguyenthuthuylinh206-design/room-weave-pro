import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, TrendingUp, Wrench } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { RecurringIssueAnalysisDialog } from './RecurringIssueAnalysisDialog'
import { cn } from '@/lib/utils'

interface RecurringIssue {
  id: string
  type: 'item' | 'room'
  item?: any
  room?: any
  location: string
  count30d: number
  count90d: number
  primaryIssue: string
  issueCount: number
  frequency: number
  avgCost: number
  totalCost: number
}

interface RecurringIssuesTableProps {
  issues: RecurringIssue[]
}

const issueTypeLabels: Record<string, string> = {
  repair: 'Sửa chữa',
  replace: 'Thay thế',
  inspection: 'Kiểm tra',
  cleaning: 'Vệ sinh',
  other: 'Khác',
}

export const RecurringIssuesTable = ({ issues }: RecurringIssuesTableProps) => {
  const [selectedIssue, setSelectedIssue] = useState<RecurringIssue | null>(null)

  if (!issues || issues.length === 0) {
    return (
      <div className="border rounded-lg p-8 text-center">
        <div className="flex flex-col items-center gap-3">
          <AlertTriangle className="h-8 w-8 text-muted-foreground" />
          <div>
            <p className="font-medium mb-1">Không có vấn đề lặp lại</p>
            <p className="text-sm text-muted-foreground">
              Chưa phát hiện thiết bị hoặc phòng nào có sự cố lặp lại
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-amber-600">
        <AlertTriangle className="h-4 w-4" />
        <span className="text-sm">
          Phát hiện {issues.length} thiết bị/phòng có vấn đề lặp lại
        </span>
      </div>

      <div className="border rounded-lg divide-y">
        {issues.map((issue) => (
          <div key={issue.id} className={cn(
            "p-3",
            issue.count30d >= 3 && "border-l-2 border-l-red-500"
          )}>
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <Wrench className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">
                    {issue.type === 'item' ? issue.item?.name : `Phòng ${issue.room?.room_number}`}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {issue.type === 'item' ? `${issue.item?.code} - ${issue.location}` : issue.location}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={cn(
                  "text-xs font-medium px-2 py-0.5 rounded",
                  issue.count30d >= 3 ? "text-red-600 bg-red-50 dark:bg-red-950" : "text-amber-600 bg-amber-50 dark:bg-amber-950"
                )}>
                  <TrendingUp className="h-3 w-3 inline mr-1" />
                  {issue.count30d} lần (30d)
                </span>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-4 gap-4 text-xs mb-2">
              <div>
                <div className="text-muted-foreground">Vấn đề chính</div>
                <div className="font-medium">{issueTypeLabels[issue.primaryIssue] || issue.primaryIssue}</div>
                <div className="text-muted-foreground">({issue.issueCount} lần)</div>
              </div>
              <div>
                <div className="text-muted-foreground">Tần suất</div>
                <div className="font-medium">{issue.frequency} lần/tháng</div>
                <div className="text-muted-foreground">{issue.count90d} lần (90d)</div>
              </div>
              <div>
                <div className="text-muted-foreground">Chi phí</div>
                <div className="font-medium">{formatCurrency(issue.totalCost)}</div>
                <div className="text-muted-foreground">TB: {formatCurrency(issue.avgCost)}</div>
              </div>
              <div className="flex items-center justify-end">
                <Button 
                  size="sm" 
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => setSelectedIssue(issue)}
                >
                  <Wrench className="h-3 w-3 mr-1" />
                  Phân tích
                </Button>
              </div>
            </div>

            {/* Warning */}
            {issue.count30d >= 2 && (
              <div className={cn(
                "flex items-start gap-2 p-2 rounded text-xs",
                issue.count30d >= 3 ? "bg-red-50 dark:bg-red-950/50" : "bg-amber-50 dark:bg-amber-950/50"
              )}>
                <AlertTriangle className={cn(
                  "h-4 w-4 shrink-0",
                  issue.count30d >= 3 ? "text-red-500" : "text-amber-500"
                )} />
                <div>
                  <span className={cn(
                    "font-medium",
                    issue.count30d >= 3 ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"
                  )}>
                    {issue.count30d >= 3 ? 'Tần suất cao bất thường' : 'Vấn đề lặp lại'}
                  </span>
                  <span className="text-muted-foreground ml-1">
                    {issue.count30d >= 3 
                      ? '- Đề xuất thay thế hoặc điều tra nguyên nhân'
                      : '- Theo dõi thêm để xác định xu hướng'
                    }
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <RecurringIssueAnalysisDialog
        issue={selectedIssue}
        open={!!selectedIssue}
        onOpenChange={(open) => !open && setSelectedIssue(null)}
      />
    </div>
  )
}
