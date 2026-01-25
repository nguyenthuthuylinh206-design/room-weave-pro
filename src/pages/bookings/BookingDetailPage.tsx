import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { format, differenceInDays } from 'date-fns'
import { vi } from 'date-fns/locale'
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  Calendar,
  Clock,
  MapPin,
  CreditCard,
  LogIn,
  LogOut,
  Loader2,
  CheckCircle,
  Package,
  AlertTriangle,
  FileText,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '@/integrations/supabase/client'
import { BookingConsumablesCard } from '@/components/bookings/BookingConsumablesCard'
import { BookingIssuesCard } from '@/components/bookings/BookingIssuesCard'
import { ChargeableConsumablesCard } from '@/components/bookings/ChargeableConsumablesCard'
import { RoomBookingDialog } from '@/components/rooms/RoomBookingDialog'
import { cn, formatCurrency } from '@/lib/utils'

export function BookingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [showEditDialog, setShowEditDialog] = useState(false)

  const { data: booking, isLoading } = useQuery({
    queryKey: ['booking-detail', id],
    queryFn: async () => {
      if (!id) return null

      const { data, error } = await supabase
        .from('room_bookings')
        .select(`
          *,
          room:rooms(room_number, room_type, floor, hotel_id)
        `)
        .eq('id', id)
        .single()

      if (error) {
        console.error('Error fetching booking:', error)
        return null
      }

      return data
    },
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Không tìm thấy booking</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate('/bookings')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Quay lại
        </Button>
      </div>
    )
  }

  const nights = differenceInDays(
    new Date(booking.check_out_date),
    new Date(booking.check_in_date)
  )

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'checked_in':
        return <Badge className="bg-green-500">Đang ở</Badge>
      case 'confirmed':
        return <Badge variant="secondary">Đã đặt</Badge>
      case 'checked_out':
        return <Badge variant="outline">Đã trả phòng</Badge>
      case 'cancelled':
        return <Badge variant="destructive">Đã hủy</Badge>
      case 'no_show':
        return <Badge variant="destructive">Không đến</Badge>
      default:
        return null
    }
  }

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-500">Đã thanh toán</Badge>
      case 'pending':
        return <Badge variant="secondary">Chờ thanh toán</Badge>
      case 'partial':
        return <Badge className="bg-amber-500">Thanh toán 1 phần</Badge>
      case 'refunded':
        return <Badge variant="outline">Đã hoàn tiền</Badge>
      default:
        return <Badge variant="secondary">N/A</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/bookings')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              {booking.guest_name}
              {getStatusBadge(booking.status)}
            </h1>
            <p className="text-sm text-muted-foreground">
              Phòng {booking.room?.room_number} • {nights} đêm
            </p>
          </div>
        </div>
        <Button onClick={() => setShowEditDialog(true)}>
          Chỉnh sửa
        </Button>
      </div>

      <Tabs defaultValue="info" className="space-y-4">
        <TabsList>
          <TabsTrigger value="info" className="gap-2">
            <FileText className="h-4 w-4" />
            Thông tin
          </TabsTrigger>
          <TabsTrigger value="consumables" className="gap-2">
            <Package className="h-4 w-4" />
            Đồ dùng
          </TabsTrigger>
          <TabsTrigger value="issues" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Vấn đề
          </TabsTrigger>
          <TabsTrigger value="payment" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Thanh toán
          </TabsTrigger>
        </TabsList>

        {/* Info Tab */}
        <TabsContent value="info" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Guest Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  Thông tin khách
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{booking.guest_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {booking.guest_count} khách
                    </p>
                  </div>
                </div>
                {booking.guest_phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{booking.guest_phone}</span>
                  </div>
                )}
                {booking.guest_email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{booking.guest_email}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Room & Dates */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  Phòng & Thời gian
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Phòng {booking.room?.room_number}</span>
                  <Badge variant="outline" className="capitalize">
                    {booking.room?.room_type}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                    <div className="flex items-center gap-1 mb-1">
                      <LogIn className="h-3 w-3 text-blue-600" />
                      <span className="text-xs text-muted-foreground">Check-in</span>
                    </div>
                    <p className="font-medium text-blue-600">
                      {format(new Date(booking.check_in_date), 'dd/MM/yyyy', { locale: vi })}
                    </p>
                    {booking.actual_check_in && (
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(booking.actual_check_in), 'HH:mm')}
                      </p>
                    )}
                  </div>
                  <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950/30">
                    <div className="flex items-center gap-1 mb-1">
                      <LogOut className="h-3 w-3 text-orange-600" />
                      <span className="text-xs text-muted-foreground">Check-out</span>
                    </div>
                    <p className="font-medium text-orange-600">
                      {format(new Date(booking.check_out_date), 'dd/MM/yyyy', { locale: vi })}
                    </p>
                    {booking.actual_check_out && (
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(booking.actual_check_out), 'HH:mm')}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{nights} đêm</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Notes */}
          {booking.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ghi chú</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {booking.notes}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Consumables Tab */}
        <TabsContent value="consumables" className="space-y-4">
          <ChargeableConsumablesCard 
            bookingId={booking.id} 
            showBillAction={booking.status !== 'checked_out'}
          />
          <BookingConsumablesCard bookingId={booking.id} />
        </TabsContent>

        {/* Issues Tab */}
        <TabsContent value="issues">
          <BookingIssuesCard
            roomId={booking.room_id}
            checkInDate={booking.check_in_date}
            checkOutDate={booking.actual_check_out || booking.check_out_date}
          />
        </TabsContent>

        {/* Payment Tab */}
        <TabsContent value="payment">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" />
                  Chi tiết thanh toán
                </CardTitle>
                {getPaymentBadge(booking.payment_status || 'pending')}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* I. TIỀN PHÒNG */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">I. TIỀN PHÒNG</h4>
                <div className="divide-y divide-border rounded-lg border">
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-sm">Giá phòng/đêm</span>
                    <span className="font-mono text-sm">{formatCurrency(booking.room_price || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-sm">Số đêm</span>
                    <span className="font-mono text-sm">× {nights}</span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2 bg-muted/50">
                    <span className="text-sm font-medium">Tiền phòng</span>
                    <span className="font-mono text-sm font-medium">{formatCurrency((booking.room_price || 0) * nights)}</span>
                  </div>
                </div>
              </div>

              {/* II. PHỤ THU */}
              {((booking.early_checkin_charge || 0) > 0 || (booking.late_checkout_charge || 0) > 0 || (booking.extra_charges || 0) > 0) && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">II. PHỤ THU</h4>
                  <div className="divide-y divide-border rounded-lg border">
                    {(booking.early_checkin_charge || 0) > 0 && (
                      <div className="flex items-center justify-between px-3 py-2">
                        <span className="text-sm">Check-in sớm</span>
                        <span className="font-mono text-sm text-amber-600">+{formatCurrency(booking.early_checkin_charge || 0)}</span>
                      </div>
                    )}
                    {(booking.late_checkout_charge || 0) > 0 && (
                      <div className="flex items-center justify-between px-3 py-2">
                        <span className="text-sm">Check-out trễ</span>
                        <span className="font-mono text-sm text-amber-600">+{formatCurrency(booking.late_checkout_charge || 0)}</span>
                      </div>
                    )}
                    {(booking.extra_charges || 0) > 0 && (
                      <div className="flex items-center justify-between px-3 py-2">
                        <span className="text-sm">Chi phí khác</span>
                        <span className="font-mono text-sm text-amber-600">+{formatCurrency(booking.extra_charges || 0)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* III. DỊCH VỤ SỬ DỤNG */}
              {(booking.service_charges || 0) > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">III. DỊCH VỤ SỬ DỤNG</h4>
                  <div className="divide-y divide-border rounded-lg border">
                    <div className="flex items-center justify-between px-3 py-2">
                      <span className="text-sm">Tổng dịch vụ (minibar, room service...)</span>
                      <span className="font-mono text-sm">{formatCurrency(booking.service_charges || 0)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* SUBTOTAL + TAX */}
              <div className="space-y-2">
                <div className="divide-y divide-border rounded-lg border">
                  <div className="flex items-center justify-between px-3 py-2 bg-muted/50">
                    <span className="text-sm font-medium">Subtotal</span>
                    <span className="font-mono text-sm font-medium">{formatCurrency(booking.subtotal || 0)}</span>
                  </div>
                  {(booking.vat_rate ?? 0) > 0 && (
                    <div className="flex items-center justify-between px-3 py-2">
                      <span className="text-sm">VAT ({booking.vat_rate}%)</span>
                      <span className="font-mono text-sm">{formatCurrency(booking.vat_amount || 0)}</span>
                    </div>
                  )}
                  {(booking.service_fee_rate ?? 0) > 0 && (
                    <div className="flex items-center justify-between px-3 py-2">
                      <span className="text-sm">Phí dịch vụ ({booking.service_fee_rate}%)</span>
                      <span className="font-mono text-sm">{formatCurrency(booking.service_fee_amount || 0)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* TỔNG CỘNG */}
              <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">TỔNG CỘNG</span>
                  <span className="text-2xl font-bold text-primary">{formatCurrency(booking.total_amount || 0)}</span>
                </div>
              </div>

              {/* THANH TOÁN */}
              <div className="space-y-2">
                <div className="divide-y divide-border rounded-lg border">
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-sm">Đã đặt cọc</span>
                    <span className="font-mono text-sm text-green-600">-{formatCurrency(booking.deposit_amount || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-sm">Đã thanh toán</span>
                    <span className="font-mono text-sm text-green-600">-{formatCurrency(booking.amount_paid || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2 bg-muted/50">
                    <span className="text-sm font-medium">Còn phải thu</span>
                    <span className={cn(
                      "font-mono text-sm font-bold",
                      ((booking.total_amount || 0) - (booking.deposit_amount || 0) - (booking.amount_paid || 0)) > 0
                        ? "text-red-600"
                        : "text-green-600"
                    )}>
                      {formatCurrency(Math.max(0, (booking.total_amount || 0) - (booking.deposit_amount || 0) - (booking.amount_paid || 0)))}
                    </span>
                  </div>
                </div>
              </div>

              {booking.paid_at && (
                <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-950/30 p-3 rounded-lg">
                  <CheckCircle className="h-4 w-4" />
                  <span>
                    Đã thanh toán đầy đủ lúc {format(new Date(booking.paid_at), 'HH:mm dd/MM/yyyy', { locale: vi })}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      {showEditDialog && (
        <RoomBookingDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          roomId={booking.room_id}
          roomNumber={booking.room?.room_number || ''}
          hotelId={booking.room?.hotel_id || ''}
          tenantId={booking.tenant_id}
          booking={booking}
        />
      )}
    </div>
  )
}
