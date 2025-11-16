import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useMaintenanceRequest } from '@/hooks/useMaintenanceRequests'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { PriorityBadge } from '@/components/maintenance/PriorityBadge'
import { StatusBadge } from '@/components/maintenance/StatusBadge'
import { MaintenanceTimeline } from '@/components/maintenance/MaintenanceTimeline'
import { AssignTechnicianDialog } from '@/components/maintenance/AssignTechnicianDialog'
import { CompleteRequestDialog } from '@/components/maintenance/CompleteRequestDialog'
import { CancelRequestDialog } from '@/components/maintenance/CancelRequestDialog'
import { UpdateProgressDialog } from '@/components/maintenance/UpdateProgressDialog'
import { useStartRequest } from '@/hooks/useMaintenanceRequests'
import { toast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  ArrowLeft, 
  Calendar, 
  MapPin, 
  User, 
  Wrench, 
  DollarSign,
  FileText,
  Image as ImageIcon,
  Edit,
  Shield
} from 'lucide-react'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'

export default function MaintenanceRequestDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: request, isLoading } = useMaintenanceRequest(id!)
  const startRequest = useStartRequest()
  
  const [showAssignDialog, setShowAssignDialog] = useState(false)
  const [showCompleteDialog, setShowCompleteDialog] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [showUpdateDialog, setShowUpdateDialog] = useState(false)

  const handleStartRequest = async () => {
    try {
      await startRequest.mutateAsync(id!)
      toast({
        title: 'Đã bắt đầu xử lý',
        description: 'Yêu cầu bảo trì đang được xử lý',
      })
    } catch (error) {
      toast({
        title: 'Lỗi',
        description: 'Không thể bắt đầu xử lý yêu cầu',
        variant: 'destructive',
      })
    }
  }

  const issueTypeLabels: Record<string, string> = {
    repair: '🔧 Sửa chữa',
    replace: '🔄 Thay thế',
    inspection: '🔍 Kiểm tra',
    cleaning: '🧹 Vệ sinh',
    other: '➕ Khác',
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!request) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Không tìm thấy yêu cầu bảo trì</p>
        <Button onClick={() => navigate('/maintenance/requests')} className="mt-4">
          Quay lại danh sách
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/maintenance/requests')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <PageHeader
            title={`Chi tiết yêu cầu: ${request.request_code}`}
            description={request.title}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        {request.status === 'pending' && (
          <>
            <Button onClick={() => setShowAssignDialog(true)}>
              <User className="h-4 w-4 mr-2" />
              Gán thợ
            </Button>
            <Button variant="outline" asChild>
              <Link to={`/maintenance/requests/edit/${id}`}>
                <Edit className="h-4 w-4 mr-2" />
                Sửa
              </Link>
            </Button>
          </>
        )}
        
        {request.status === 'assigned' && (
          <Button onClick={handleStartRequest}>
            <Wrench className="h-4 w-4 mr-2" />
            Bắt đầu xử lý
          </Button>
        )}
        
        {request.status === 'in_progress' && (
          <>
            <Button onClick={() => setShowUpdateDialog(true)} variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              Cập nhật tiến độ
            </Button>
            <Button onClick={() => setShowCompleteDialog(true)}>
              Hoàn thành
            </Button>
          </>
        )}

        {(request.status === 'pending' || request.status === 'assigned') && (
          <Button onClick={() => setShowCancelDialog(true)} variant="destructive">
            Hủy yêu cầu
          </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Info */}
        <div className="md:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Thông tin cơ bản</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Loại yêu cầu</p>
                  <p className="font-medium">{issueTypeLabels[request.issue_type]}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Độ ưu tiên</p>
                  <PriorityBadge priority={request.priority as 'low' | 'medium' | 'high' | 'urgent'} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Trạng thái</p>
                  <StatusBadge status={request.status as 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled'} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Mã yêu cầu</p>
                  <p className="font-medium font-mono">{request.request_code}</p>
                </div>
              </div>

              <Separator />

              <div>
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm">Vị trí</span>
                </div>
                <p className="font-medium">
                  {request.room ? `Phòng ${request.room.room_number} - ${request.room.room_type}` : request.location}
                </p>
                {request.location && request.room && (
                  <p className="text-sm text-muted-foreground mt-1">{request.location}</p>
                )}
              </div>

              <Separator />

              <div>
                <p className="text-sm text-muted-foreground mb-2">Mô tả chi tiết</p>
                <p className="whitespace-pre-wrap">{request.description}</p>
              </div>

              {request.item && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Thiết bị liên quan</p>
                    <p className="font-medium">
                      {request.item.name} ({request.item.code})
                    </p>
                  </div>
                </>
              )}

              {request.notes && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Ghi chú</p>
                    <p className="text-sm">{request.notes}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Solution & Completion */}
          {request.status === 'completed' && (
            <Card>
              <CardHeader>
                <CardTitle>Giải pháp & Hoàn thành</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {request.solution && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Giải pháp đã áp dụng</p>
                    <p className="whitespace-pre-wrap">{request.solution}</p>
                  </div>
                )}
                
                {request.completion_notes && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Ghi chú hoàn thành</p>
                      <p className="text-sm">{request.completion_notes}</p>
                    </div>
                  </>
                )}

                {request.parts_used && request.parts_used.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Phụ tùng đã sử dụng</p>
                      <ul className="list-disc list-inside space-y-1">
                        {request.parts_used.map((part: string, index: number) => (
                          <li key={index} className="text-sm">{part}</li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}

                {request.completion_photos && request.completion_photos.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Ảnh hoàn thành</p>
                      <div className="grid grid-cols-3 gap-2">
                        {request.completion_photos.map((photo: string, index: number) => (
                          <img
                            key={index}
                            src={photo}
                            alt={`Completion ${index + 1}`}
                            className="w-full h-24 object-cover rounded border"
                          />
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Photos */}
          {request.photos && request.photos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Hình ảnh
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {request.photos.map((photo: string, index: number) => (
                    <img
                      key={index}
                      src={photo}
                      alt={`Photo ${index + 1}`}
                      className="w-full h-32 object-cover rounded border"
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <MaintenanceTimeline request={request} />
            </CardContent>
          </Card>

          {/* People */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Người liên quan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Người báo cáo</p>
                <div className="flex items-center gap-2 mt-1">
                  {request.reporter?.avatar_url && (
                    <img
                      src={request.reporter.avatar_url}
                      alt={request.reporter.full_name}
                      className="w-8 h-8 rounded-full"
                    />
                  )}
                  <p className="font-medium">{request.reporter?.full_name || 'N/A'}</p>
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-sm text-muted-foreground">Người xử lý</p>
                {request.assignee ? (
                  <div className="flex items-center gap-2 mt-1">
                    {request.assignee.avatar_url && (
                      <img
                        src={request.assignee.avatar_url}
                        alt={request.assignee.full_name}
                        className="w-8 h-8 rounded-full"
                      />
                    )}
                    <p className="font-medium">{request.assignee.full_name}</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mt-1">Chưa gán</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Cost Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Chi phí
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {request.estimated_cost && (
                <div>
                  <p className="text-sm text-muted-foreground">Chi phí dự kiến</p>
                  <p className="font-medium text-lg">
                    {new Intl.NumberFormat('vi-VN', {
                      style: 'currency',
                      currency: 'VND',
                    }).format(request.estimated_cost)}
                  </p>
                </div>
              )}

              {request.actual_cost && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground">Chi phí thực tế</p>
                    <p className="font-medium text-lg">
                      {new Intl.NumberFormat('vi-VN', {
                        style: 'currency',
                        currency: 'VND',
                      }).format(request.actual_cost)}
                    </p>
                  </div>
                </>
              )}

              {!request.estimated_cost && !request.actual_cost && (
                <p className="text-sm text-muted-foreground">Chưa có thông tin chi phí</p>
              )}
            </CardContent>
          </Card>

          {/* Warranty */}
          {request.under_warranty && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Bảo hành
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant="secondary" className="mb-2">
                  Trong thời gian bảo hành
                </Badge>
                {request.warranty_info && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {request.warranty_info}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Dates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Thời gian
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Thời gian báo cáo</p>
                <p className="text-sm font-medium">
                  {format(new Date(request.reported_at), 'PPp', { locale: vi })}
                </p>
              </div>

              {request.expected_completion_date && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground">Dự kiến hoàn thành</p>
                    <p className="text-sm font-medium">
                      {format(new Date(request.expected_completion_date), 'PPp', { locale: vi })}
                    </p>
                  </div>
                </>
              )}

              {request.started_at && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground">Bắt đầu xử lý</p>
                    <p className="text-sm font-medium">
                      {format(new Date(request.started_at), 'PPp', { locale: vi })}
                    </p>
                  </div>
                </>
              )}

              {request.completed_at && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground">Hoàn thành</p>
                    <p className="text-sm font-medium">
                      {format(new Date(request.completed_at), 'PPp', { locale: vi })}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialogs */}
      <AssignTechnicianDialog
        open={showAssignDialog}
        onOpenChange={setShowAssignDialog}
        requestId={id!}
      />
      <CompleteRequestDialog
        open={showCompleteDialog}
        onOpenChange={setShowCompleteDialog}
        requestId={id!}
      />
      <CancelRequestDialog
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        requestId={id!}
      />
      <UpdateProgressDialog
        open={showUpdateDialog}
        onOpenChange={setShowUpdateDialog}
        requestId={id!}
      />
    </div>
  )
}
