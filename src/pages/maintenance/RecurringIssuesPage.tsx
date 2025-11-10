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
              {issues && issues.length > 0 && (
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
              )}

              <RecurringIssuesTable issues={issues || []} />
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
