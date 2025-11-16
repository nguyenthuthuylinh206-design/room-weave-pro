import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertTriangle, TrendingUp, Wrench } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

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
  if (!issues || issues.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium mb-1">Không có vấn đề lặp lại</p>
              <p className="text-sm text-muted-foreground">
                Chưa phát hiện thiết bị hoặc phòng nào có sự cố lặp lại trong khoảng thời gian này
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-warning">
        <AlertTriangle className="h-5 w-5" />
        <span className="text-sm font-medium">
          Phát hiện {issues.length} thiết bị/phòng có vấn đề lặp lại thường xuyên
        </span>
      </div>

      <div className="grid gap-4">
        {issues.map((issue) => (
          <Card key={issue.id} className="border-l-4 border-l-warning">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">
                    {issue.type === 'item' ? (
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <Wrench className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <div>{issue.item?.name || 'Thiết bị'}</div>
                          <div className="text-sm text-muted-foreground font-normal">
                            {issue.item?.code} - {issue.location}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div>
                        Phòng {issue.room?.room_number}
                        <div className="text-sm text-muted-foreground font-normal">
                          {issue.location}
                        </div>
                      </div>
                    )}
                  </CardTitle>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="destructive" className="gap-1">
                    <TrendingUp className="h-3 w-3" />
                    {issue.count30d} lần (30d)
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <div className="text-sm text-muted-foreground">Vấn đề chính</div>
                  <div className="font-medium">
                    {issueTypeLabels[issue.primaryIssue] || issue.primaryIssue}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    ({issue.issueCount} lần)
                  </div>
                </div>

                <div>
                  <div className="text-sm text-muted-foreground">Tần suất</div>
                  <div className="font-medium">
                    {issue.frequency} lần/tháng
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {issue.count90d} lần (90 ngày)
                  </div>
                </div>

                <div>
                  <div className="text-sm text-muted-foreground">Chi phí</div>
                  <div className="font-medium">
                    {formatCurrency(issue.totalCost)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    TB: {formatCurrency(issue.avgCost)}/lần
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" className="gap-2">
                    <Wrench className="h-4 w-4" />
                    Phân tích
                  </Button>
                </div>
              </div>

              {issue.count30d >= 2 && (
                <div className="mt-4 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <div className="font-medium text-destructive">
                        {issue.count30d >= 3 ? 'Cảnh báo: Tần suất cao bất thường' : 'Lưu ý: Vấn đề lặp lại'}
                      </div>
                      <div className="text-muted-foreground mt-1">
                        {issue.count30d >= 3 
                          ? 'Đề xuất: Xem xét thay thế thiết bị hoặc điều tra nguyên nhân gốc rễ'
                          : 'Theo dõi thêm để xác định xu hướng và nguyên nhân'
                        }
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
