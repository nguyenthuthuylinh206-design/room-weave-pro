import { useState, useEffect, useMemo } from 'react'
import { useBreakpoint } from '@/lib/breakpoints'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { format, isToday, isTomorrow, isPast, differenceInDays, startOfDay, isBefore, isAfter } from 'date-fns'
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
  Users,
  Wallet,
  DoorOpen,
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { supabase } from '@/integrations/supabase/client'
import { useHotelContext } from '@/contexts/HotelContext'
import { useTenant } from '@/hooks/useTenant'
import { useToast } from '@/hooks/use-toast'
import { RoomBookingDialog } from '@/components/rooms/RoomBookingDialog'
import { AddBookingDialog } from '@/components/bookings/AddBookingDialog'
import { CheckoutSummaryDialog } from '@/components/bookings/CheckoutSummaryDialog'
import { MinimizedCheckoutWidget, type MinimizedCheckout } from '@/components/bookings/MinimizedCheckoutWidget'
import { CheckInConfirmDialog } from '@/components/bookings/CheckInConfirmDialog'
import { ExtendBookingDialog } from '@/components/bookings/ExtendBookingDialog'
import { GroupPaymentDialog } from '@/components/bookings/GroupPaymentDialog'
import { GroupCheckoutDialog } from '@/components/bookings/GroupCheckoutDialog'
import { RoomStatusBadge } from '@/components/rooms/RoomStatusBadge'
import { formatCurrency } from '@/lib/utils'
import { useGroupBookingCounts } from '@/hooks/useGroupBooking'
import { useBookingConflicts } from '@/hooks/useBookingConflicts'
import { BOOKING_SOURCES, OTA_SOURCES } from '@/lib/constants'
import type { RoomStatus } from '@/types/rooms.types'
import {
  calculateBookingCost,
  calculateEarlyCheckinCharge,
  calculateLateCheckoutCharge,
  DEFAULT_PRICING_RULES,
  type BookingCostBreakdown,
  type DamageChargeItem,
} from '@/lib/bookingCalculations'
import { calculateServiceChargesFromConsumables } from '@/hooks/usePricingRules'
import { fetchServiceChargeSummary, type ServiceChargeDetail } from '@/hooks/useBookingServiceCharges'
import { MobileBookingsPage } from './MobileBookingsPage'
import { triggerRoomCheckoutNotification } from '@/hooks/useNotificationTriggers'
import { createInvoiceAfterCheckout } from '@/lib/invoiceHelpers'

type BookingStatus = 'all' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'no_show' | 'conflict' | 'overdue'

export interface BookingWithRoom {
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
  booking_group_id?: string | null
  // Booking type fields
  booking_type?: 'daily' | 'hourly' | 'monthly'
  hourly_rate?: number | null
  hourly_start_time?: string | null
  hourly_end_time?: string | null
  booking_hours?: number | null
  monthly_rate?: number | null
  booking_months?: number | null
  room: {
    room_number: string
    room_type: string
    floor: number
    status: RoomStatus
  }
}

