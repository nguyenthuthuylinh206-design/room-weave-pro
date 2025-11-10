import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  FileText, 
  Download, 
  TrendingUp, 
  Package, 
  DollarSign,
  Calendar,
  BarChart3,
  PieChart
} from 'lucide-react'

export function ReportsPage() {
  const reports = [
    {
      id: 'inventory',
      title: 'Báo cáo tồn kho',
      description: 'Tình hình tồn kho và biến động tài sản',
      icon: Package,
      color: 'text-blue-500',
    },
    {
      id: 'expenses',
      title: 'Báo cáo chi phí',
      description: 'Tổng hợp chi phí giặt là và bảo trì',
      icon: DollarSign,
      color: 'text-green-500',
    },
    {
      id: 'laundry',
      title: 'Báo cáo giặt là',
      description: 'Thống kê các lô giặt và nhà cung cấp',
      icon: TrendingUp,
      color: 'text-purple-500',
    },
    {
      id: 'rooms',
      title: 'Báo cáo phòng',
      description: 'Tình trạng phòng và tài sản theo phòng',
      icon: Calendar,
      color: 'text-orange-500',
    },
    {
      id: 'performance',
      title: 'Báo cáo hiệu suất',
      description: 'Đánh giá hiệu suất làm việc của nhân viên',
      icon: BarChart3,
      color: 'text-red-500',
    },
    {
      id: 'summary',
      title: 'Báo cáo tổng hợp',
      description: 'Tổng quan toàn bộ hoạt động',
      icon: PieChart,
      color: 'text-indigo-500',
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Báo cáo"
        description="Xem và tải xuống các báo cáo thống kê"
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {reports.map((report) => {
          const Icon = report.icon
          return (
            <Card key={report.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-muted p-2">
                      <Icon className={`h-6 w-6 ${report.color}`} />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{report.title}</CardTitle>
                    </div>
                  </div>
                </div>
                <CardDescription className="mt-2">
                  {report.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <FileText className="mr-2 h-4 w-4" />
                    Xem
                  </Button>
                  <Button variant="default" size="sm" className="flex-1">
                    <Download className="mr-2 h-4 w-4" />
                    Tải xuống
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tạo báo cáo tùy chỉnh</CardTitle>
          <CardDescription>
            Chọn các thông số để tạo báo cáo theo nhu cầu của bạn
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12 text-center">
            <div className="space-y-4">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Tính năng đang phát triển</p>
                <p className="text-sm text-muted-foreground">
                  Tạo báo cáo tùy chỉnh sẽ sớm được cung cấp
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
