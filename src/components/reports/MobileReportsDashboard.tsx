import { useNavigate } from 'react-router-dom'
import {
  Package,
  DollarSign,
  ArrowRightLeft,
  Shirt,
  Home,
  Wrench,
} from 'lucide-react'
import { PullToRefresh } from '@/components/mobile/TouchOptimized'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useQueryClient } from '@tanstack/react-query'

const reportCategories = [
  {
    id: 'inventory',
    title: 'Tồn kho',
    icon: Package,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950/50',
    description: 'Hiện trạng, vòng quay, ABC phân tích',
    path: '/reports/inventory',
  },
  {
    id: 'financial',
    title: 'Tài chính',
    icon: DollarSign,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-950/50',
    description: 'Chi phí, giá trị, ROI, so sánh',
    path: '/reports/financial',
  },
  {
    id: 'operations',
    title: 'Hoạt động',
    icon: ArrowRightLeft,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-950/50',
    description: 'Nhập xuất, kiểm kê, giao dịch',
    path: '/reports/operations',
  },
  {
    id: 'laundry',
    title: 'Giặt là',
    icon: Shirt,
    color: 'text-cyan-600 dark:text-cyan-400',
    bgColor: 'bg-cyan-50 dark:bg-cyan-950/50',
    description: 'Chi phí, hiệu suất, nhà cung cấp',
    path: '/reports/laundry',
  },
  {
    id: 'rooms',
    title: 'Phòng',
    icon: Home,
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-950/50',
    description: 'Sử dụng, thiếu hụt, kiểm tra',
    path: '/reports/rooms',
  },
  {
    id: 'maintenance',
    title: 'Bảo trì',
    icon: Wrench,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-950/50',
    description: 'Yêu cầu, chi phí, thời gian',
    path: '/reports/maintenance',
  },
]

export function MobileReportsDashboard() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['quick-report'] })
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-4 pb-20">
        {/* Header */}
        <div className="px-4 pt-2">
          <h1 className="text-2xl font-bold">Báo cáo & Thống kê</h1>
          <p className="text-sm text-muted-foreground">
            Phân tích dữ liệu cho quản lý
          </p>
        </div>

        {/* Report Categories */}
        <div className="px-4 space-y-3">
          <h2 className="text-lg font-semibold">Chọn loại báo cáo</h2>
          <div className="grid gap-3">
            {reportCategories.map((category) => {
              const Icon = category.icon

              return (
                <Card
                  key={category.id}
                  className="cursor-pointer active:scale-95 transition-transform"
                  onClick={() => navigate(category.path)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`rounded-lg p-3 ${category.bgColor}`}>
                        <Icon className={`h-6 w-6 ${category.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold">{category.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {category.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Tips */}
        <div className="px-4 pb-4">
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">
                💡 <strong>Mẹo:</strong> Chọn loại báo cáo phù hợp để xem phân tích chi tiết và insights
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </PullToRefresh>
  )
}
