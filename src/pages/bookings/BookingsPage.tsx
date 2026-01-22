import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
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
import { MinimizedCheckoutWidget, type MinimizedCheckout } from '@/components/bookings/MinimizedCheckoutWidget'
import { CheckInConfirmDialog } from '@/components/bookings/CheckInConfirmDialog'
import { ExtendBookingDialog } from '@/components/bookings/ExtendBookingDialog'
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
  type DamageChargeItem,
} from '@/lib/bookingCalculations'
import { calculateServiceChargesFromConsumables } from '@/hooks/usePricingRules'
import { triggerRoomCheckoutNotification } from '@/hooks/useNotificationTriggers'

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
  
  // States for check-in/check-out dialogs
  const [showCheckinConfirm, setShowCheckinConfirm] = useState(false)
  const [showCheckoutSummary, setShowCheckoutSummary] = useState(false)
  const [showExtendDialog, setShowExtendDialog] = useState(false)
  const [actionBooking, setActionBooking] = useState<BookingWithRoom | null>(null)
  const [suggestedEarlyCharge, setSuggestedEarlyCharge] = useState(0)
  const [checkoutCostBreakdown, setCheckoutCostBreakdown] = useState<BookingCostBreakdown | null>(null)
  const [checkoutDamageItems, setCheckoutDamageItems] = useState<DamageChargeItem[]>([])
  const [isActionLoading, setIsActionLoading] = useState(false)
  
  // Minimized checkouts state - allows processing other guests while waiting for inspection
  const [minimizedCheckouts, setMinimizedCheckouts] = useState<MinimizedCheckout[]>([])
  
  // Track if checkout was restored from widget (to skip duplicate toast)
  const [restoredFromWidget, setRestoredFromWidget] = useState(false)
  const { toast } = useToast()
  const queryClient = useQueryClient()

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
  
  const filteredBookings = (bookings?.filter(booking => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      booking.guest_name.toLowerCase().includes(query) ||
      booking.guest_phone?.toLowerCase().includes(query) ||
      booking.room?.room_number?.toLowerCase().includes(query)
    )
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

  // Handle Check-in click - validate date first, then show dialog if early check-in
  const handleCheckInClick = (booking: BookingWithRoom) => {
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

    const actualTime = format(now, 'HH:mm')
    const hours = parseInt(actualTime.split(':')[0])
    const roomPrice = (booking as any).room_price || 0

    setActionBooking(booking)

    // If check-in is after standard time (14:00), no surcharge - check-in directly
    if (hours >= 14) {
      performCheckIn(booking, 0)
    } else {
      // Show confirmation dialog with editable surcharge
      const suggestedCharge = calculateEarlyCheckinCharge(actualTime, roomPrice)
      setSuggestedEarlyCharge(suggestedCharge)
      setShowCheckinConfirm(true)
    }
  }

  // Perform check-in with optional adjusted charge
  const performCheckIn = async (booking: BookingWithRoom, finalEarlyCharge: number, adjustmentNote?: string) => {
    setIsActionLoading(true)
    setShowCheckinConfirm(false)

    try {
      const now = new Date()

      // Update booking status with the (possibly adjusted) early checkin charge
      const updateData: any = {
        status: 'checked_in',
        actual_check_in: now.toISOString(),
        early_checkin_charge: finalEarlyCharge,
      }

      // Add adjustment note if provided
      if (adjustmentNote) {
        const existingNotes = (booking as any).notes || ''
        updateData.notes = existingNotes
          ? `${existingNotes}\n[Điều chỉnh phụ thu check-in sớm: ${adjustmentNote}]`
          : `[Điều chỉnh phụ thu check-in sớm: ${adjustmentNote}]`
      }

      const { error: bookingError } = await supabase
        .from('room_bookings')
        .update(updateData)
        .eq('id', booking.id)

      if (bookingError) throw bookingError

      // Update room status to 'occupied'
      const { error: roomError } = await supabase
        .from('rooms')
        .update({ status: 'occupied' })
        .eq('id', booking.room_id)

      if (roomError) throw roomError

      toast({
        title: 'Check-in thành công',
        description: finalEarlyCharge > 0
          ? `Phụ thu check-in sớm: ${formatCurrency(finalEarlyCharge)}`
          : undefined,
      })

      queryClient.invalidateQueries({ queryKey: ['all-bookings'] })
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
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
      const calculatedLateCharge = calculateLateCheckoutCharge(actualTime, roomPrice)

      // Calculate nights
      const checkIn = new Date(booking.check_in_date)
      const checkOut = new Date(booking.check_out_date)
      const nights = Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)))

      // Get consumables service charges
      const consumablesTotal = await calculateServiceChargesFromConsumables(booking.id)
      const serviceCharges = consumablesTotal > 0 ? consumablesTotal : ((booking as any).service_charges || 0)

      // Fetch latest room check for damage info
      const { data: latestCheck } = await supabase
        .from('room_checks')
        .select('items_lost, items_damaged')
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
      ]

      const totalDamageCharge = damageItems.reduce(
        (sum, item) => sum + item.charge_amount * item.quantity, 0
      )

      // Calculate cost breakdown with damage
      const costBreakdown = calculateBookingCost({
        roomPrice,
        nights,
        earlyCheckinCharge: (booking as any).early_checkin_charge || 0,
        lateCheckoutCharge: calculatedLateCharge,
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
      const checkOut = new Date(actionBooking.check_out_date)
      const nights = Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)))

      // Recalculate with adjusted late charge and damage
      const adjustedCostBreakdown = calculateBookingCost({
        roomPrice,
        nights,
        earlyCheckinCharge: checkoutCostBreakdown.earlyCheckinCharge,
        lateCheckoutCharge: adjustedLateCharge,
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
      })

      if (error) throw error

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
      const checkOut = new Date(actionBooking.check_out_date)
      const nights = Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)))

      // Recalculate with adjusted late charge and damage
      const adjustedCostBreakdown = calculateBookingCost({
        roomPrice,
        nights,
        earlyCheckinCharge: checkoutCostBreakdown.earlyCheckinCharge,
        lateCheckoutCharge: adjustedLateCharge,
        serviceCharges: checkoutCostBreakdown.serviceCharges,
        extraCharges: checkoutCostBreakdown.extraCharges,
        damageCharges: damageCharges || 0,
        damageItems: adjustedDamageItems,
        vatRate: checkoutCostBreakdown.vatRate,
        serviceFeeRate: checkoutCostBreakdown.serviceFeeRate,
        depositAmount: checkoutCostBreakdown.depositAmount,
        amountPaid: checkoutCostBreakdown.amountPaid,
      })

      const newAmountPaid = adjustedCostBreakdown.totalAmount - checkoutCostBreakdown.depositAmount

      // Update payment first
      const { error: paymentError } = await supabase
        .from('room_bookings')
        .update({
          amount_paid: newAmountPaid,
          payment_status: 'paid',
          paid_at: new Date().toISOString(),
        })
        .eq('id', actionBooking.id)

      if (paymentError) throw paymentError

      // Use RPC for atomic checkout with damage params
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
      })

      if (error) throw error

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
          // Đồ đã dùng (consumed)
          ...((latestCheck?.items_consumed as any[]) || []).map(item => ({
            item_id: item.item_id,
            item_name: item.item_name,
            item_type: 'consumed' as const,
            quantity: item.quantity,
            charge_amount: item.unit_price || 0,
          })),
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
          const checkOut = new Date(actionBooking.check_out_date)
          const nights = Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)))
          
          const newCostBreakdown = calculateBookingCost({
            roomPrice,
            nights,
            earlyCheckinCharge: checkoutCostBreakdown.earlyCheckinCharge,
            lateCheckoutCharge: checkoutCostBreakdown.lateCheckoutCharge,
            serviceCharges: checkoutCostBreakdown.serviceCharges,
            extraCharges: checkoutCostBreakdown.extraCharges,
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
        
        if (damageItems.length > 0) {
          toast({
            title: 'Đã cập nhật kết quả kiểm tra',
            description: `Phát hiện ${damageItems.length} vật phẩm cần xử lý`,
          })
        } else {
          toast({
            title: 'Kiểm tra hoàn tất',
            description: 'Không có vật phẩm hỏng/mất',
          })
        }
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
  
  // Handle restore checkout from minimized widget
  const handleRestoreCheckout = (checkout: MinimizedCheckout) => {
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
                          )}
                          {booking.status === 'checked_in' && (
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
          roomNumber={actionBooking.room?.room_number || ''}
          actualCheckInTime={format(new Date(), 'HH:mm')}
          roomPrice={(actionBooking as any).room_price || 0}
          suggestedCharge={suggestedEarlyCharge}
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
          damageItems={checkoutDamageItems}
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
        />
      )}
    </div>
  )
}