export function BookingsPage() {
  const { t } = useTranslation(['rooms', 'common'])
  const { isMobile } = useBreakpoint()
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
  
  // States for check-in/check-out dialogs
  const [showCheckinConfirm, setShowCheckinConfirm] = useState(false)
  const [showCheckoutSummary, setShowCheckoutSummary] = useState(false)
  const [showExtendDialog, setShowExtendDialog] = useState(false)
  const [showGroupPaymentDialog, setShowGroupPaymentDialog] = useState(false)
  const [showGroupCheckoutDialog, setShowGroupCheckoutDialog] = useState(false)
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [actionBooking, setActionBooking] = useState<BookingWithRoom | null>(null)
  const [suggestedEarlyCharge, setSuggestedEarlyCharge] = useState(0)
  const [checkoutCostBreakdown, setCheckoutCostBreakdown] = useState<BookingCostBreakdown | null>(null)
  const [checkoutDamageItems, setCheckoutDamageItems] = useState<DamageChargeItem[]>([])
  const [checkoutServiceDetails, setCheckoutServiceDetails] = useState<ServiceChargeDetail[]>([])
  const [overdueCheckoutDate, setOverdueCheckoutDate] = useState<string | null>(null)
  const [isActionLoading, setIsActionLoading] = useState(false)
  
  // Minimized checkouts state - allows processing other guests while waiting for inspection
  // Persist to sessionStorage so widgets survive page navigation
  const [minimizedCheckouts, setMinimizedCheckouts] = useState<MinimizedCheckout[]>(() => {
    try {
      const saved = sessionStorage.getItem('minimizedCheckouts')
      if (saved) {
        const parsed = JSON.parse(saved)
        // Convert date strings back to Date objects
        return parsed.map((c: any) => ({
          ...c,
          actualCheckoutDate: new Date(c.actualCheckoutDate),
          scheduledCheckoutDate: new Date(c.scheduledCheckoutDate),
        }))
      }
    } catch (e) {
      console.error('[BookingsPage] Error loading minimized checkouts:', e)
    }
    return []
  })
  
  // Persist minimized checkouts to sessionStorage
  useEffect(() => {
    try {
      if (minimizedCheckouts.length > 0) {
        sessionStorage.setItem('minimizedCheckouts', JSON.stringify(minimizedCheckouts))
      } else {
        sessionStorage.removeItem('minimizedCheckouts')
      }
    } catch (e) {
      console.error('[BookingsPage] Error saving minimized checkouts:', e)
    }
  }, [minimizedCheckouts])
  
  // Track if checkout was restored from widget (to skip duplicate toast)
  const [restoredFromWidget, setRestoredFromWidget] = useState(false)
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  
  // Handle URL filter parameter from dashboard alerts
  useEffect(() => {
    const filterParam = searchParams.get('filter')
    if (filterParam) {
      if (filterParam === 'conflict') {
        setStatusFilter('conflict')
      } else if (filterParam === 'overdue') {
        setStatusFilter('overdue')
      } else if (filterParam === 'unpaid') {
        // For unpaid, we don't have a specific status, show all checked_out
        setStatusFilter('checked_out')
      }
      // Clear the URL parameter
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  // Realtime subscription for bookings and rooms (filter tenant + visibility pause)
  useEffect(() => {
    if (!tenant?.id) return
    const tId = tenant.id
    let channel: ReturnType<typeof supabase.channel> | null = null

    const subscribe = () => {
      if (channel) return
      channel = supabase
        .channel(`bookings-realtime-${tId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'room_bookings', filter: `tenant_id=eq.${tId}` }, () => {
          queryClient.invalidateQueries({ queryKey: ['all-bookings'] })
          queryClient.invalidateQueries({ queryKey: ['available-rooms'] })
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `tenant_id=eq.${tId}` }, () => {
          queryClient.invalidateQueries({ queryKey: ['all-bookings'] })
          queryClient.invalidateQueries({ queryKey: ['available-rooms'] })
        })
        .subscribe()
    }
    const unsubscribe = () => { if (channel) { supabase.removeChannel(channel); channel = null } }
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        subscribe()
        queryClient.invalidateQueries({ queryKey: ['all-bookings'] })
        queryClient.invalidateQueries({ queryKey: ['available-rooms'] })
      } else { unsubscribe() }
    }
    if (document.visibilityState === 'visible') subscribe()
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      unsubscribe()
    }
  }, [tenant?.id, queryClient])

  // Get booking conflicts for filtering
  const { data: bookingConflicts } = useBookingConflicts()
  const conflictBookingIds = useMemo(() => 
    new Set(bookingConflicts?.map(c => c.currentBooking.id) || []),
    [bookingConflicts]
  )
  
  const { data: bookings, isLoading } = useQuery({
    queryKey: ['all-bookings', isAllHotelsMode ? 'all' : selectedHotelId, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('room_bookings')
        .select(`
          *,
          room:rooms(room_number, room_type, floor, status),
          booking_type,
          hourly_rate,
          hourly_start_time,
          hourly_end_time,
          booking_hours,
          monthly_rate,
          booking_months,
          booking_group_id
        `)
        .order('check_in_date', { ascending: false })
        .limit(100)
      
      if (!isAllHotelsMode && selectedHotelId) {
        query = query.eq('hotel_id', selectedHotelId)
      }
      
      // Handle special filters
      if (statusFilter !== 'all' && statusFilter !== 'conflict' && statusFilter !== 'overdue') {
        query = query.eq('status', statusFilter)
      }
      
      // For conflict and overdue, we fetch checked_in only
      if (statusFilter === 'conflict' || statusFilter === 'overdue') {
        query = query.eq('status', 'checked_in')
      }
      
      const { data, error } = await query
      
      if (error) {
        console.error('Error fetching bookings:', error)
        return []
      }
      
      return data as BookingWithRoom[]
    },
    enabled: !!tenantId,
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  })
  
  // Get group booking counts for badge display
  const groupIds = useMemo(() => 
    bookings?.map(b => b.booking_group_id).filter((id): id is string => !!id) || [],
    [bookings]
  )
  const { data: groupCounts } = useGroupBookingCounts(groupIds)
  
  const filteredBookings = (bookings?.filter(booking => {
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesSearch = 
        booking.guest_name.toLowerCase().includes(query) ||
        booking.guest_phone?.toLowerCase().includes(query) ||
        booking.room?.room_number?.toLowerCase().includes(query)
      if (!matchesSearch) return false
    }
    
    // Apply conflict filter - only show bookings that have conflicts
    if (statusFilter === 'conflict') {
      return conflictBookingIds.has(booking.id)
    }
    
    // Apply overdue filter - checked_in but past checkout date
    if (statusFilter === 'overdue') {
      const today = startOfDay(new Date())
      const checkOutDate = startOfDay(new Date(booking.check_out_date))
      return booking.status === 'checked_in' && isBefore(checkOutDate, today)
    }
    
    return true
  }) || []).sort((a, b) => {
    const now = new Date()
    const todayStart = startOfDay(now)
    
    // Priority 1: checked_out luôn xuống cuối
    if (a.status === 'checked_out' && b.status !== 'checked_out') return 1
    if (b.status === 'checked_out' && a.status !== 'checked_out') return -1
    if (a.status === 'checked_out' && b.status === 'checked_out') {
      // Trong checked_out, mới nhất lên trước
      return new Date(b.actual_check_out || b.check_out_date).getTime() - 
             new Date(a.actual_check_out || a.check_out_date).getTime()
    }
    
    // Priority 2: cancelled và no_show xuống gần cuối (trên checked_out)
    const isCancelledA = a.status === 'cancelled' || a.status === 'no_show'
    const isCancelledB = b.status === 'cancelled' || b.status === 'no_show'
    if (isCancelledA && !isCancelledB) return 1
    if (isCancelledB && !isCancelledA) return -1
    
    // Priority 3: Đang ở + checkout hôm nay lên đầu
    const isCheckingOutTodayA = a.status === 'checked_in' && isToday(new Date(a.check_out_date))
    const isCheckingOutTodayB = b.status === 'checked_in' && isToday(new Date(b.check_out_date))
    if (isCheckingOutTodayA && !isCheckingOutTodayB) return -1
    if (isCheckingOutTodayB && !isCheckingOutTodayA) return 1
    
    // Priority 4: Checkin hôm nay lên đầu
    const isCheckingInTodayA = a.status === 'confirmed' && isToday(new Date(a.check_in_date))
    const isCheckingInTodayB = b.status === 'confirmed' && isToday(new Date(b.check_in_date))
    if (isCheckingInTodayA && !isCheckingInTodayB) return -1
    if (isCheckingInTodayB && !isCheckingInTodayA) return 1
    
    // Priority 5: Đang ở (checked_in) lên trước confirmed
    if (a.status === 'checked_in' && b.status === 'confirmed') return -1
    if (b.status === 'checked_in' && a.status === 'confirmed') return 1
    
    // Priority 6: Trong cùng status, sắp theo thời gian gần nhất
    // Đang ở: checkout sớm nhất lên trước
    if (a.status === 'checked_in' && b.status === 'checked_in') {
      return new Date(a.check_out_date).getTime() - new Date(b.check_out_date).getTime()
    }
    // Đã đặt: checkin sớm nhất lên trước  
    if (a.status === 'confirmed' && b.status === 'confirmed') {
      return new Date(a.check_in_date).getTime() - new Date(b.check_in_date).getTime()
    }
    
    return 0
  })
  
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

  // Handle Check-in click - validate date and room status first, then show dialog if early check-in
  const handleCheckInClick = async (booking: BookingWithRoom) => {
    const now = new Date()
    const today = startOfDay(now)
    const checkInDate = startOfDay(new Date(booking.check_in_date))

    // Block check-in if today is before check_in_date (not same day)
    if (isBefore(today, checkInDate)) {
      toast({
        variant: 'destructive',
        title: 'Chưa đến ngày nhận phòng',
        description: `Lịch nhận phòng: ${format(checkInDate, 'dd/MM/yyyy', { locale: vi })}. Vui lòng thay đổi lịch đặt nếu muốn nhận sớm.`,
      })
      return
    }

    // Validate room status before check-in
    const { data: roomData, error: roomError } = await supabase
      .from('rooms')
      .select('status')
      .eq('id', booking.room_id)
      .single()

    if (roomError) {
      toast({
        variant: 'destructive',
        title: 'Lỗi kiểm tra phòng',
        description: roomError.message,
      })
      return
    }

    // Block if room is occupied
    if (roomData.status === 'occupied') {
      const { data: currentBooking } = await supabase
        .from('room_bookings')
        .select('id, guest_name, check_out_date')
        .eq('room_id', booking.room_id)
        .eq('status', 'checked_in')
        .neq('id', booking.id)
        .limit(1)
        .single()

      if (currentBooking) {
        toast({
          variant: 'destructive',
          title: 'Phòng đang có khách',
          description: `Khách "${currentBooking.guest_name}" chưa checkout (dự kiến: ${format(new Date(currentBooking.check_out_date), 'dd/MM/yyyy')}). Vui lòng checkout khách hiện tại trước.`,
        })
        return
      }
    }

    // Block if room is under maintenance
    if (roomData.status === 'maintenance' || roomData.status === 'out_of_order') {
      toast({
        variant: 'destructive',
        title: 'Phòng không khả dụng',
        description: `Phòng đang trong trạng thái "${roomData.status === 'maintenance' ? 'bảo trì' : 'ngừng hoạt động'}". Không thể check-in.`,
      })
      return
    }

    const actualTime = format(now, 'HH:mm')
    const hours = parseInt(actualTime.split(':')[0])
    const roomPrice = (booking as any).room_price || 0

    setActionBooking(booking)

    // Calculate surcharge for daily bookings with early check-in
    let suggestedCharge = 0
    if (booking.booking_type === 'daily' && hours < 14) {
      suggestedCharge = calculateEarlyCheckinCharge(actualTime, roomPrice)
    }
    
    setSuggestedEarlyCharge(suggestedCharge)
    // ALWAYS show confirmation dialog for ALL booking types
    setShowCheckinConfirm(true)
  }

  // Perform check-in with optional adjusted charge
  const performCheckIn = async (booking: BookingWithRoom, finalEarlyCharge: number, adjustmentNote?: string) => {
    setIsActionLoading(true)
    setShowCheckinConfirm(false)

    try {
      // Use atomic RPC for check-in (updates booking + room in single transaction)
      const { error } = await supabase.rpc('perform_checkin', {
        p_booking_id: booking.id,
        p_room_id: booking.room_id,
        p_early_checkin_charge: finalEarlyCharge,
      })

      if (error) {
        if (error.message?.includes('ROOM_OCCUPIED')) {
          const gName = error.message.split(':')[1] || 'unknown'
          throw new Error(`Phòng đang có khách "${gName}". Vui lòng checkout trước.`)
        }
        if (error.message?.includes('INVALID_ROOM_STATUS')) {
          const roomStatus = error.message.split(':')[1] || 'unknown'
          throw new Error(`Phòng đang ở trạng thái "${roomStatus}", không thể check-in.`)
        }
        throw error
      }

      // Update adjustment note separately if provided
      if (adjustmentNote) {
        const existingNotes = (booking as any).notes || ''
        const updateNotes = existingNotes
          ? `${existingNotes}\n[Điều chỉnh phụ thu check-in sớm: ${adjustmentNote}]`
          : `[Điều chỉnh phụ thu check-in sớm: ${adjustmentNote}]`
        await supabase
          .from('room_bookings')
          .update({ notes: updateNotes })
          .eq('id', booking.id)
      }

      toast({
        title: 'Check-in thành công',
        description: finalEarlyCharge > 0
          ? `Phụ thu check-in sớm: ${formatCurrency(finalEarlyCharge)}`
          : undefined,
      })

      queryClient.invalidateQueries({ queryKey: ['all-bookings'] })
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      queryClient.invalidateQueries({ queryKey: ['booking-stats'] })
      queryClient.invalidateQueries({ queryKey: ['today-checkins'] })
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Lỗi check-in',
        description: error.message,
      })
    } finally {
      setIsActionLoading(false)
      setActionBooking(null)
    }
  }

  // Handle Check-out click - validate date first, then show summary dialog
  const handleCheckOutClick = async (booking: BookingWithRoom) => {
    // Check if this is a group booking - open GroupCheckoutDialog instead
    const isGroupBooking = booking.booking_group_id && 
      groupCounts && 
      groupCounts[booking.booking_group_id] > 1

    if (isGroupBooking) {
      setSelectedGroupId(booking.booking_group_id!)
      setShowGroupCheckoutDialog(true)
      return
    }

    const now = new Date()
    const today = startOfDay(now)
    const checkOutDate = startOfDay(new Date(booking.check_out_date))

    // Block checkout if today is after check_out_date (overdue)
    if (isAfter(today, checkOutDate)) {
      // Show extend booking dialog
      setActionBooking(booking)
      setShowExtendDialog(true)
      return
    }

    setActionBooking(booking)
    setIsActionLoading(true)

    try {
      const actualTime = format(now, 'HH:mm')
      const roomPrice = (booking as any).room_price || 0
      const calculatedLateCharge = calculateLateCheckoutCharge(actualTime, roomPrice, now, new Date(booking.check_out_date))

      // Calculate nights - use effective checkout date for overdue bookings
      const checkIn = new Date(booking.check_in_date)
      const effectiveCheckOut = overdueCheckoutDate 
        ? new Date(overdueCheckoutDate) 
        : new Date(booking.check_out_date)
      const nights = Math.max(1, Math.ceil((effectiveCheckOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)))

      // Get service charges from all sources (booking_service_charges + chargeable_consumptions)
      let serviceCharges = 0
      let serviceDetails: ServiceChargeDetail[] = []
      try {
        const summary = await fetchServiceChargeSummary(booking.id, tenantId!, { includeAllBilled: true })
        serviceCharges = summary.grandTotal
        serviceDetails = summary.details
      } catch (e) {
        // Fallback to old method
        const consumablesTotal = await calculateServiceChargesFromConsumables(booking.id)
        serviceCharges = consumablesTotal > 0 ? consumablesTotal : ((booking as any).service_charges || 0)
      }

      // Note: chargeable consumptions already included in fetchServiceChargeSummary above

      // Fetch latest room check for damage info
      const { data: latestCheck } = await supabase
        .from('room_checks')
        .select('items_lost, items_damaged, items_consumed')
        .eq('room_id', booking.room_id)
        .in('check_type', ['checkout', 'daily'])
        .order('checked_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      // Convert to DamageChargeItem[]
      const damageItems: DamageChargeItem[] = [
        ...((latestCheck?.items_lost as any[]) || []).map(item => ({
          item_id: item.item_id,
          item_name: item.item_name,
          item_type: 'lost' as const,
          quantity: item.quantity,
          charge_amount: item.estimated_value || 0,
        })),
        ...((latestCheck?.items_damaged as any[]) || []).map(item => ({
          item_id: item.item_id,
          item_name: item.item_name,
          item_type: 'damaged' as const,
          quantity: item.quantity,
          charge_amount: item.damage_cost || 0,
          damage_type: item.damage_type,
        })),
        // items_consumed excluded from damage charges — already tracked via chargeable_consumptions
      ]

      const totalDamageCharge = damageItems.reduce(
        (sum, item) => sum + item.charge_amount * item.quantity, 0
      )

      // Calculate cost breakdown with damage
      // Determine booking type params
      const bType = booking.booking_type || 'daily'
      const bHourlyRate = booking.hourly_rate || 0
      const bHours = booking.booking_hours || 0
      const bMonthlyRate = booking.monthly_rate || 0
      const bMonths = booking.booking_months || 0

      // Calculate hourly overtime if applicable
      let hourlyOvertimeCharge = 0
      if (bType === 'hourly' && booking.hourly_end_time) {
        const scheduledEnd = new Date(booking.hourly_end_time)
        const overtimeMinutes = (now.getTime() - scheduledEnd.getTime()) / (1000 * 60)
        if (overtimeMinutes > 0) {
          hourlyOvertimeCharge = Math.ceil(overtimeMinutes / 60) * bHourlyRate
        }
      }

      const costBreakdown = calculateBookingCost({
        bookingType: bType,
        roomPrice,
        nights,
        earlyCheckinCharge: bType === 'daily' ? ((booking as any).early_checkin_charge || 0) : 0,
        lateCheckoutCharge: bType === 'daily' ? calculatedLateCharge : 0,
        hourlyRate: bHourlyRate,
        hours: bHours,
        hourlyOvertimeCharge,
        monthlyRate: bMonthlyRate,
        months: bMonths,
        serviceCharges,
        extraCharges: (booking as any).extra_charges || 0,
        damageCharges: totalDamageCharge,
        damageItems,
        vatRate: (booking as any).vat_rate ?? DEFAULT_PRICING_RULES.vatRate,
        serviceFeeRate: (booking as any).service_fee_rate ?? DEFAULT_PRICING_RULES.serviceFeeRate,
        depositAmount: (booking as any).deposit_amount || 0,
        amountPaid: (booking as any).amount_paid || 0,
      })

      setCheckoutDamageItems(damageItems)
      setCheckoutServiceDetails(serviceDetails)
      setCheckoutCostBreakdown(costBreakdown)
      setShowCheckoutSummary(true)
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Lỗi tính toán',
        description: error.message,
      })
      setActionBooking(null)
    } finally {
      setIsActionLoading(false)
    }
  }

  // Perform checkout
  const performCheckOut = async (
    adjustedLateCharge: number, 
    adjustmentNote?: string,
    damageCharges?: number,
    damageAdjustmentNote?: string,
    adjustedDamageItems?: DamageChargeItem[]
  ) => {
    if (!actionBooking || !checkoutCostBreakdown) return

    setIsActionLoading(true)
    setShowCheckoutSummary(false)

    try {
      const roomPrice = (actionBooking as any).room_price || 0
      const checkIn = new Date(actionBooking.check_in_date)
      const effectiveCheckOut = overdueCheckoutDate 
        ? new Date(overdueCheckoutDate) 
        : new Date(actionBooking.check_out_date)
      const nights = Math.max(1, Math.ceil((effectiveCheckOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)))

      // Recalculate with adjusted late charge and damage (with bookingType)
      const bType = actionBooking.booking_type || 'daily'
      const adjustedCostBreakdown = calculateBookingCost({
        bookingType: bType,
        roomPrice,
        nights,
        earlyCheckinCharge: checkoutCostBreakdown.earlyCheckinCharge,
        lateCheckoutCharge: bType === 'daily' ? adjustedLateCharge : 0,
        hourlyRate: actionBooking.hourly_rate || 0,
        hours: actionBooking.booking_hours || 0,
        hourlyOvertimeCharge: bType === 'hourly' ? adjustedLateCharge : 0,
        monthlyRate: actionBooking.monthly_rate || 0,
        months: actionBooking.booking_months || 0,
        serviceCharges: checkoutCostBreakdown.serviceCharges,
        extraCharges: checkoutCostBreakdown.extraCharges,
        damageCharges: damageCharges || 0,
        damageItems: adjustedDamageItems,
        vatRate: checkoutCostBreakdown.vatRate,
        serviceFeeRate: checkoutCostBreakdown.serviceFeeRate,
        depositAmount: checkoutCostBreakdown.depositAmount,
        amountPaid: checkoutCostBreakdown.amountPaid,
      })

      // Use RPC for atomic checkout with damage params
      // Pass p_check_out_date for overdue bookings to update atomically
      const { error } = await supabase.rpc('perform_checkout', {
        p_booking_id: actionBooking.id,
        p_room_id: actionBooking.room_id,
        p_late_checkout_charge: adjustedLateCharge,
        p_service_charges: checkoutCostBreakdown.serviceCharges,
        p_subtotal: adjustedCostBreakdown.subtotal,
        p_vat_amount: adjustedCostBreakdown.vatAmount,
        p_service_fee_amount: adjustedCostBreakdown.serviceFeeAmount,
        p_total_amount: adjustedCostBreakdown.totalAmount,
        p_damage_charges: damageCharges || 0,
        p_damage_notes: damageAdjustmentNote || null,
        p_damage_items: adjustedDamageItems ? JSON.stringify(adjustedDamageItems) : '[]',
        p_new_amount_paid: null,
        p_check_out_date: overdueCheckoutDate,
      })

      if (error) throw error

      // Fire-and-forget: create invoice
      if (tenantId) {
        createInvoiceAfterCheckout({ bookingId: actionBooking.id, tenantId, hotelId: actionBooking.hotel_id, userId: null }).catch(err => console.error('Failed to create invoice', err))
      }

      // Update notes if adjusted
      const allNotes: string[] = []
      if (adjustmentNote) allNotes.push(`[Điều chỉnh phụ thu checkout: ${adjustmentNote}]`)
      if (damageAdjustmentNote) allNotes.push(`[Điều chỉnh phí đền bù: ${damageAdjustmentNote}]`)
      
      if (allNotes.length > 0) {
        const existingNotes = (actionBooking as any).notes || ''
        const updateNotes = existingNotes
          ? `${existingNotes}\n${allNotes.join('\n')}`
          : allNotes.join('\n')
        await supabase
          .from('room_bookings')
          .update({ notes: updateNotes })
          .eq('id', actionBooking.id)
      }

      toast({ title: 'Check-out thành công' })
      
      // Send checkout notification realtime
      if (tenantId && actionBooking.hotel_id) {
        triggerRoomCheckoutNotification({
          tenantId,
          hotelId: actionBooking.hotel_id,
          roomId: actionBooking.room_id,
          roomNumber: actionBooking.room?.room_number || '',
        }).catch(err => console.error('Failed to send checkout notification:', err))
      }
      
      queryClient.invalidateQueries({ queryKey: ['all-bookings'] })
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Lỗi check-out',
        description: error.message,
      })
    } finally {
      setIsActionLoading(false)
      setActionBooking(null)
      setCheckoutCostBreakdown(null)
      setCheckoutDamageItems([])
      setOverdueCheckoutDate(null)
    }
  }

  // Handle pay and checkout
  const handlePayAndCheckout = async (
    adjustedLateCharge: number, 
    adjustmentNote?: string,
    damageCharges?: number,
    damageAdjustmentNote?: string,
    adjustedDamageItems?: DamageChargeItem[]
  ) => {
    if (!actionBooking || !checkoutCostBreakdown) return

    setIsActionLoading(true)
    setShowCheckoutSummary(false)

    try {
      const roomPrice = (actionBooking as any).room_price || 0
      const checkIn = new Date(actionBooking.check_in_date)
      const effectiveCheckOut = overdueCheckoutDate 
        ? new Date(overdueCheckoutDate) 
        : new Date(actionBooking.check_out_date)
      const nights = Math.max(1, Math.ceil((effectiveCheckOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)))

      // Recalculate with adjusted late charge and damage (with bookingType)
      const bType2 = actionBooking.booking_type || 'daily'
      const adjustedCostBreakdown = calculateBookingCost({
        bookingType: bType2,
        roomPrice,
        nights,
        earlyCheckinCharge: checkoutCostBreakdown.earlyCheckinCharge,
        lateCheckoutCharge: bType2 === 'daily' ? adjustedLateCharge : 0,
        hourlyRate: actionBooking.hourly_rate || 0,
        hours: actionBooking.booking_hours || 0,
        hourlyOvertimeCharge: bType2 === 'hourly' ? adjustedLateCharge : 0,
        monthlyRate: actionBooking.monthly_rate || 0,
        months: actionBooking.booking_months || 0,
        serviceCharges: checkoutCostBreakdown.serviceCharges,
        extraCharges: checkoutCostBreakdown.extraCharges,
        damageCharges: damageCharges || 0,
        damageItems: adjustedDamageItems,
        vatRate: checkoutCostBreakdown.vatRate,
        serviceFeeRate: checkoutCostBreakdown.serviceFeeRate,
        depositAmount: checkoutCostBreakdown.depositAmount,
        amountPaid: checkoutCostBreakdown.amountPaid,
      })

      // BookingPaymentDialog already updated amount_paid via update_booking_amount_paid RPC (ADD operation)
      // Pass null to perform_checkout to preserve the DB value and avoid overwriting partial payments
      const { error } = await supabase.rpc('perform_checkout', {
        p_booking_id: actionBooking.id,
        p_room_id: actionBooking.room_id,
        p_late_checkout_charge: adjustedLateCharge,
        p_service_charges: checkoutCostBreakdown.serviceCharges,
        p_subtotal: adjustedCostBreakdown.subtotal,
        p_vat_amount: adjustedCostBreakdown.vatAmount,
        p_service_fee_amount: adjustedCostBreakdown.serviceFeeAmount,
        p_total_amount: adjustedCostBreakdown.totalAmount,
        p_damage_charges: damageCharges || 0,
        p_damage_notes: damageAdjustmentNote || null,
        p_damage_items: adjustedDamageItems ? JSON.stringify(adjustedDamageItems) : '[]',
        p_new_amount_paid: null,
        p_check_out_date: overdueCheckoutDate,
      })

      if (error) throw error

      // Fire-and-forget: create invoice
      if (tenantId) {
        createInvoiceAfterCheckout({ bookingId: actionBooking.id, tenantId, hotelId: actionBooking.hotel_id, userId: null }).catch(err => console.error('Failed to create invoice', err))
      }

      // Update notes if adjusted
      const allNotes: string[] = []
      if (adjustmentNote) allNotes.push(`[Điều chỉnh phụ thu checkout: ${adjustmentNote}]`)
      if (damageAdjustmentNote) allNotes.push(`[Điều chỉnh phí đền bù: ${damageAdjustmentNote}]`)
      
      if (allNotes.length > 0) {
        const existingNotes = (actionBooking as any).notes || ''
        const updateNotes = existingNotes
          ? `${existingNotes}\n${allNotes.join('\n')}`
          : allNotes.join('\n')
        await supabase
          .from('room_bookings')
          .update({ notes: updateNotes })
          .eq('id', actionBooking.id)
      }

      toast({ title: 'Đã thanh toán và check-out thành công' })
      
      // Send checkout notification realtime
      if (tenantId && actionBooking.hotel_id) {
        triggerRoomCheckoutNotification({
          tenantId,
          hotelId: actionBooking.hotel_id,
          roomId: actionBooking.room_id,
          roomNumber: actionBooking.room?.room_number || '',
        }).catch(err => console.error('Failed to send checkout notification:', err))
      }
      
      queryClient.invalidateQueries({ queryKey: ['all-bookings'] })
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: error.message,
      })
    } finally {
      setIsActionLoading(false)
      setActionBooking(null)
      setCheckoutCostBreakdown(null)
      setCheckoutDamageItems([])
      setOverdueCheckoutDate(null)
    }
  }

  // Handle when inspection is completed - refetch damage items from room check
  const handleInspectionCompleted = async (roomCheckId: string) => {
    console.log('[BookingsPage] Inspection completed, refetching damage items. room_check_id:', roomCheckId)
    
    // KHÔNG hiển thị toast ở đây - CheckoutSummaryDialog đã hiển thị rồi
    
    try {
      const { data: latestCheck, error } = await supabase
        .from('room_checks')
        .select('items_lost, items_damaged, items_consumed')
        .eq('id', roomCheckId)
        .maybeSingle()
      
      if (error) {
        console.error('[BookingsPage] Error fetching room check:', error)
        return
      }
      
      if (latestCheck) {
        // Convert to DamageChargeItem[] - include consumed items
        const damageItems: DamageChargeItem[] = [
          // Đồ mất
          ...((latestCheck?.items_lost as any[]) || []).map(item => ({
            item_id: item.item_id,
            item_name: item.item_name,
            item_type: 'lost' as const,
            quantity: item.quantity,
            charge_amount: item.estimated_value || 0,
          })),
          // Đồ hỏng
          ...((latestCheck?.items_damaged as any[]) || []).map(item => ({
            item_id: item.item_id,
            item_name: item.item_name,
            item_type: 'damaged' as const,
            quantity: item.quantity,
            charge_amount: item.damage_cost || 0,
            damage_type: item.damage_type,
          })),
          // items_consumed excluded — already tracked via chargeable_consumptions
        ]
        
        console.log('[BookingsPage] Fetched damage items:', damageItems.length)
        setCheckoutDamageItems(damageItems)
        
        // Recalculate cost breakdown with new damage items
        if (checkoutCostBreakdown && actionBooking) {
          const totalDamageCharge = damageItems.reduce(
            (sum, item) => sum + item.charge_amount * item.quantity, 0
          )
          
          const roomPrice = (actionBooking as any).room_price || 0
          const checkIn = new Date(actionBooking.check_in_date)
          const effectiveCheckOut = overdueCheckoutDate 
            ? new Date(overdueCheckoutDate) 
            : new Date(actionBooking.check_out_date)
          const nights = Math.max(1, Math.ceil((effectiveCheckOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)))
          
          const bType = actionBooking.booking_type || 'daily'
          const newCostBreakdown = calculateBookingCost({
            bookingType: bType,
            roomPrice,
            nights,
            earlyCheckinCharge: checkoutCostBreakdown.earlyCheckinCharge,
            lateCheckoutCharge: checkoutCostBreakdown.lateCheckoutCharge,
            hourlyRate: actionBooking.hourly_rate || 0,
            hours: actionBooking.booking_hours || 0,
            hourlyOvertimeCharge: checkoutCostBreakdown.hourlyOvertimeCharge || 0,
            monthlyRate: actionBooking.monthly_rate || 0,
            months: actionBooking.booking_months || 0,
            serviceCharges: checkoutCostBreakdown.serviceCharges,
            extraCharges: (actionBooking as any).extra_charges || 0,
            damageCharges: totalDamageCharge,
            damageItems,
            vatRate: checkoutCostBreakdown.vatRate,
            serviceFeeRate: checkoutCostBreakdown.serviceFeeRate,
            depositAmount: checkoutCostBreakdown.depositAmount,
            amountPaid: checkoutCostBreakdown.amountPaid,
          })
          
          setCheckoutCostBreakdown(newCostBreakdown)
          console.log('[BookingsPage] Updated cost breakdown with damage charges:', totalDamageCharge)
        }
        
        // KHÔNG hiển thị toast ở đây - CheckoutSummaryDialog đã hiển thị toast gộp rồi
        // UI sẽ tự cập nhật qua state setCheckoutDamageItems
      }
    } catch (error: any) {
      console.error('[BookingsPage] Error in handleInspectionCompleted:', error)
    }
  }
  
  // Handle minimize checkout dialog
  const handleMinimizeCheckout = () => {
    if (!actionBooking || !checkoutCostBreakdown) return
    
    // Prevent duplicate - if already minimized, just close the dialog
    if (minimizedCheckouts.some(c => c.booking.id === actionBooking.id)) {
      setShowCheckoutSummary(false)
      setActionBooking(null)
      setCheckoutCostBreakdown(null)
      setCheckoutDamageItems([])
      return
    }
    
    const minimizedData: MinimizedCheckout = {
      booking: {
        id: actionBooking.id,
        guest_name: actionBooking.guest_name,
        room_id: actionBooking.room_id,
        hotel_id: actionBooking.hotel_id,
        check_out_date: actionBooking.check_out_date,
        room: actionBooking.room,
      },
      costBreakdown: checkoutCostBreakdown,
      damageItems: checkoutDamageItems,
      actualCheckoutTime: format(new Date(), 'HH:mm'),
      actualCheckoutDate: new Date(),
      scheduledCheckoutDate: new Date(actionBooking.check_out_date),
    }
    
    setMinimizedCheckouts(prev => [...prev, minimizedData])
    setShowCheckoutSummary(false)
    setActionBooking(null)
    setCheckoutCostBreakdown(null)
    setCheckoutDamageItems([])
  }
  
  // Handle minimize group checkout dialog
  const handleMinimizeGroupCheckout = () => {
    if (!selectedGroupId) return
    
    // Find group bookings to get guest name and room count
    const groupBookings = bookings?.filter(b => b.booking_group_id === selectedGroupId) || []
    if (groupBookings.length === 0) return
    
    // Prevent duplicate
    const groupKey = `group_${selectedGroupId}`
    if (minimizedCheckouts.some(c => c.booking.id === groupKey)) {
      setShowGroupCheckoutDialog(false)
      setSelectedGroupId(null)
      return
    }
    
    const firstBooking = groupBookings[0]
    const minimizedData: MinimizedCheckout = {
      booking: {
        id: groupKey,
        guest_name: firstBooking.guest_name,
        room_id: firstBooking.room_id,
        hotel_id: firstBooking.hotel_id,
        check_out_date: firstBooking.check_out_date,
        room: firstBooking.room,
      },
      costBreakdown: { bookingType: 'daily', roomPricePerNight: 0, nights: 0, roomTotal: 0, earlyCheckinCharge: 0, lateCheckoutCharge: 0, totalSurcharges: 0, serviceCharges: 0, extraCharges: 0, damageCharges: 0, subtotal: 0, vatRate: 0, vatAmount: 0, serviceFeeRate: 0, serviceFeeAmount: 0, totalAmount: 0, depositAmount: 0, amountPaid: 0, remainingAmount: 0, paymentStatus: 'pending' },
      damageItems: [],
      actualCheckoutTime: format(new Date(), 'HH:mm'),
      actualCheckoutDate: new Date(),
      scheduledCheckoutDate: new Date(firstBooking.check_out_date),
      isGroup: true,
      bookingGroupId: selectedGroupId,
      groupRoomCount: groupBookings.length,
    }
    
    setMinimizedCheckouts(prev => [...prev, minimizedData])
    setShowGroupCheckoutDialog(false)
    setSelectedGroupId(null)
  }
  
  // Handle restore checkout from minimized widget
  const handleRestoreCheckout = (checkout: MinimizedCheckout) => {
    // Handle group checkout restore
    if (checkout.isGroup && checkout.bookingGroupId) {
      setMinimizedCheckouts(prev => prev.filter(c => c.booking.id !== checkout.booking.id))
      setSelectedGroupId(checkout.bookingGroupId)
      setShowGroupCheckoutDialog(true)
      return
    }
    
    // Find the full booking data
    const fullBooking = bookings?.find(b => b.id === checkout.booking.id)
    if (!fullBooking) {
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: 'Không tìm thấy thông tin booking',
      })
      return
    }
    
    // Remove from minimized list
    setMinimizedCheckouts(prev => prev.filter(c => c.booking.id !== checkout.booking.id))
    
    // Mark as restored from widget - skip completion toast since widget already showed it
    setRestoredFromWidget(true)
    
    // Restore state
    setActionBooking(fullBooking)
    setCheckoutCostBreakdown(checkout.costBreakdown)
    setCheckoutDamageItems(checkout.damageItems)
    setShowCheckoutSummary(true)
  }
  
  // Handle close minimized checkout
  const handleCloseMinimizedCheckout = (bookingId: string) => {
    setMinimizedCheckouts(prev => prev.filter(c => c.booking.id !== bookingId))
  }
  
  if (isMobile) {
    return (
      <>
        <MobileBookingsPage
          bookings={bookings || []}
          filteredBookings={filteredBookings}
          isLoading={isLoading}
          stats={stats}
          statusFilter={statusFilter}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onStatusFilterChange={(s) => setStatusFilter(s as BookingStatus)}
          onCheckInClick={handleCheckInClick}
          onCheckOutClick={handleCheckOutClick}
          onBookingClick={(booking) => {
            setSelectedBooking(booking)
            setShowEditDialog(true)
          }}
          onAddBooking={() => setShowAddDialog(true)}
          isActionLoading={isActionLoading}
          actionBookingId={actionBooking?.id}
          groupCounts={groupCounts}
        />
        
        {/* Dialogs - shared between mobile and desktop */}
        <AddBookingDialog open={showAddDialog} onOpenChange={setShowAddDialog} />
        
        {showEditDialog && selectedBooking && (
          <RoomBookingDialog
            open={showEditDialog}
            onOpenChange={(open) => { setShowEditDialog(open); if (!open) setSelectedBooking(null) }}
            roomId={selectedBooking.room_id}
            roomNumber={selectedBooking.room?.room_number || ''}
            hotelId={selectedBooking.hotel_id}
            tenantId={selectedBooking.tenant_id}
            booking={selectedBooking}
          />
        )}

        {actionBooking && (
          <CheckInConfirmDialog
            open={showCheckinConfirm}
            onOpenChange={(open) => { setShowCheckinConfirm(open); if (!open) setActionBooking(null) }}
            guestName={actionBooking.guest_name}
            guestPhone={actionBooking.guest_phone}
            roomNumber={actionBooking.room?.room_number || ''}
            actualCheckInTime={format(new Date(), 'HH:mm')}
            roomPrice={(actionBooking as any).room_price || 0}
            suggestedCharge={suggestedEarlyCharge}
            bookingType={actionBooking.booking_type || 'daily'}
            bookingHours={actionBooking.booking_hours || undefined}
            bookingMonths={actionBooking.booking_months || undefined}
            checkInDate={new Date(actionBooking.check_in_date)}
            checkOutDate={new Date(actionBooking.check_out_date)}
            totalNights={differenceInDays(new Date(actionBooking.check_out_date), new Date(actionBooking.check_in_date))}
            totalAmount={actionBooking.total_amount || 0}
            depositAmount={actionBooking.deposit_amount || 0}
            bookingSource={actionBooking.booking_source}
            onConfirm={(finalCharge, adjustmentNote) => performCheckIn(actionBooking, finalCharge, adjustmentNote)}
            isLoading={isActionLoading}
          />
        )}

        {actionBooking && checkoutCostBreakdown && (
          <CheckoutSummaryDialog
            open={showCheckoutSummary}
            onOpenChange={(open) => { setShowCheckoutSummary(open); if (!open) { setActionBooking(null); setCheckoutCostBreakdown(null); setRestoredFromWidget(false) } }}
            guestName={actionBooking.guest_name}
            roomNumber={actionBooking.room?.room_number || ''}
            actualCheckoutTime={format(new Date(), 'HH:mm')}
            actualCheckoutDate={new Date()}
            scheduledCheckoutDate={actionBooking.check_out_date ? new Date(actionBooking.check_out_date) : new Date()}
            costBreakdown={checkoutCostBreakdown}
            bookingType={actionBooking.booking_type || 'daily'}
            hourlyRate={actionBooking.hourly_rate || undefined}
            bookingHours={actionBooking.booking_hours || undefined}
            scheduledEndTime={actionBooking.hourly_end_time ? new Date(actionBooking.hourly_end_time) : undefined}
            monthlyRate={actionBooking.monthly_rate || undefined}
            bookingMonths={actionBooking.booking_months || undefined}
            damageItems={checkoutDamageItems}
            serviceChargeDetails={checkoutServiceDetails}
            onConfirmCheckout={performCheckOut}
            onPayAndCheckout={handlePayAndCheckout}
            isLoading={isActionLoading}
            bookingId={actionBooking.id}
            roomId={actionBooking.room_id}
            hotelId={actionBooking.hotel_id}
            tenantId={actionBooking.tenant_id}
            onInspectionCompleted={handleInspectionCompleted}
            onMinimize={handleMinimizeCheckout}
            skipCompletionToast={restoredFromWidget}
          />
        )}

        {minimizedCheckouts.length > 0 && (
          <div className="fixed bottom-20 right-4 z-50 flex flex-col-reverse gap-2">
            {minimizedCheckouts.map((checkout) => (
              <MinimizedCheckoutWidget
                key={checkout.booking.id}
                checkout={checkout}
                onRestore={handleRestoreCheckout}
                onClose={handleCloseMinimizedCheckout}
                tenantId={tenantId}
              />
            ))}
          </div>
        )}

        {actionBooking && (
          <ExtendBookingDialog
            open={showExtendDialog}
            onOpenChange={(open) => { setShowExtendDialog(open); if (!open) setActionBooking(null) }}
            booking={actionBooking}
            onSuccess={() => setActionBooking(null)}
            onCheckoutNow={async () => {
              setShowExtendDialog(false)
              if (!actionBooking) return
              setIsActionLoading(true)
              try {
                const now = new Date()
                const todayStr = format(now, 'yyyy-MM-dd')
                setOverdueCheckoutDate(todayStr)
                const updatedBooking = { ...actionBooking, check_out_date: todayStr }
                setActionBooking(updatedBooking)
                const actualTime = format(now, 'HH:mm')
                const roomPrice = (updatedBooking as any).room_price || 0
                const bType = updatedBooking.booking_type || 'daily'
                const calculatedLateCharge = bType === 'daily' ? calculateLateCheckoutCharge(actualTime, roomPrice) : 0
                const checkIn = new Date(updatedBooking.check_in_date)
                const checkOut = new Date(todayStr)
                const nights = Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)))
                let serviceCharges = (updatedBooking as any).service_charges || 0
                let serviceDetails: ServiceChargeDetail[] = []
                try {
                  const summary = await fetchServiceChargeSummary(updatedBooking.id, tenantId!, { includeAllBilled: true })
                  serviceCharges = summary.grandTotal
                  serviceDetails = summary.details
                } catch (e) {
                  console.warn('Failed to fetch service charge summary for overdue checkout:', e)
                }
                const { data: latestCheck } = await supabase.from('room_checks').select('items_lost, items_damaged, items_consumed').eq('room_id', updatedBooking.room_id).in('check_type', ['checkout', 'daily']).order('checked_at', { ascending: false }).limit(1).maybeSingle()
                const damageItems: DamageChargeItem[] = [
                  ...((latestCheck?.items_lost as any[]) || []).map(item => ({ item_id: item.item_id, item_name: item.item_name, item_type: 'lost' as const, quantity: item.quantity, charge_amount: item.estimated_value || 0 })),
                  ...((latestCheck?.items_damaged as any[]) || []).map(item => ({ item_id: item.item_id, item_name: item.item_name, item_type: 'damaged' as const, quantity: item.quantity, charge_amount: item.damage_cost || 0, damage_type: item.damage_type })),
                  // items_consumed excluded — already tracked via chargeable_consumptions
                ]
                const totalDamageCharge = damageItems.reduce((sum, item) => sum + item.charge_amount * item.quantity, 0)
                let hourlyOvertimeCharge = 0
                if (bType === 'hourly' && updatedBooking.hourly_end_time) {
                  const scheduledEnd = new Date(updatedBooking.hourly_end_time)
                  const overtimeMinutes = (now.getTime() - scheduledEnd.getTime()) / (1000 * 60)
                  if (overtimeMinutes > 0) hourlyOvertimeCharge = Math.ceil(overtimeMinutes / 60) * (updatedBooking.hourly_rate || 0)
                }
                const costBreakdown = calculateBookingCost({
                  bookingType: bType, roomPrice, nights,
                  earlyCheckinCharge: bType === 'daily' ? ((updatedBooking as any).early_checkin_charge || 0) : 0,
                  lateCheckoutCharge: bType === 'daily' ? calculatedLateCharge : 0,
                  hourlyRate: updatedBooking.hourly_rate || 0, hours: updatedBooking.booking_hours || 0, hourlyOvertimeCharge,
                  monthlyRate: updatedBooking.monthly_rate || 0, months: updatedBooking.booking_months || 0,
                   serviceCharges, extraCharges: (updatedBooking as any).extra_charges || 0,
                  damageCharges: totalDamageCharge, damageItems,
                  vatRate: (updatedBooking as any).vat_rate ?? DEFAULT_PRICING_RULES.vatRate,
                  serviceFeeRate: (updatedBooking as any).service_fee_rate ?? DEFAULT_PRICING_RULES.serviceFeeRate,
                  depositAmount: (updatedBooking as any).deposit_amount || 0, amountPaid: (updatedBooking as any).amount_paid || 0,
                })
                setCheckoutDamageItems(damageItems)
                setCheckoutServiceDetails(serviceDetails)
                setCheckoutCostBreakdown(costBreakdown)
                setShowCheckoutSummary(true)
              } catch (error: any) {
                toast({ variant: 'destructive', title: 'Lỗi tính toán', description: error.message })
                setActionBooking(null)
              } finally {
                setIsActionLoading(false)
              }
            }}
            onTransferRoom={() => {
              toast({ title: 'Chuyển phòng', description: 'Tính năng chuyển phòng đang phát triển.', variant: 'default' })
            }}
          />
        )}

        {selectedGroupId && tenantId && selectedHotelId && (
          <>
            <GroupPaymentDialog
              open={showGroupPaymentDialog}
              onOpenChange={(open) => { setShowGroupPaymentDialog(open); if (!open) setSelectedGroupId(null) }}
              bookingGroupId={selectedGroupId}
              tenantId={tenantId}
              hotelId={selectedHotelId}
              onPaymentComplete={() => { queryClient.invalidateQueries({ queryKey: ['all-bookings'] }); queryClient.invalidateQueries({ queryKey: ['group-booking'] }) }}
            />
            <GroupCheckoutDialog
              open={showGroupCheckoutDialog}
              onOpenChange={(open) => { setShowGroupCheckoutDialog(open); if (!open) setSelectedGroupId(null) }}
              bookingGroupId={selectedGroupId}
              tenantId={tenantId}
              hotelId={selectedHotelId}
              onCheckoutComplete={() => { queryClient.invalidateQueries({ queryKey: ['all-bookings'] }); queryClient.invalidateQueries({ queryKey: ['group-booking'] }); queryClient.invalidateQueries({ queryKey: ['rooms'] }) }}
              onMinimize={handleMinimizeGroupCheckout}
            />
          </>
        )}
      </>
    )
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
            <SelectItem value="conflict">
              <span className="text-red-600">⚠️ Xung đột lịch ({bookingConflicts?.length || 0})</span>
            </SelectItem>
            <SelectItem value="overdue">Quá hạn checkout</SelectItem>
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
                  <TableHead>Thời gian</TableHead>
                  <TableHead>Thời hạn</TableHead>
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
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{booking.room?.room_number}</p>
                            {/* Booking type badge */}
                            {booking.booking_type === 'hourly' && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-blue-300 text-blue-600">
                                Giờ
                              </Badge>
                            )}
                            {booking.booking_type === 'monthly' && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-purple-300 text-purple-600">
                                Tháng
                              </Badge>
                            )}
                            {/* Group booking badge with tooltip */}
                            {booking.booking_group_id && groupCounts && groupCounts[booking.booking_group_id] > 1 && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge 
                                      variant="outline" 
                                      className="text-xs px-1.5 py-0 h-5 gap-1 cursor-help bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800"
                                    >
                                      <Users className="h-3 w-3" />
                                      Nhóm {groupCounts[booking.booking_group_id]}
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="font-medium">Đặt phòng nhóm</p>
                                    <p className="text-xs text-muted-foreground">
                                      {groupCounts[booking.booking_group_id]} phòng • Bấm "TT Nhóm" để thanh toán chung
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground capitalize">
                            {booking.room?.room_type} • Tầng {booking.room?.floor}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {/* For hourly bookings, show time range */}
                        {booking.booking_type === 'hourly' && booking.hourly_start_time ? (
                          <div>
                            <p className={isToday(new Date(booking.check_in_date)) ? 'text-blue-600 font-medium' : ''}>
                              {format(new Date(booking.check_in_date), 'dd/MM', { locale: vi })}
                            </p>
                            <p className="text-xs text-blue-600 font-medium">
                              {format(new Date(booking.hourly_start_time), 'HH:mm')} - {booking.hourly_end_time ? format(new Date(booking.hourly_end_time), 'HH:mm') : ''}
                            </p>
                          </div>
                        ) : (
                          <div>
                            <p className={isToday(new Date(booking.check_in_date)) ? 'text-blue-600 font-medium' : ''}>
                              {format(new Date(booking.check_in_date), 'dd/MM/yyyy', { locale: vi })}
                            </p>
                            {booking.actual_check_in && (
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(booking.actual_check_in), 'HH:mm')}
                              </p>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {/* For hourly bookings, show duration instead */}
                        {booking.booking_type === 'hourly' ? (
                          <div>
                            <p className="text-sm font-medium">{booking.booking_hours || 0}h</p>
                          </div>
                        ) : booking.booking_type === 'monthly' ? (
                          <div>
                            <p className="text-sm">{booking.booking_months || 1} tháng</p>
                            <p className="text-xs text-muted-foreground">
                              → {format(new Date(booking.check_out_date), 'dd/MM/yy', { locale: vi })}
                            </p>
                          </div>
                        ) : (
                          <div>
                            <p className={isToday(new Date(booking.check_out_date)) ? 'text-orange-600 font-medium' : ''}>
                              {format(new Date(booking.check_out_date), 'dd/MM/yyyy', { locale: vi })}
                            </p>
                            {booking.actual_check_out && (
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(booking.actual_check_out), 'HH:mm')}
                              </p>
                            )}
                          </div>
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
                          {/* Check-in button for confirmed bookings */}
                          {booking.status === 'confirmed' && (
                            <>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
                                disabled={isActionLoading && actionBooking?.id === booking.id}
                                onClick={() => handleCheckInClick(booking)}
                              >
                                {isActionLoading && actionBooking?.id === booking.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <>
                                    <LogIn className="h-3 w-3 mr-1" />
                                    Check-in
                                  </>
                                )}
                              </Button>
                            </>
                          )}
                          {/* Check-out and group actions for checked_in bookings */}
                          {booking.status === 'checked_in' && (
                            <>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs text-orange-600 border-orange-200 hover:bg-orange-50"
                                disabled={isActionLoading && actionBooking?.id === booking.id}
                                onClick={() => handleCheckOutClick(booking)}
                              >
                                {isActionLoading && actionBooking?.id === booking.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <>
                                    <LogOut className="h-3 w-3 mr-1" />
                                    Check-out
                                  </>
                                )}
                              </Button>
                            </>
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

      {/* Check-in Confirmation Dialog */}
      {actionBooking && (
        <CheckInConfirmDialog
          open={showCheckinConfirm}
          onOpenChange={(open) => {
            setShowCheckinConfirm(open)
            if (!open) setActionBooking(null)
          }}
          guestName={actionBooking.guest_name}
          guestPhone={actionBooking.guest_phone}
          roomNumber={actionBooking.room?.room_number || ''}
          actualCheckInTime={format(new Date(), 'HH:mm')}
          roomPrice={(actionBooking as any).room_price || 0}
          suggestedCharge={suggestedEarlyCharge}
          bookingType={actionBooking.booking_type || 'daily'}
          bookingHours={actionBooking.booking_hours || undefined}
          bookingMonths={actionBooking.booking_months || undefined}
          checkInDate={new Date(actionBooking.check_in_date)}
          checkOutDate={new Date(actionBooking.check_out_date)}
          totalNights={differenceInDays(new Date(actionBooking.check_out_date), new Date(actionBooking.check_in_date))}
          totalAmount={actionBooking.total_amount || 0}
          depositAmount={actionBooking.deposit_amount || 0}
          bookingSource={actionBooking.booking_source}
          onConfirm={(finalCharge, adjustmentNote) => performCheckIn(actionBooking, finalCharge, adjustmentNote)}
          isLoading={isActionLoading}
        />
      )}

      {/* Checkout Summary Dialog */}
      {actionBooking && checkoutCostBreakdown && (
        <CheckoutSummaryDialog
          open={showCheckoutSummary}
          onOpenChange={(open) => {
            setShowCheckoutSummary(open)
            if (!open) {
              setActionBooking(null)
              setCheckoutCostBreakdown(null)
              setRestoredFromWidget(false) // Reset when dialog closes
            }
          }}
          guestName={actionBooking.guest_name}
          roomNumber={actionBooking.room?.room_number || ''}
          actualCheckoutTime={format(new Date(), 'HH:mm')}
          actualCheckoutDate={new Date()}
          scheduledCheckoutDate={actionBooking.check_out_date ? new Date(actionBooking.check_out_date) : new Date()}
          costBreakdown={checkoutCostBreakdown}
          bookingType={actionBooking.booking_type || 'daily'}
          hourlyRate={actionBooking.hourly_rate || undefined}
          bookingHours={actionBooking.booking_hours || undefined}
          scheduledEndTime={actionBooking.hourly_end_time ? new Date(actionBooking.hourly_end_time) : undefined}
          monthlyRate={actionBooking.monthly_rate || undefined}
          bookingMonths={actionBooking.booking_months || undefined}
          damageItems={checkoutDamageItems}
          serviceChargeDetails={checkoutServiceDetails}
          onConfirmCheckout={performCheckOut}
          onPayAndCheckout={handlePayAndCheckout}
          isLoading={isActionLoading}
          bookingId={actionBooking.id}
          roomId={actionBooking.room_id}
          hotelId={actionBooking.hotel_id}
          tenantId={actionBooking.tenant_id}
          onInspectionCompleted={handleInspectionCompleted}
          onMinimize={handleMinimizeCheckout}
          skipCompletionToast={restoredFromWidget}
        />
      )}

      {/* Minimized Checkout Widgets - Fixed container */}
      {minimizedCheckouts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col-reverse gap-2">
          {minimizedCheckouts.map((checkout) => (
            <MinimizedCheckoutWidget
              key={checkout.booking.id}
              checkout={checkout}
              onRestore={handleRestoreCheckout}
              onClose={handleCloseMinimizedCheckout}
              tenantId={tenantId}
            />
          ))}
        </div>
      )}

      {/* Extend Booking Dialog - for overdue checkout */}
      {actionBooking && (
        <ExtendBookingDialog
          open={showExtendDialog}
          onOpenChange={(open) => {
            setShowExtendDialog(open)
            if (!open) setActionBooking(null)
          }}
          booking={actionBooking}
          onSuccess={() => {
            setActionBooking(null)
          }}
          onCheckoutNow={async () => {
            // Close extend dialog first
            setShowExtendDialog(false)
            
            if (!actionBooking) return
            setIsActionLoading(true)
            
            try {
              const now = new Date()
              const todayStr = format(now, 'yyyy-MM-dd')
              
              // Save overdue checkout date - will be passed to perform_checkout RPC atomically
              // (No separate PATCH needed - the RPC handles check_out_date update)
              setOverdueCheckoutDate(todayStr)
              
              // Update local state for cost calculation
              const updatedBooking = { ...actionBooking, check_out_date: todayStr }
              setActionBooking(updatedBooking)
              
              // Calculate costs (same logic as handleCheckOutClick)
              const actualTime = format(now, 'HH:mm')
              const roomPrice = (updatedBooking as any).room_price || 0
              const bType = updatedBooking.booking_type || 'daily'
              const calculatedLateCharge = bType === 'daily' ? calculateLateCheckoutCharge(actualTime, roomPrice) : 0
              
              const checkIn = new Date(updatedBooking.check_in_date)
              const checkOut = new Date(todayStr)
              const nights = Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)))
              
              let serviceCharges = (updatedBooking as any).service_charges || 0
              let serviceDetails: ServiceChargeDetail[] = []
              try {
                const summary = await fetchServiceChargeSummary(updatedBooking.id, tenantId!, { includeAllBilled: true })
                serviceCharges = summary.grandTotal
                serviceDetails = summary.details
              } catch (e) {
                console.warn('Failed to fetch service charge summary for mobile overdue checkout:', e)
              }
              
              const { data: latestCheck } = await supabase
                .from('room_checks')
                .select('items_lost, items_damaged, items_consumed')
                .eq('room_id', updatedBooking.room_id)
                .in('check_type', ['checkout', 'daily'])
                .order('checked_at', { ascending: false })
                .limit(1)
                .maybeSingle()
              
              const damageItems: DamageChargeItem[] = [
                ...((latestCheck?.items_lost as any[]) || []).map(item => ({
                  item_id: item.item_id, item_name: item.item_name, item_type: 'lost' as const,
                  quantity: item.quantity, charge_amount: item.estimated_value || 0,
                })),
                ...((latestCheck?.items_damaged as any[]) || []).map(item => ({
                  item_id: item.item_id, item_name: item.item_name, item_type: 'damaged' as const,
                  quantity: item.quantity, charge_amount: item.damage_cost || 0, damage_type: item.damage_type,
                })),
                // items_consumed excluded — already tracked via chargeable_consumptions
              ]
              
              const totalDamageCharge = damageItems.reduce((sum, item) => sum + item.charge_amount * item.quantity, 0)
              
              let hourlyOvertimeCharge = 0
              if (bType === 'hourly' && updatedBooking.hourly_end_time) {
                const scheduledEnd = new Date(updatedBooking.hourly_end_time)
                const overtimeMinutes = (now.getTime() - scheduledEnd.getTime()) / (1000 * 60)
                if (overtimeMinutes > 0) hourlyOvertimeCharge = Math.ceil(overtimeMinutes / 60) * (updatedBooking.hourly_rate || 0)
              }
              
              const costBreakdown = calculateBookingCost({
                bookingType: bType,
                roomPrice, nights,
                earlyCheckinCharge: bType === 'daily' ? ((updatedBooking as any).early_checkin_charge || 0) : 0,
                lateCheckoutCharge: bType === 'daily' ? calculatedLateCharge : 0,
                hourlyRate: updatedBooking.hourly_rate || 0,
                hours: updatedBooking.booking_hours || 0,
                hourlyOvertimeCharge,
                monthlyRate: updatedBooking.monthly_rate || 0,
                months: updatedBooking.booking_months || 0,
                serviceCharges,
                extraCharges: (updatedBooking as any).extra_charges || 0,
                damageCharges: totalDamageCharge,
                damageItems,
                vatRate: (updatedBooking as any).vat_rate ?? DEFAULT_PRICING_RULES.vatRate,
                serviceFeeRate: (updatedBooking as any).service_fee_rate ?? DEFAULT_PRICING_RULES.serviceFeeRate,
                depositAmount: (updatedBooking as any).deposit_amount || 0,
                amountPaid: (updatedBooking as any).amount_paid || 0,
              })
              
              setCheckoutDamageItems(damageItems)
              setCheckoutServiceDetails(serviceDetails)
              setCheckoutCostBreakdown(costBreakdown)
              setShowCheckoutSummary(true)
            } catch (error: any) {
              toast({ variant: 'destructive', title: 'Lỗi tính toán', description: error.message })
              setActionBooking(null)
            } finally {
              setIsActionLoading(false)
            }
          }}
          onTransferRoom={() => {
            // Navigate to room transfer page
            toast({
              title: 'Chuyển phòng',
              description: 'Tính năng chuyển phòng đang phát triển. Vui lòng xử lý thủ công.',
              variant: 'default',
            })
          }}
        />
      )}

      {/* Group Payment Dialog */}
      {selectedGroupId && tenantId && selectedHotelId && (
        <GroupPaymentDialog
          open={showGroupPaymentDialog}
          onOpenChange={(open) => {
            setShowGroupPaymentDialog(open)
            if (!open) setSelectedGroupId(null)
          }}
          bookingGroupId={selectedGroupId}
          tenantId={tenantId}
          hotelId={selectedHotelId}
          onPaymentComplete={() => {
            queryClient.invalidateQueries({ queryKey: ['all-bookings'] })
            queryClient.invalidateQueries({ queryKey: ['group-booking'] })
          }}
        />
      )}

      {/* Group Checkout Dialog */}
      {selectedGroupId && tenantId && selectedHotelId && (
        <GroupCheckoutDialog
          open={showGroupCheckoutDialog}
          onOpenChange={(open) => {
            setShowGroupCheckoutDialog(open)
            if (!open) setSelectedGroupId(null)
          }}
          bookingGroupId={selectedGroupId}
          tenantId={tenantId}
          hotelId={selectedHotelId}
          onCheckoutComplete={() => {
            queryClient.invalidateQueries({ queryKey: ['all-bookings'] })
            queryClient.invalidateQueries({ queryKey: ['group-booking'] })
            queryClient.invalidateQueries({ queryKey: ['rooms'] })
          }}
          onMinimize={handleMinimizeGroupCheckout}
        />
      )}
    </div>
  )
}
