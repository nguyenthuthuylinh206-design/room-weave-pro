import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { format, isToday, isTomorrow, isPast, differenceInDays } from 'date-fns'
import { vi } from 'date-fns/locale'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Calendar,
  Search,
  Filter,
  Plus,
  User,
  Phone,
  Clock,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  LogIn,
  LogOut,
  XCircle,
  CalendarDays,
  Loader2,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { supabase } from '@/integrations/supabase/client'
import { useHotelContext } from '@/contexts/HotelContext'
import { useTenant } from '@/hooks/useTenant'
import { useToast } from '@/hooks/use-toast'
import { RoomBookingDialog } from '@/components/rooms/RoomBookingDialog'
import { AddBookingDialog } from '@/components/bookings/AddBookingDialog'
import { CheckoutSummaryDialog } from '@/components/bookings/CheckoutSummaryDialog'
import { CheckInConfirmDialog } from '@/components/bookings/CheckInConfirmDialog'
import { RoomStatusBadge } from '@/components/rooms/RoomStatusBadge'
import { formatCurrency } from '@/lib/utils'
import { BOOKING_SOURCES, OTA_SOURCES } from '@/lib/constants'
import type { RoomStatus } from '@/types/rooms.types'
import {
  calculateBookingCost,
  calculateEarlyCheckinCharge,
  calculateLateCheckoutCharge,
  DEFAULT_PRICING_RULES,
  type BookingCostBreakdown,
} from '@/lib/bookingCalculations'
import { calculateServiceChargesFromConsumables } from '@/hooks/usePricingRules'

type BookingStatus = 'all' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'no_show'

interface BookingWithRoom {
  id: string
  guest_name: string
  guest_phone: string | null
  guest_email: string | null
  guest_count: number
  check_in_date: string
  check_out_date: string
  actual_check_in: string | null
  actual_check_out: string | null
  status: string
  notes: string | null
  room_id: string
  hotel_id: string
  tenant_id: string
  total_amount?: number
  deposit_amount?: number
  amount_paid?: number
  payment_status?: string
  booking_source?: string
  ota_payment_type?: string | null
  ota_paid_amount?: number
  room: {
    room_number: string
    room_type: string
    floor: number
    status: RoomStatus
  }
}

