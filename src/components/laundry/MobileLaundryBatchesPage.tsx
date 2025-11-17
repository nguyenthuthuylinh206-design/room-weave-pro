import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MobileDetailHeader } from '@/components/layout/MobileDetailHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useLaundryBatches } from '@/hooks/useLaundryBatches'
import { PullToRefresh } from '@/components/mobile/PullToRefresh'
import { Package, Truck, CheckCircle, Clock, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

type FilterStatus = 'all' | 'delivered' | 'washing' | 'ready' | 'received'

const STATUS_CONFIG = {
  delivered: { label: 'Đã giao', icon: Truck, color: 'bg-blue-500' },
  washing: { label: 'Đang giặt', icon: Clock, color: 'bg-yellow-500' },
  ready: { label: 'Sẵn sàng', icon: Package, color: 'bg-green-500' },
  received: { label: 'Đã nhận', icon: CheckCircle, color: 'bg-gray-500' },
}

export const MobileLaundryBatchesPage = () => {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<FilterStatus>('all')
  const { data, isLoading, refetch } = useLaundryBatches()
  const batches = data?.batches || []

  const filteredBatches = filter === 'all' 
    ? batches 
    : batches.filter((b: any) => b.status === filter)

  const handleRefresh = async () => {
    await refetch()
  }

  const getStatusConfig = (status: string) => {
    return STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || {
      label: status,
      icon: Package,
      color: 'bg-gray-500'
    }
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <MobileDetailHeader
        title="Giặt là"
        showBack
      />

      {/* Add Button */}
      <div className="p-4">
        <Button
          className="w-full"
          onClick={() => navigate('/laundry/batches/new')}
        >
          <Plus className="h-4 w-4 mr-2" />
          Tạo lô giặt mới
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="sticky top-14 bg-background border-b z-10 px-4 py-3 overflow-x-auto">
        <div className="flex gap-2">
          {(['all', 'delivered', 'washing', 'ready', 'received'] as FilterStatus[]).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                filter === status
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground'
              )}
            >
              {status === 'all' ? 'Tất cả' : STATUS_CONFIG[status].label}
            </button>
          ))}
        </div>
      </div>

      {/* Batches List */}
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="p-4 space-y-3">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="h-20 bg-muted rounded" />
                </CardContent>
              </Card>
            ))
          ) : filteredBatches.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Package className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground">
                  {filter === 'all' ? 'Chưa có lô giặt nào' : 'Không có lô giặt nào'}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredBatches.map((batch: any) => {
              const statusConfig = getStatusConfig(batch.status)
              const StatusIcon = statusConfig.icon

              return (
                <Card
                  key={batch.id}
                  className="cursor-pointer active:scale-98 transition-transform"
                  onClick={() => navigate(`/laundry/batches/${batch.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-lg">
                            {batch.batch_code}
                          </span>
                          <Badge variant="outline" className={cn('text-xs', statusConfig.color)}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusConfig.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {batch.vendor?.name || 'N/A'}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">Số lượng</p>
                        <p className="font-medium">{batch.total_items} món</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Khối lượng</p>
                        <p className="font-medium">{batch.total_weight_kg} kg</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Ngày giao</p>
                        <p className="font-medium">
                          {format(new Date(batch.delivery_date), 'dd/MM')}
                        </p>
                      </div>
                    </div>

                    {batch.expected_return_date && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Dự kiến trả:</span>
                          <span className="font-medium">
                            {format(new Date(batch.expected_return_date), 'dd/MM/yyyy')}
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      </PullToRefresh>
    </div>
  )
}
