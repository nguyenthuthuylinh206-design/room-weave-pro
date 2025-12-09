import { useParams, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, 
  Edit, 
  Phone, 
  Mail, 
  Globe,
  MapPin,
  FileText,
  Star,
  TrendingUp,
  Package,
  DollarSign,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DashboardStatCard } from '@/components/dashboard/DashboardStatCard'
import { VendorBatchHistory } from '@/components/laundry/VendorBatchHistory'
import { VendorPerformanceCharts } from '@/components/laundry/VendorPerformanceCharts'
import { VendorDocuments } from '@/components/laundry/VendorDocuments'
import { useLaundryVendor, useVendorPerformance } from '@/hooks/useLaundryVendors'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { useBreakpoint } from '@/lib/breakpoints'
import { MobileVendorDetailPage } from '@/components/laundry/MobileVendorDetailPage'

export function VendorDetailPage() {
  const { isMobile } = useBreakpoint()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  
  const { data: vendor, isLoading } = useLaundryVendor(id)
  const { data: performance } = useVendorPerformance(id, 30)
  
  if (isMobile) {
    return <MobileVendorDetailPage />
  }
  
  if (isLoading) {
    return <div>Loading...</div>
  }
  
  if (!vendor) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Không tìm thấy đơn vị giặt</p>
        <Button onClick={() => navigate('/laundry/vendors')} className="mt-4">
          Quay lại danh sách
        </Button>
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
    <div className="space-y-6">
      <PageHeader
        title={vendor.name}
        description={vendor.code}
      >
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/laundry/vendors')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quay lại
          </Button>
          <Button onClick={() => navigate(`/laundry/vendors/${id}/edit`)}>
            <Edit className="mr-2 h-4 w-4" />
            Sửa thông tin
          </Button>
        </div>
      </PageHeader>
      
      <Tabs defaultValue="info" className="space-y-6">
        <TabsList>
          <TabsTrigger value="info">Thông tin chung</TabsTrigger>
          <TabsTrigger value="history">Lịch sử đơn hàng</TabsTrigger>
          <TabsTrigger value="performance">Đánh giá chi tiết</TabsTrigger>
          <TabsTrigger value="documents">Tài liệu</TabsTrigger>
        </TabsList>
        
        {/* TAB 1: Thông tin chung */}
        <TabsContent value="info" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left Column - 2/3 */}
            <div className="space-y-6 lg:col-span-2">
              {/* Basic Info */}
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={logo} alt={vendor.name} />
                        <AvatarFallback className="text-2xl">
                          {vendor.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="text-2xl font-bold">{vendor.name}</h3>
                        <p className="text-muted-foreground">{vendor.code}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <Badge variant={vendor.type === 'external' ? 'default' : 'secondary'}>
                            {vendor.type === 'external' ? 'Đơn vị ngoài' : 'Nội bộ'}
                          </Badge>
                          <Badge variant={vendor.status === 'active' ? 'default' : 'secondary'}>
                            {vendor.status === 'active' ? 'Hoạt động' : 'Tạm ngưng'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
              </Card>
              
              {/* Contact Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Thông tin liên hệ</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">Địa chỉ</p>
                        <p className="font-medium">{vendor.address}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">Điện thoại</p>
                        <a href={`tel:${vendor.phone}`} className="font-medium hover:underline">
                          {vendor.phone}
                        </a>
                      </div>
                    </div>
                    
                    {vendor.email && (
                      <div className="flex items-start gap-3">
                        <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground">Email</p>
                          <a href={`mailto:${vendor.email}`} className="font-medium hover:underline">
                            {vendor.email}
                          </a>
                        </div>
                      </div>
                    )}
                    
                    {contractInfo?.website && (
                      <div className="flex items-start gap-3">
                        <Globe className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground">Website</p>
                          <a 
                            href={contractInfo.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="font-medium hover:underline"
                          >
                            {contractInfo.website}
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="border-t pt-4">
                    <p className="text-sm text-muted-foreground mb-1">Người liên hệ</p>
                    <p className="font-medium">{vendor.contact_person}</p>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => window.open(`tel:${vendor.phone}`)}>
                      <Phone className="mr-2 h-4 w-4" />
                      Gọi điện
                    </Button>
                    {vendor.email && (
                      <Button variant="outline" size="sm" onClick={() => window.open(`mailto:${vendor.email}`)}>
                        <Mail className="mr-2 h-4 w-4" />
                        Gửi email
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              {/* Contract Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Thông tin hợp đồng</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-2 gap-4">
                    <div>
                      <dt className="text-sm text-muted-foreground">Giá/kg</dt>
                      <dd className="text-lg font-bold">{formatCurrency(pricePerKg)}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground">Đơn tối thiểu</dt>
                      <dd className="text-lg font-bold">{minOrder} kg</dd>
                    </div>
                    {paymentTerms && (
                      <div>
                        <dt className="text-sm text-muted-foreground">Điều khoản thanh toán</dt>
                        <dd className="font-medium">{paymentTerms}</dd>
                      </div>
                    )}
                    {deliveryTime && (
                      <div>
                        <dt className="text-sm text-muted-foreground">Thời gian giao hàng</dt>
                        <dd className="font-medium">{deliveryTime}</dd>
                      </div>
                    )}
                    {contractStart && (
                      <div>
                        <dt className="text-sm text-muted-foreground">Hợp đồng từ</dt>
                        <dd className="font-medium">
                          {format(new Date(contractStart), 'dd/MM/yyyy', { locale: vi })}
                        </dd>
                      </div>
                    )}
                    {contractEnd && (
                      <div>
                        <dt className="text-sm text-muted-foreground">Hợp đồng đến</dt>
                        <dd className="font-medium">
                          {format(new Date(contractEnd), 'dd/MM/yyyy', { locale: vi })}
                        </dd>
                      </div>
                    )}
                  </dl>
                  
                  {vendor.notes && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm text-muted-foreground mb-1">Ghi chú</p>
                      <p className="text-sm">{vendor.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            
            {/* Right Column - 1/3 */}
            <div className="space-y-6">
              {/* Performance Stats */}
              {performance && (
                <>
                  <DashboardStatCard
                    title="Tổng đơn hàng"
                    value={performance.total_orders?.toString() || '0'}
                    icon={Package}
                    description="30 ngày gần nhất"
                  />
                  
                  <DashboardStatCard
                    title="Tổng chi phí"
                    value={formatCurrency(performance.total_cost || 0)}
                    icon={DollarSign}
                    description="30 ngày gần nhất"
                  />
                  
                  <DashboardStatCard
                    title="Đánh giá TB"
                    value={`${(performance.avg_quality || 0).toFixed(1)}/5.0`}
                    icon={Star}
                    description="Chất lượng giặt"
                  />
                  
                  <DashboardStatCard
                    title="On-time rate"
                    value={`${(performance.on_time_rate || 0).toFixed(0)}%`}
                    icon={TrendingUp}
                    description="Giao đúng hạn"
                  />
                </>
              )}
              
              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Thao tác nhanh</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button 
                    className="w-full" 
                    onClick={() => navigate(`/laundry/batches/new?vendor=${id}`)}
                  >
                    <Package className="mr-2 h-4 w-4" />
                    Tạo lô giặt mới
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => navigate(`/laundry/vendors/${id}/edit`)}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Sửa thông tin
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Xem hợp đồng
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        {/* TAB 2: Lịch sử đơn hàng */}
        <TabsContent value="history">
          <VendorBatchHistory vendorId={id!} />
        </TabsContent>
        
        {/* TAB 3: Đánh giá chi tiết */}
        <TabsContent value="performance">
          <VendorPerformanceCharts vendorId={id!} />
        </TabsContent>
        
        {/* TAB 4: Tài liệu */}
        <TabsContent value="documents">
          <VendorDocuments vendorId={id!} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
