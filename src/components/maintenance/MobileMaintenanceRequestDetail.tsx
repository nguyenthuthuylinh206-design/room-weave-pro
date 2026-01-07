import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MobileDetailHeader } from '@/components/layout/MobileDetailHeader'
import { useMaintenanceRequest } from '@/hooks/useMaintenanceRequests'
import { MaintenanceTimeline } from './MaintenanceTimeline'
import { PriorityBadge } from './PriorityBadge'
import { CompleteRequestDialog } from './CompleteRequestDialog'
import { CancelRequestDialog } from './CancelRequestDialog'
import { UpdateProgressDialog } from './UpdateProgressDialog'
import { PermissionGate } from '@/components/auth/PermissionGate'
import {
  MapPin,
  User,
  Calendar,
  DollarSign,
  FileText,
  Image as ImageIcon,
  CheckCircle,
  XCircle,
  Edit,
  Play,
} from 'lucide-react'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'

const STATUS_LABELS: Record<string, string> = {
  waiting: 'Đang chờ',
  pending: 'Tiếp nhận',
  in_progress: 'Đang xử lý',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
}

const ISSUE_TYPE_LABELS: Record<string, string> = {
  repair: 'Sửa chữa',
  replace: 'Thay thế',
  inspection: 'Kiểm tra',
  cleaning: 'Vệ sinh',
  other: 'Khác',
}

export const MobileMaintenanceRequestDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: request, isLoading } = useMaintenanceRequest(id!)

  const [showCompleteDialog, setShowCompleteDialog] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [showUpdateDialog, setShowUpdateDialog] = useState(false)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <MobileDetailHeader title="Chi tiết yêu cầu" showBack />
        <div className="p-4 space-y-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-24 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <MobileDetailHeader title="Chi tiết yêu cầu" showBack />
        <div className="p-4">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Không tìm thấy yêu cầu</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const canUpdate = request.status === 'pending' || request.status === 'in_progress'
  const canComplete = request.status === 'in_progress'
  const canCancel = request.status !== 'completed' && request.status !== 'cancelled'

  return (
    <div className="min-h-screen bg-background pb-20">
      <MobileDetailHeader
        title={request.request_code}
        showBack
        action={{
          icon: Edit,
          onClick: () => navigate(`/maintenance/requests/${id}/edit`),
        }}
      />

      <div className="p-4 space-y-4">
        {/* Status & Priority */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <PriorityBadge priority={request.priority as any} />
              <Badge variant={request.status === 'completed' ? 'default' : 'secondary'}>
                {STATUS_LABELS[request.status]}
              </Badge>
            </div>
            <h1 className="text-xl font-bold mb-2">{request.title}</h1>
            <p className="text-sm text-muted-foreground">{request.description}</p>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <PermissionGate module="maintenance" action="update">
          {canUpdate && (
            <div className="grid grid-cols-2 gap-3">
              {request.status === 'pending' && (
                <Button
                  className="flex-1"
                  onClick={() => {
                    /* Handle start */
                  }}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Bắt đầu
                </Button>
              )}
              {canComplete && (
                <Button
                  className="flex-1"
                  variant="default"
                  onClick={() => setShowCompleteDialog(true)}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Hoàn thành
                </Button>
              )}
              {canCancel && (
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => setShowCancelDialog(true)}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Hủy
                </Button>
              )}
            </div>
          )}
        </PermissionGate>

        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tiến trình</CardTitle>
          </CardHeader>
          <CardContent>
            <MaintenanceTimeline request={request} />
          </CardContent>
        </Card>

        {/* Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Thông tin chi tiết</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">Vị trí</p>
                <p className="font-medium">{request.location}</p>
                {request.room && (
                  <p className="text-sm text-muted-foreground">
                    Phòng {request.room.room_number} - Tầng {request.room.floor}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">Loại sự cố</p>
                <p className="font-medium">{ISSUE_TYPE_LABELS[request.issue_type]}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">Người báo cáo</p>
                <p className="font-medium">
                  {request.reporter?.full_name || 'N/A'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">Ngày báo cáo</p>
                <p className="font-medium">
                  {format(new Date(request.reported_at), 'dd/MM/yyyy HH:mm', {
                    locale: vi,
                  })}
                </p>
              </div>
            </div>

            {(request.estimated_cost || request.actual_cost) && (
              <div className="flex items-start gap-3">
                <DollarSign className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground">Chi phí</p>
                  <p className="font-medium">
                    {new Intl.NumberFormat('vi-VN', {
                      style: 'currency',
                      currency: 'VND',
                    }).format(request.actual_cost || request.estimated_cost || 0)}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Photos */}
        {request.photos && request.photos.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Hình ảnh
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                {request.photos.map((photo, index) => (
                  <div
                    key={index}
                    className="aspect-square rounded-lg overflow-hidden bg-muted"
                  >
                    <img
                      src={photo}
                      alt={`Photo ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Solution */}
        {request.solution && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Giải pháp</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{request.solution}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialogs */}
      <CompleteRequestDialog
        open={showCompleteDialog}
        onOpenChange={setShowCompleteDialog}
        requestId={request.id}
      />
      <CancelRequestDialog
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        requestId={request.id}
      />
      <UpdateProgressDialog
        open={showUpdateDialog}
        onOpenChange={setShowUpdateDialog}
        requestId={request.id}
      />
    </div>
  )
}
