import { useParams, useNavigate } from 'react-router-dom'
import { 
  Edit, 
  Printer, 
  Package as PackageIcon,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { BatchStatusBadge } from '@/components/laundry/BatchStatusBadge'
import { BatchStatusTimeline } from '@/components/laundry/BatchStatusTimeline'
import { BatchItemsTable } from '@/components/laundry/BatchItemsTable'
import { PhotoGallery } from '@/components/shared/PhotoGallery'
import { QRCodeDisplay } from '@/components/shared/QRCodeDisplay'
import { useLaundryBatch } from '@/hooks/useLaundryBatches'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'

export function BatchDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data, isLoading } = useLaundryBatch(id)
  
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-full" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    )
  }
  
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">Không tìm thấy lô giặt</h3>
        <Button onClick={() => navigate('/laundry')} className="mt-4">
          Quay lại danh sách
        </Button>
      </div>
    )
  }
  
  const batchData = data as any
  const batch = batchData.batch
  const vendor = batchData.vendor
  const items = batchData.items || []
  const deliveryStaff = batchData.delivery_staff
  const returnStaff = batchData.return_staff
  
  return (
    <div className="space-y-6">
      <PageHeader
        title={batch.batch_code}
        description={`Lô giặt - ${vendor?.name || ''}`}
      >
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/laundry')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quay lại
          </Button>
          {batch.status === 'ready' && (
            <Button onClick={() => navigate(`/laundry/batches/${id}/receive`)}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Nhận đồ về
            </Button>
          )}
        </div>
      </PageHeader>
      
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - 2/3 */}
        <div className="space-y-6 lg:col-span-2">
          {/* Status Timeline */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Trạng thái</CardTitle>
                <BatchStatusBadge status={batch.status} />
              </div>
            </CardHeader>
            <CardContent>
              <BatchStatusTimeline batch={batch} />
            </CardContent>
          </Card>
          
          {/* Delivery Info */}
          <Card>
            <CardHeader>
              <CardTitle>Thông tin giao hàng</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm text-muted-foreground">Đơn vị giặt</dt>
                  <dd className="font-medium">{vendor?.name || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Ngày giao</dt>
                  <dd className="font-medium">
                    {format(new Date(batch.delivery_date), 'PPP HH:mm', { locale: vi })}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Người giao</dt>
                  <dd className="flex items-center gap-2">
                    {deliveryStaff ? (
                      <>
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={deliveryStaff.avatar_url || undefined} />
                          <AvatarFallback>
                            {deliveryStaff.full_name?.charAt(0) || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{deliveryStaff.full_name}</span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">N/A</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Người nhận</dt>
                  <dd className="font-medium">{batch.receiver_name || 'N/A'}</dd>
                </div>
              </dl>
              
              {batch.notes && (
                <div className="mt-4 pt-4 border-t">
                  <dt className="text-sm text-muted-foreground mb-1">Ghi chú</dt>
                  <dd className="text-sm">{batch.notes}</dd>
                </div>
              )}
              
              {batch.delivery_photos && batch.delivery_photos.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <dt className="text-sm text-muted-foreground mb-2">Ảnh giao hàng</dt>
                  <PhotoGallery photos={batch.delivery_photos} />
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Return Info (if received) */}
          {batch.status === 'received' && (
            <Card>
              <CardHeader>
                <CardTitle>Thông tin nhận hàng</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm text-muted-foreground">Ngày nhận</dt>
                    <dd className="font-medium">
                      {batch.actual_return_date &&
                        format(new Date(batch.actual_return_date), 'PPP HH:mm', { locale: vi })}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Người nhận</dt>
                    <dd className="flex items-center gap-2">
                      {returnStaff ? (
                        <>
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={returnStaff.avatar_url || undefined} />
                            <AvatarFallback>
                              {returnStaff.full_name?.charAt(0) || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{returnStaff.full_name}</span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Người giao</dt>
                    <dd className="font-medium">{batch.delivery_person_name || 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Chất lượng</dt>
                    <dd className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <span
                          key={i}
                          className={
                            i < (batch.quality_rating || 0)
                              ? 'text-yellow-400'
                              : 'text-muted'
                          }
                        >
                          ★
                        </span>
                      ))}
                      <span className="ml-1 text-sm">
                        {batch.quality_rating}/5
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Đúng giờ</dt>
                    <dd className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <span
                          key={i}
                          className={
                            i < (batch.timeliness_rating || 0)
                              ? 'text-yellow-400'
                              : 'text-muted'
                          }
                        >
                          ★
                        </span>
                      ))}
                      <span className="ml-1 text-sm">
                        {batch.timeliness_rating}/5
                      </span>
                    </dd>
                  </div>
                </dl>
                
                {batch.return_notes && (
                  <div className="mt-4 pt-4 border-t">
                    <dt className="text-sm text-muted-foreground mb-1">Ghi chú nhận hàng</dt>
                    <dd className="text-sm">{batch.return_notes}</dd>
                  </div>
                )}
                
                {batch.return_photos && batch.return_photos.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <dt className="text-sm text-muted-foreground mb-2">Ảnh nhận hàng</dt>
                    <PhotoGallery photos={batch.return_photos} />
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          
          {/* Issues (if any) */}
          {batch.status === 'received' && (batch.items_lost > 0 || batch.items_damaged > 0) && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-red-600">Vấn đề phát hiện</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {batch.items_lost > 0 && (
                    <div className="flex items-center justify-between rounded-lg bg-red-50 p-3">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-red-600" />
                        <span className="font-medium">Items mất</span>
                      </div>
                      <span className="text-lg font-bold text-red-600">
                        {batch.items_lost}
                      </span>
                    </div>
                  )}
                  
                  {batch.items_damaged > 0 && (
                    <div className="flex items-center justify-between rounded-lg bg-orange-50 p-3">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-orange-600" />
                        <span className="font-medium">Items hư hỏng</span>
                      </div>
                      <span className="text-lg font-bold text-orange-600">
                        {batch.items_damaged}
                      </span>
                    </div>
                  )}
                  
                  {batch.compensation_amount > 0 && (
                    <div className="flex items-center justify-between rounded-lg bg-gray-100 p-3">
                      <span className="font-medium">Tổng bồi thường</span>
                      <span className="text-lg font-bold">
                        {formatCurrency(batch.compensation_amount)}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        
        {/* Right Column - 1/3 */}
        <div className="space-y-6">
          {/* Cost Card */}
          <Card>
            <CardHeader>
              <CardTitle>Chi phí</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Ước tính</span>
                <span className="font-medium">{formatCurrency(batch.estimated_cost)}</span>
              </div>
              
              {batch.actual_cost && (
                <>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Thực tế</span>
                    <span className="font-medium">{formatCurrency(batch.actual_cost)}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Chênh lệch</span>
                    <span className={
                      batch.actual_cost > batch.estimated_cost
                        ? 'text-red-600'
                        : 'text-green-600'
                    }>
                      {batch.actual_cost > batch.estimated_cost ? '+' : ''}
                      {formatCurrency(batch.actual_cost - batch.estimated_cost)}
                    </span>
                  </div>
                </>
              )}
              
              {batch.compensation_amount > 0 && (
                <>
                  <div className="border-t pt-3"></div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Bồi thường</span>
                    <span className="font-medium text-red-600">
                      -{formatCurrency(batch.compensation_amount)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between text-lg font-bold">
                    <span>Thành tiền</span>
                    <span>
                      {formatCurrency((batch.actual_cost || batch.estimated_cost) - batch.compensation_amount)}
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          
          {/* QR Code Card */}
          <Card>
            <CardHeader>
              <CardTitle>Mã QR</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <div className="rounded-lg border p-4 bg-white">
                <QRCodeDisplay value={batch.batch_code} size={160} />
              </div>
              <p className="text-center text-sm text-muted-foreground">
                Quét mã này khi nhận đồ về
              </p>
            </CardContent>
          </Card>
          
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Thao tác</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {batch.status === 'ready' && (
                <Button
                  className="w-full"
                  onClick={() => navigate(`/laundry/batches/${id}/receive`)}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Nhận đồ về
                </Button>
              )}
              
              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.print()}
              >
                <Printer className="mr-2 h-4 w-4" />
                In phiếu
              </Button>
              
              {batch.status !== 'received' && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate(`/laundry/batches/${id}/edit`)}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Sửa thông tin
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Items Table */}
      <Card>
        <CardHeader>
          <CardTitle>Chi tiết đồ giặt</CardTitle>
        </CardHeader>
        <CardContent>
          <BatchItemsTable items={items} batchStatus={batch.status} />
        </CardContent>
      </Card>
    </div>
  )
}
