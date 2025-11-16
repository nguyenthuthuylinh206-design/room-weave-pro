import { useState } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { RecurringIssuesTable } from '@/components/maintenance/RecurringIssuesTable'
import { useRecurringIssues } from '@/hooks/useRecurringIssues'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'

export default function RecurringIssuesPage() {
  const [period, setPeriod] = useState(90)
  const { data: issues, isLoading } = useRecurringIssues(period)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vấn đề lặp lại"
        description="Phân tích thiết bị và phòng có sự cố thường xuyên"
      />

      <Tabs value={period.toString()} onValueChange={(v) => setPeriod(Number(v))}>
        <TabsList>
          <TabsTrigger value="30">30 ngày</TabsTrigger>
          <TabsTrigger value="90">90 ngày</TabsTrigger>
          <TabsTrigger value="180">6 tháng</TabsTrigger>
          <TabsTrigger value="365">1 năm</TabsTrigger>
        </TabsList>

        <TabsContent value={period.toString()} className="space-y-4">
          {isLoading ? (
            <Card>
              <CardContent className="py-12">
                <LoadingSpinner />
              </CardContent>
            </Card>
          ) : (
            <>
              {issues && issues.length > 0 ? (
                <>
                  <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold">{issues.length}</div>
                        <p className="text-sm text-muted-foreground">
                          Thiết bị/Phòng có vấn đề
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold">
                          {issues.reduce((sum, i) => sum + i.count30d, 0)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Tổng sự cố (30 ngày)
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold">
                          {new Intl.NumberFormat('vi-VN', {
                            style: 'currency',
                            currency: 'VND',
                            notation: 'compact',
                          }).format(issues.reduce((sum, i) => sum + i.totalCost, 0))}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Tổng chi phí
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <RecurringIssuesTable issues={issues} />
                </>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <div className="flex flex-col items-center gap-4 max-w-md mx-auto">
                      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                        <span className="text-3xl">✓</span>
                      </div>
                      <div>
                        <p className="font-medium text-lg mb-2">Tuyệt vời! Không có vấn đề lặp lại</p>
                        <p className="text-sm text-muted-foreground">
                          Trong {period} ngày qua, không có thiết bị hoặc phòng nào gặp sự cố lặp lại (≥2 lần)
                        </p>
                      </div>
                      <div className="text-left w-full mt-4 p-4 bg-muted rounded-lg">
                        <p className="text-sm font-medium mb-2">💡 Mẹo phân tích:</p>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          <li>• Thử tăng khoảng thời gian để xem xu hướng dài hạn</li>
                          <li>• Vấn đề lặp lại giúp xác định thiết bị cần thay thế</li>
                          <li>• Theo dõi chi phí bảo trì để tối ưu ngân sách</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
