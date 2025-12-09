import { useParams, useNavigate } from 'react-router-dom'
import { 
  Edit, 
  Phone, 
  Mail, 
  MapPin,
  Star,
  Package,
  DollarSign,
  Clock,
  TrendingUp,
  FileText,
  ChevronRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { MobileDetailHeader } from '@/components/layout/MobileDetailHeader'
import { VendorBatchHistory } from '@/components/laundry/VendorBatchHistory'
import { useLaundryVendor, useVendorPerformance } from '@/hooks/useLaundryVendors'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'

export function MobileVendorDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  
  const { data: vendor, isLoading } = useLaundryVendor(id)
  const { data: performance } = useVendorPerformance(id, 30)
  
    return (
      <div className="min-h-screen bg-background pb-20">
        <MobileDetailHeader title="Đang tải..." onBack={() => navigate('/laundry/vendors')} />
        <div className="px-4 py-4 space-y-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-24" />
          <Skeleton className="h-48" />
        </div>
      </div>
    )
  
  if (!vendor) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <MobileDetailHeader title="Không tìm thấy" onBack={() => navigate('/laundry/vendors')} />
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <p className="text-muted-foreground text-center">Không tìm thấy đơn vị giặt</p>
          <Button onClick={() => navigate('/laundry/vendors')} className="mt-4">
            Quay lại danh sách
          </Button>
        </div>
      </div>
    )
  }
  
  const contractInfo = vendor.contract_info as any
  const logo = contractInfo?.logo_url
  const pricePerKg = contractInfo?.price_per_kg || 0
  const minOrder = contractInfo?.minimum_order_kg || 0
  const paymentTerms = contractInfo?.payment_terms
  const deliveryTime = contractInfo?.delivery_time
  const contractStart = contractInfo?.contract_start
  const contractEnd = contractInfo?.contract_end
  
  return (
    <div className="min-h-screen bg-background pb-20">
      <MobileDetailHeader 
        title={vendor.name} 
        onBack={() => navigate('/laundry/vendors')}
        action={{
          icon: Edit,
          onClick: () => navigate(`/laundry/vendors/${id}/edit`),
          label: 'Sửa thông tin'
        }}
      />
      
      <div className="px-4 py-4 space-y-4">
        {/* Vendor Header Card */}
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={logo} alt={vendor.name} />
              <AvatarFallback className="text-xl bg-primary/10 text-primary">
                {vendor.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-lg font-bold">{vendor.name}</h2>
              <p className="text-sm text-muted-foreground">{vendor.code}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={vendor.type === 'external' ? 'default' : 'secondary'}>
                  {vendor.type === 'external' ? 'Ngoài' : 'Nội bộ'}
                </Badge>
                <Badge variant={vendor.status === 'active' ? 'outline' : 'secondary'}>
                  {vendor.status === 'active' ? 'Hoạt động' : 'Tạm ngưng'}
                </Badge>
              </div>
            </div>
          </div>
        </Card>
        
        {/* Performance Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-lg font-bold">{performance?.total_orders || 0}</p>
                <p className="text-xs text-muted-foreground">Đơn hàng</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-lg font-bold">{formatCurrency(performance?.total_cost || 0)}</p>
                <p className="text-xs text-muted-foreground">Tổng chi phí</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                <Star className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-lg font-bold">{(performance?.avg_quality || 0).toFixed(1)}/5</p>
                <p className="text-xs text-muted-foreground">Đánh giá</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-lg font-bold">{(performance?.on_time_rate || 0).toFixed(0)}%</p>
                <p className="text-xs text-muted-foreground">Đúng hạn</p>
              </div>
            </div>
          </Card>
        </div>
        
        {/* Tabs */}
        <Tabs defaultValue="info" className="space-y-4">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="info">Thông tin</TabsTrigger>
            <TabsTrigger value="contract">Hợp đồng</TabsTrigger>
            <TabsTrigger value="history">Lịch sử</TabsTrigger>
          </TabsList>
          
          {/* Info Tab */}
          <TabsContent value="info" className="space-y-4">
            {/* Contact Info */}
            <Card className="divide-y">
              {vendor.phone && (
                <a 
                  href={`tel:${vendor.phone}`}
                  className="flex items-center gap-3 p-4 hover:bg-accent transition-colors"
                >
                  <Phone className="h-5 w-5 text-primary" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Điện thoại</p>
                    <p className="font-medium">{vendor.phone}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </a>
              )}
              
              {vendor.email && (
                <a 
                  href={`mailto:${vendor.email}`}
                  className="flex items-center gap-3 p-4 hover:bg-accent transition-colors"
                >
                  <Mail className="h-5 w-5 text-primary" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{vendor.email}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </a>
              )}
              
              {vendor.address && (
                <div className="flex items-start gap-3 p-4">
                  <MapPin className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Địa chỉ</p>
                    <p className="font-medium">{vendor.address}</p>
                  </div>
                </div>
              )}
              
              {vendor.contact_person && (
                <div className="flex items-start gap-3 p-4">
                  <FileText className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Người liên hệ</p>
                    <p className="font-medium">{vendor.contact_person}</p>
                  </div>
                </div>
              )}
            </Card>
            
            {/* Notes */}
            {vendor.notes && (
              <Card className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Ghi chú</p>
                <p className="text-sm">{vendor.notes}</p>
              </Card>
            )}
            
            {/* Quick Actions */}
            <div className="space-y-2">
              <Button 
                className="w-full" 
                onClick={() => navigate(`/laundry/batches/new?vendor=${id}`)}
              >
                <Package className="mr-2 h-4 w-4" />
                Tạo lô giặt mới
              </Button>
              <div className="grid grid-cols-2 gap-2">
                {vendor.phone && (
                  <Button 
                    variant="outline"
                    onClick={() => window.open(`tel:${vendor.phone}`)}
                  >
                    <Phone className="mr-2 h-4 w-4" />
                    Gọi điện
                  </Button>
                )}
                {vendor.email && (
                  <Button 
                    variant="outline"
                    onClick={() => window.open(`mailto:${vendor.email}`)}
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Gửi email
                  </Button>
                )}
              </div>
            </div>
          </TabsContent>
          
          {/* Contract Tab */}
          <TabsContent value="contract" className="space-y-4">
            <Card className="p-4">
              <h3 className="font-semibold mb-4">Thông tin hợp đồng</h3>
              <dl className="space-y-4">
                <div className="flex justify-between">
                  <dt className="text-sm text-muted-foreground">Giá/kg</dt>
                  <dd className="font-bold text-primary">{formatCurrency(pricePerKg)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-muted-foreground">Đơn tối thiểu</dt>
                  <dd className="font-medium">{minOrder} kg</dd>
                </div>
                {paymentTerms && (
                  <div className="flex justify-between">
                    <dt className="text-sm text-muted-foreground">Điều khoản thanh toán</dt>
                    <dd className="font-medium">{paymentTerms}</dd>
                  </div>
                )}
                {deliveryTime && (
                  <div className="flex justify-between">
                    <dt className="text-sm text-muted-foreground">Thời gian giao</dt>
                    <dd className="font-medium">{deliveryTime}</dd>
                  </div>
                )}
              </dl>
            </Card>
            
            {(contractStart || contractEnd) && (
              <Card className="p-4">
                <h3 className="font-semibold mb-4">Thời hạn hợp đồng</h3>
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    {contractStart && (
                      <p className="text-sm">
                        <span className="text-muted-foreground">Từ: </span>
                        <span className="font-medium">
                          {format(new Date(contractStart), 'dd/MM/yyyy', { locale: vi })}
                        </span>
                      </p>
                    )}
                    {contractEnd && (
                      <p className="text-sm">
                        <span className="text-muted-foreground">Đến: </span>
                        <span className="font-medium">
                          {format(new Date(contractEnd), 'dd/MM/yyyy', { locale: vi })}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            )}
          </TabsContent>
          
          {/* History Tab */}
          <TabsContent value="history">
            <VendorBatchHistory vendorId={id!} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