export function BookingsPage() {
  const { t } = useTranslation(['rooms', 'common'])
  const navigate = useNavigate()
  const { selectedHotel, isAllHotelsMode } = useHotelContext()
  const { tenant } = useTenant()
  const selectedHotelId = selectedHotel?.id
  const tenantId = tenant?.id
  
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<BookingStatus>('all')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<BookingWithRoom | null>(null)
  
  const queryClient = useQueryClient()
  const { handleCheckIn, handleCheckOut, isLoading: isActionLoading } = useBookingActions()
  const [actioningBookingId, setActioningBookingId] = useState<string | null>(null)

  // Realtime subscription for bookings and rooms
  useEffect(() => {
    const channel = supabase
      .channel('bookings-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_bookings' }, () => {
        queryClient.invalidateQueries({ queryKey: ['all-bookings'] })
        queryClient.invalidateQueries({ queryKey: ['available-rooms'] })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, () => {
        queryClient.invalidateQueries({ queryKey: ['all-bookings'] })
        queryClient.invalidateQueries({ queryKey: ['available-rooms'] })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['all-bookings', selectedHotelId, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('room_bookings')
        .select(`
          *,
          room:rooms(room_number, room_type, floor, status)
        `)
        .order('check_in_date', { ascending: false })
        .limit(100)
      
      if (selectedHotelId && selectedHotelId !== 'all') {
        query = query.eq('hotel_id', selectedHotelId)
      }
      
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }
      
      const { data, error } = await query
      
      if (error) {
        console.error('Error fetching bookings:', error)
        return []
      }
      
      return data as BookingWithRoom[]
    },
    enabled: !!tenantId,
  })
  
  const filteredBookings = bookings?.filter(booking => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      booking.guest_name.toLowerCase().includes(query) ||
      booking.guest_phone?.toLowerCase().includes(query) ||
      booking.room?.room_number?.toLowerCase().includes(query)
    )
  }) || []
  
  // Stats
  const stats = {
    total: bookings?.length || 0,
    checkedIn: bookings?.filter(b => b.status === 'checked_in').length || 0,
    checkingOutToday: bookings?.filter(b => 
      b.status === 'checked_in' && isToday(new Date(b.check_out_date))
    ).length || 0,
    checkingInToday: bookings?.filter(b =>
      b.status === 'confirmed' && isToday(new Date(b.check_in_date))
    ).length || 0,
  }
  
  const getStatusBadge = (status: string, checkOutDate: string) => {
    const isCheckingOutToday = isToday(new Date(checkOutDate))
    
    switch (status) {
      case 'checked_in':
        return (
          <Badge className={isCheckingOutToday ? 'bg-orange-500' : 'bg-green-500'}>
            {isCheckingOutToday ? 'Checkout hôm nay' : 'Đang ở'}
          </Badge>
        )
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
  
  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý đặt phòng"
        description="Xem và quản lý thông tin đặt phòng của khách"
        action={{
          label: 'Thêm đặt phòng',
          icon: Plus,
          onClick: () => setShowAddDialog(true),
        }}
      />
      
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <CalendarDays className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Tổng đặt phòng</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.checkedIn}</p>
                <p className="text-xs text-muted-foreground">Đang ở</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <LogIn className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.checkingInToday}</p>
                <p className="text-xs text-muted-foreground">Check-in hôm nay</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <LogOut className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.checkingOutToday}</p>
                <p className="text-xs text-muted-foreground">Check-out hôm nay</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo tên khách, SĐT, số phòng..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as BookingStatus)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="confirmed">Đã đặt</SelectItem>
            <SelectItem value="checked_in">Đang ở</SelectItem>
            <SelectItem value="checked_out">Đã trả phòng</SelectItem>
            <SelectItem value="cancelled">Đã hủy</SelectItem>
            <SelectItem value="no_show">Không đến</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Bookings Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="p-12 text-center">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">Chưa có đặt phòng</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Thêm đặt phòng mới để bắt đầu quản lý
              </p>
              <Button className="mt-4" onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Thêm đặt phòng
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Khách</TableHead>
                  <TableHead>Phòng</TableHead>
                  <TableHead>Check-in</TableHead>
                  <TableHead>Check-out</TableHead>
                  <TableHead>Tổng tiền</TableHead>
                  <TableHead>Thanh toán</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBookings.map((booking) => {
                  const nights = differenceInDays(
                    new Date(booking.check_out_date),
                    new Date(booking.check_in_date)
                  )
                  
                  return (
                    <TableRow 
                      key={booking.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        setSelectedBooking(booking)
                        setShowEditDialog(true)
                      }}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{booking.guest_name}</p>
                            {booking.guest_phone && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {booking.guest_phone}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{booking.room?.room_number}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {booking.room?.room_type} • Tầng {booking.room?.floor}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className={isToday(new Date(booking.check_in_date)) ? 'text-blue-600 font-medium' : ''}>
                          {format(new Date(booking.check_in_date), 'dd/MM/yyyy', { locale: vi })}
                        </p>
                        {booking.actual_check_in && (
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(booking.actual_check_in), 'HH:mm')}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <p className={isToday(new Date(booking.check_out_date)) ? 'text-orange-600 font-medium' : ''}>
                          {format(new Date(booking.check_out_date), 'dd/MM/yyyy', { locale: vi })}
                        </p>
                        {booking.actual_check_out && (
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(booking.actual_check_out), 'HH:mm')}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <p className="font-mono text-sm font-medium">
                          {formatCurrency(booking.total_amount || 0)}
                        </p>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const remaining = (booking.total_amount || 0) - (booking.amount_paid || 0)
                          const paymentStatus = booking.payment_status || 'pending'
                          const isOta = booking.booking_source && OTA_SOURCES.includes(booking.booking_source)
                          const otaLabel = BOOKING_SOURCES.find(s => s.value === booking.booking_source)?.label || ''
                          
                          // OTA Prepaid - show special badge
                          if (isOta && booking.ota_payment_type === 'prepaid') {
                            return (
                              <div>
                                <span className="text-xs font-medium text-green-600">Đã TT</span>
                                <p className="text-xs text-blue-600">{otaLabel}</p>
                              </div>
                            )
                          }
                          
                          if (paymentStatus === 'paid' || remaining <= 0) {
                            return (
                              <div>
                                <span className="text-xs font-medium text-green-600">Đã TT</span>
                                {isOta && <p className="text-xs text-blue-600">{otaLabel}</p>}
                              </div>
                            )
                          } else if ((booking.amount_paid || 0) > 0) {
                            return (
                              <div>
                                <span className="text-xs font-medium text-amber-600">1 phần</span>
                                <p className="text-xs text-muted-foreground font-mono">
                                  Còn: {new Intl.NumberFormat('vi-VN', { notation: 'compact' }).format(remaining)}
                                </p>
                                {isOta && <p className="text-xs text-blue-600">{otaLabel}</p>}
                              </div>
                            )
                          } else {
                            return (
                              <div>
                                <span className="text-xs text-muted-foreground">Chờ TT</span>
                                {isOta && <p className="text-xs text-blue-600">{otaLabel}</p>}
                              </div>
                            )
                          }
                        })()}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(booking.status, booking.check_out_date)}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          {booking.status === 'confirmed' && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
                              disabled={isActionLoading && actioningBookingId === booking.id}
                              onClick={async () => {
                                setActioningBookingId(booking.id)
                                await handleCheckIn(booking.id, booking.room_id)
                                setActioningBookingId(null)
                              }}
                            >
                              {isActionLoading && actioningBookingId === booking.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <>
                                  <LogIn className="h-3 w-3 mr-1" />
                                  Check-in
                                </>
                              )}
                            </Button>
                          )}
                          {booking.status === 'checked_in' && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs text-orange-600 border-orange-200 hover:bg-orange-50"
                              disabled={isActionLoading && actioningBookingId === booking.id}
                              onClick={async () => {
                                setActioningBookingId(booking.id)
                                await handleCheckOut(booking.id, booking.room_id)
                                setActioningBookingId(null)
                              }}
                            >
                              {isActionLoading && actioningBookingId === booking.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <>
                                  <LogOut className="h-3 w-3 mr-1" />
                                  Check-out
                                </>
                              )}
                            </Button>
                          )}
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      {/* Add New Booking Dialog */}
      <AddBookingDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
      />
      
      {/* Edit Booking Dialog */}
      {showEditDialog && selectedBooking && (
        <RoomBookingDialog
          open={showEditDialog}
          onOpenChange={(open) => {
            setShowEditDialog(open)
            if (!open) setSelectedBooking(null)
          }}
          roomId={selectedBooking.room_id}
          roomNumber={selectedBooking.room?.room_number || ''}
          hotelId={selectedBooking.hotel_id}
          tenantId={selectedBooking.tenant_id}
          booking={selectedBooking}
        />
      )}
    </div>
  )
}
