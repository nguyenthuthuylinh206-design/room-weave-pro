import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMaintenanceRequests } from '@/hooks/useMaintenanceRequests'
import { MobileDetailHeader } from '@/components/layout/MobileDetailHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PullToRefresh } from '@/components/mobile/TouchOptimized'
import { Plus, Search, AlertCircle, Clock, CheckCircle, XCircle } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

const STATUS_CONFIG = {
  pending: { label: 'Chờ xử lý', color: 'bg-yellow-500', icon: Clock },
  in_progress: { label: 'Đang xử lý', color: 'bg-blue-500', icon: AlertCircle },
  completed: { label: 'Hoàn thành', color: 'bg-green-500', icon: CheckCircle },
  cancelled: { label: 'Đã hủy', color: 'bg-gray-500', icon: XCircle },
}

const PRIORITY_CONFIG = {
  low: { label: 'Thấp', color: 'bg-gray-100 text-gray-800' },
  medium: { label: 'Trung bình', color: 'bg-blue-100 text-blue-800' },
  high: { label: 'Cao', color: 'bg-orange-100 text-orange-800' },
  urgent: { label: 'Khẩn cấp', color: 'bg-red-100 text-red-800' },
}

export const MobileMaintenanceRequestsPage = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  
  const { data: requests = [], isLoading } = useMaintenanceRequests()

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['maintenance-requests'] })
    toast.success('Đã cập nhật!')
  }

  const filteredRequests = requests.filter(req =>
    req.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    req.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    req.request_code?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-background pb-20">
      <MobileDetailHeader
        title="Yêu cầu bảo trì"
        showBack={false}
        action={{
          icon: Plus,
          onClick: () => navigate('/maintenance/create'),
          label: 'Tạo yêu cầu'
        }}
      />

      <PullToRefresh onRefresh={handleRefresh}>
        <div className="p-4 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm yêu cầu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Requests List */}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : filteredRequests.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">
                  {searchQuery ? 'Không tìm thấy yêu cầu' : 'Chưa có yêu cầu bảo trì'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredRequests.map((request) => {
                const status = STATUS_CONFIG[request.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending
                const priority = PRIORITY_CONFIG[request.priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.medium
                const StatusIcon = status.icon

                return (
                  <Card 
                    key={request.id}
                    className="active:scale-[0.98] transition-transform cursor-pointer"
                    onClick={() => navigate(`/maintenance/${request.id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <StatusIcon className={`h-4 w-4 ${status.color.replace('bg-', 'text-')}`} />
                            <span className="font-medium text-sm truncate">{request.title}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">#{request.request_code}</p>
                        </div>
                        <Badge className={priority.color} variant="secondary">
                          {priority.label}
                        </Badge>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <span className="text-xs">📍</span>
                          <span className="text-xs truncate">{request.location}</span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <Badge className={status.color} variant="secondary">
                            {status.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(request.created_at || '').toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}

          {/* Create Button */}
          <Button
            className="w-full h-12 text-base"
            onClick={() => navigate('/maintenance/create')}
          >
            <Plus className="h-5 w-5 mr-2" />
            Tạo yêu cầu bảo trì
          </Button>
        </div>
      </PullToRefresh>
    </div>
  )
}
