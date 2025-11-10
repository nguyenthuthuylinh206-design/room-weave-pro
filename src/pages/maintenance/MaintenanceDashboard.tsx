import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Plus, Calendar, FileText, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useMaintenanceDashboard } from '@/hooks/useMaintenanceDashboard'
import { MaintenanceStats } from '@/components/maintenance/MaintenanceStats'
import { ActiveRequestsSection } from '@/components/maintenance/ActiveRequestsSection'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function MaintenanceDashboard() {
  const navigate = useNavigate()
  const { data, isLoading } = useMaintenanceDashboard()

  const defaultStats = {
    total: 0,
    totalLast30Days: 0,
    inProgress: 0,
    completed: 0,
    completedLast30Days: 0,
    completionRate: 0,
    avgTime: 0,
    costLast30Days: 0,
    mttr: 0,
    mtbf: 0,
    firstTimeFixRate: 0,
  }

  return (
    <div className="space-y-6">
        <PageHeader
          title="Quản lý Bảo trì"
          description="Theo dõi và xử lý các yêu cầu bảo trì"
        >
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/maintenance/schedules')}>
              <Calendar className="h-4 w-4" />
              Lịch bảo trì
            </Button>
            <Button variant="outline" onClick={() => navigate('/maintenance/reports')}>
              <FileText className="h-4 w-4" />
              Báo cáo
            </Button>
            <Button onClick={() => navigate('/maintenance/requests/new')}>
              <Plus className="h-4 w-4" />
              Tạo yêu cầu
            </Button>
          </div>
        </PageHeader>

        {/* Stats */}
        <MaintenanceStats stats={data?.stats || defaultStats} isLoading={isLoading} />

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Thao tác nhanh</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-4">
              <Button
                variant="outline"
                className="h-auto flex-col items-start p-4"
                onClick={() => navigate('/maintenance/requests/new')}
              >
                <Plus className="h-5 w-5 mb-2" />
                <span className="font-medium">Tạo yêu cầu mới</span>
                <span className="text-xs text-muted-foreground">Báo cáo sự cố bảo trì</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto flex-col items-start p-4"
                onClick={() => navigate('/maintenance/schedules')}
              >
                <Calendar className="h-5 w-5 mb-2" />
                <span className="font-medium">Lên lịch bảo trì</span>
                <span className="text-xs text-muted-foreground">Bảo trì định kỳ</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto flex-col items-start p-4"
                onClick={() => navigate('/maintenance/reports')}
              >
                <FileText className="h-5 w-5 mb-2" />
                <span className="font-medium">Xem báo cáo</span>
                <span className="text-xs text-muted-foreground">Phân tích & thống kê</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto flex-col items-start p-4"
                onClick={() => navigate('/maintenance/technicians')}
              >
                <Users className="h-5 w-5 mb-2" />
                <span className="font-medium">Quản lý thợ</span>
                <span className="text-xs text-muted-foreground">Phân công công việc</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Active Requests */}
        {data?.activeRequests && (
          <ActiveRequestsSection requests={data.activeRequests} />
        )}

        {/* Technician Status */}
        {data?.technicians && data.technicians.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Kỹ thuật viên</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.technicians.slice(0, 5).map((tech: any) => {
                  const taskCount = tech.assigned_requests?.[0]?.count || 0
                  const status =
                    taskCount === 0 ? 'available' : taskCount <= 2 ? 'busy' : 'overloaded'

                  return (
                    <div
                      key={tech.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{tech.full_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {taskCount} công việc
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {status === 'available' && (
                          <span className="inline-flex items-center gap-1 text-sm text-green-600">
                            <span className="w-2 h-2 rounded-full bg-green-600" />
                            Sẵn sàng
                          </span>
                        )}
                        {status === 'busy' && (
                          <span className="inline-flex items-center gap-1 text-sm text-yellow-600">
                            <span className="w-2 h-2 rounded-full bg-yellow-600" />
                            Bận
                          </span>
                        )}
                        {status === 'overloaded' && (
                          <span className="inline-flex items-center gap-1 text-sm text-red-600">
                            <span className="w-2 h-2 rounded-full bg-red-600" />
                            Quá tải
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Completions */}
        {data?.recentCompletions && data.recentCompletions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Hoàn thành gần đây</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.recentCompletions.slice(0, 10).map((request: any) => (
                  <div
                    key={request.id}
                    className="flex items-start gap-3 p-3 rounded-lg border"
                  >
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-green-600">✓</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{request.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {request.request_code} • {request.location}
                      </p>
                      {request.actual_cost && (
                        <p className="text-xs text-muted-foreground">
                          Chi phí:{' '}
                          {new Intl.NumberFormat('vi-VN', {
                            style: 'currency',
                            currency: 'VND',
                          }).format(request.actual_cost)}
                        </p>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(request.completed_at).toLocaleDateString('vi-VN')}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }
