import { useState } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { RecurringIssuesTable } from '@/components/maintenance/RecurringIssuesTable'
import { useRecurringIssues } from '@/hooks/useRecurringIssues'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MobileRecurringIssuesPage } from '@/components/maintenance/MobileRecurringIssuesPage'
import { useBreakpoint } from '@/lib/breakpoints'
import { Loader2, AlertTriangle, DollarSign, TrendingUp } from 'lucide-react'

export default function RecurringIssuesPage() {
  const { isMobile } = useBreakpoint()
  const [period, setPeriod] = useState(90)
  const { data: issues, isLoading } = useRecurringIssues(period)

  if (isMobile) {
    return <MobileRecurringIssuesPage />
  }

  const totalIssues = issues?.length || 0
  const total30d = issues?.reduce((sum, i) => sum + i.count30d, 0) || 0
  const totalCost = issues?.reduce((sum, i) => sum + i.totalCost, 0) || 0

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', notation: 'compact' }).format(value)

  return (
    <div className="space-y-4">
      <PageHeader
        title="Vấn đề lặp lại"
        description="Phân tích thiết bị và phòng có sự cố thường xuyên"
      />

      <Tabs value={period.toString()} onValueChange={(v) => setPeriod(Number(v))}>
        <TabsList className="h-8">
          <TabsTrigger value="30" className="text-xs h-7">30 ngày</TabsTrigger>
          <TabsTrigger value="90" className="text-xs h-7">90 ngày</TabsTrigger>
          <TabsTrigger value="180" className="text-xs h-7">6 tháng</TabsTrigger>
          <TabsTrigger value="365" className="text-xs h-7">1 năm</TabsTrigger>
        </TabsList>

        <TabsContent value={period.toString()} className="space-y-3 mt-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : issues && issues.length > 0 ? (
            <>
              {/* Stats Row */}
              <div className="grid gap-3 md:grid-cols-3">
                <div className="border rounded-lg p-3 flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  <div>
                    <div className="text-xl font-semibold">{totalIssues}</div>
                    <div className="text-xs text-muted-foreground">Thiết bị/Phòng có vấn đề</div>
                  </div>
                </div>
                <div className="border rounded-lg p-3 flex items-center gap-3">
                  <TrendingUp className="h-5 w-5 text-red-500" />
                  <div>
                    <div className="text-xl font-semibold">{total30d}</div>
                    <div className="text-xs text-muted-foreground">Tổng sự cố (30 ngày)</div>
                  </div>
                </div>
                <div className="border rounded-lg p-3 flex items-center gap-3">
                  <DollarSign className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="text-xl font-semibold">{formatCurrency(totalCost)}</div>
                    <div className="text-xs text-muted-foreground">Tổng chi phí</div>
                  </div>
                </div>
              </div>

              <RecurringIssuesTable issues={issues} />
            </>
          ) : (
            <div className="border rounded-lg p-8 text-center">
              <div className="flex flex-col items-center gap-3 max-w-md mx-auto">
                <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center">
                  <span className="text-green-600 text-xl">✓</span>
                </div>
                <div>
                  <p className="font-medium mb-1">Không có vấn đề lặp lại</p>
                  <p className="text-sm text-muted-foreground">
                    Trong {period} ngày qua, không có thiết bị hoặc phòng nào gặp sự cố lặp lại (≥2 lần)
                  </p>
                </div>
                <div className="text-left w-full mt-2 p-3 bg-muted/50 rounded-lg text-sm">
                  <p className="font-medium mb-1">💡 Mẹo phân tích:</p>
                  <ul className="text-muted-foreground space-y-0.5 text-xs">
                    <li>• Thử tăng khoảng thời gian để xem xu hướng dài hạn</li>
                    <li>• Vấn đề lặp lại giúp xác định thiết bị cần thay thế</li>
                    <li>• Theo dõi chi phí bảo trì để tối ưu ngân sách</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
