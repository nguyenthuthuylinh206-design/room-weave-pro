import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Users,
  DoorOpen,
  CheckCircle,
  Clock,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Minimize2,
  CreditCard,
  ClipboardCheck,
  Send,
  CheckCircle2,
  Check,
  Phone,
  ChevronDown,
  ChevronUp,
  Printer,
} from 'lucide-react'
import { toast } from 'sonner'
import { format, differenceInDays, isAfter, startOfDay } from 'date-fns'
import { vi } from 'date-fns/locale'
import { formatVNCurrency } from '@/lib/pricing'
import { formatCurrency } from '@/lib/utils'
import { useGroupBooking, GroupBookingRoom } from '@/hooks/useGroupBooking'
import { useOnShiftStaffList, OnShiftStaffMember } from '@/hooks/useOnShiftStaffList'
import { supabase } from '@/integrations/supabase/client'
import { cn } from '@/lib/utils'
import { GroupPaymentDialog } from './GroupPaymentDialog'
import { useUser } from '@/hooks/useUser'
import { useGroupCheckoutCalculations, GroupBookingCostData } from '@/hooks/useGroupCheckoutCalculations'
import { isEarlyCheckout, DamageChargeItem } from '@/lib/bookingCalculations'
import { DamageChargesSection } from './DamageChargesSection'
import { DamageReportDocument } from './DamageReportDocument'
import { 
  triggerRoomCheckoutNotification,
  sendPushNotification,
  createInAppNotification,
  sendTelegramNotification 
} from '@/hooks/useNotificationTriggers'
import { StaffDetailSheet } from '@/components/staff/StaffDetailSheet'
import { InspectionStatusCard } from './InspectionStatusCard'
import type { StaffWithStatus } from '@/hooks/useStaffStatus'

export interface GroupCheckoutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bookingGroupId: string
  tenantId: string
  hotelId: string
  onCheckoutComplete?: () => void
  onMinimize?: () => void
}

interface Phase1DamageData {
  lost_items?: Array<{ item_id: string; item_name: string; quantity: number; estimated_value: number }>
  damaged_items?: Array<{ item_id: string; item_name: string; quantity: number; damage_cost: number; damage_type?: string }>
  consumed_items?: Array<{ item_id: string; item_name: string; quantity: number }>
  lost_total?: number
  damaged_total?: number
}

interface InspectionStatus {
  bookingId: string
  roomId: string
  status: 'pending' | 'in_progress' | 'completed' | 'not_requested' | 'cancelled'
  damageCharge?: number
  inspectionId?: string
  startedAt?: string
  createdAt?: string
  assignedTo?: string
  phase1DamageData?: Phase1DamageData
}

// Late checkout tiers (same as CheckoutSummaryDialog)
const LATE_CHECKOUT_TIERS = [
  { id: 'before12', label: 'Trước 12:00', percent: 0, description: 'Miễn phí', minHour: 0, maxHour: 12 },
  { id: '12to15', label: '12:00 - 15:00', percent: 30, description: '', minHour: 12, maxHour: 15 },
  { id: '15to18', label: '15:00 - 18:00', percent: 50, description: '', minHour: 15, maxHour: 18 },
  { id: 'after18', label: 'Sau 18:00', percent: 100, description: '= 1 đêm', minHour: 18, maxHour: 24 },
]

export function GroupCheckoutDialog({
  open,
  onOpenChange,
  bookingGroupId,
  tenantId,
  hotelId,
  onCheckoutComplete,
  onMinimize,
}: GroupCheckoutDialogProps) {
  const queryClient = useQueryClient()
  const { user } = useUser()
  const { data: groupData, isLoading: isLoadingGroup } = useGroupBooking(bookingGroupId)
  const { data: staffList = [], isLoading: isLoadingStaff } = useOnShiftStaffList(hotelId)
  
  const {
    roomCosts,
    isCalculating,
    calculateAllCosts,
    adjustLateCharge,
    adjustDamageItemCharge,
    setDamageNote,
    resetCosts,
    getAggregatedTotals,
  } = useGroupCheckoutCalculations()
  
  const [isProcessing, setIsProcessing] = useState(false)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set())
  
  // Staff detail sheet state
  const [selectedStaffForDetail, setSelectedStaffForDetail] = useState<StaffWithStatus | null>(null)
  const [staffDetailOpen, setStaffDetailOpen] = useState(false)
  
  // Damage report
  const [showDamageReport, setShowDamageReport] = useState(false)
  const [selectedRoomForReport, setSelectedRoomForReport] = useState<string | null>(null)
  const reportRef = useRef<HTMLDivElement>(null)
  
  // Room selection state
  const [selectedRooms, setSelectedRooms] = useState<Set<string>>(new Set())
  
  // Staff assignments per booking
  const [staffAssignments, setStaffAssignments] = useState<Map<string, string>>(new Map())

  const currentHour = new Date().getHours()
  const activeTier = LATE_CHECKOUT_TIERS.find(
    tier => currentHour >= tier.minHour && currentHour < tier.maxHour
  )

  // Initialize selected rooms when groupData loads
  useEffect(() => {
    if (groupData?.bookings) {
      const checkedInRooms = groupData.bookings
        .filter(b => b.status === 'checked_in')
        .map(b => b.id)
      setSelectedRooms(new Set(checkedInRooms))
    }
  }, [groupData?.bookings])
  
  // Reset costs when dialog closes
  useEffect(() => {
    if (!open) {
      resetCosts()
      setExpandedRooms(new Set())
    }
  }, [open, resetCosts])

  // Auto-calculate costs when dialog opens and selectedRooms change
  useEffect(() => {
    if (!open || !groupData || selectedRooms.size === 0) return
    
    const bookingsToCalc: GroupBookingCostData[] = Array.from(selectedRooms)
      .map(bookingId => {
        const booking = groupData.bookings.find(b => b.id === bookingId)
        if (!booking || booking.status === 'checked_out') return null
        const checkIn = new Date(booking.check_in_date)
        const checkOut = new Date(booking.check_out_date)
        const nights = Math.max(1, differenceInDays(checkOut, checkIn))
        return {
          bookingId: booking.id,
          roomId: booking.room_id,
          roomNumber: booking.room?.room_number || '',
          bookingType: (booking.booking_type as 'daily' | 'hourly' | 'monthly') || 'daily',
          roomPrice: booking.room_price || 0,
          nights,
          hourlyRate: booking.hourly_rate ?? undefined,
          hours: booking.booking_hours ?? undefined,
          monthlyRate: booking.monthly_rate ?? undefined,
          months: booking.booking_months ?? undefined,
          totalAmount: booking.total_amount || 0,
          depositAmount: booking.deposit_amount || 0,
          amountPaid: booking.amount_paid || 0,
          checkInDate: checkIn,
          checkOutDate: checkOut,
        }
      })
      .filter(Boolean) as GroupBookingCostData[]
    
    if (bookingsToCalc.length > 0) {
      calculateAllCosts(bookingsToCalc)
    }
  }, [open, groupData, selectedRooms, calculateAllCosts])

  // Detect overdue rooms
  const overdueRooms = useMemo(() => {
    if (!groupData) return []
    const today = startOfDay(new Date())
    return groupData.bookings.filter(b => {
      if (b.status !== 'checked_in') return false
      const checkOutDate = startOfDay(new Date(b.check_out_date))
      return isAfter(today, checkOutDate)
    })
  }, [groupData])

  // Fetch inspection statuses
  const { data: inspectionStatuses, isLoading: isLoadingInspections, refetch: refetchInspections } = useQuery({
    queryKey: ['group-inspections', bookingGroupId],
    queryFn: async (): Promise<InspectionStatus[]> => {
      if (!groupData?.bookings) return []
      const bookingIds = groupData.bookings.map(b => b.id)
      
      const { data: inspections, error } = await supabase
        .from('checkout_inspection_requests')
        .select('*')
        .in('booking_id', bookingIds)
        .order('created_at', { ascending: false })

      if (error) throw error

      const roomCheckIds = inspections?.filter(i => i.room_check_id)?.map(i => i.room_check_id) || []
      let roomChecks: any[] | null = null
      if (roomCheckIds.length > 0) {
        const { data } = await supabase
          .from('room_checks')
          .select('id, room_id, items_lost, items_damaged, items_consumed')
          .in('id', roomCheckIds)
        roomChecks = data
      }
      if (!roomChecks || roomChecks.length === 0) {
        const { data } = await supabase
          .from('room_checks')
          .select('id, room_id, items_lost, items_damaged, items_consumed')
          .in('room_id', groupData.bookings.map(b => b.room_id))
          .in('check_type', ['checkout'])
          .order('checked_at', { ascending: false })
        roomChecks = data
      }

      return groupData.bookings.map(booking => {
        const inspection = inspections?.find(i => i.booking_id === booking.id)
        const roomCheck = roomChecks?.find(c => c.room_id === booking.room_id)
        
        let damageCharge = 0
        let phase1DamageData: Phase1DamageData | undefined
        
        if (roomCheck) {
          const lost = roomCheck.items_lost as any[] || []
          const damaged = roomCheck.items_damaged as any[] || []
          const consumed = roomCheck.items_consumed as any[] || []
          const lostTotal = lost.reduce((sum: number, item: any) => sum + (item.estimated_value || 0) * (item.quantity || 1), 0)
          const damagedTotal = damaged.reduce((sum: number, item: any) => sum + (item.damage_cost || 0) * (item.quantity || 1), 0)
          damageCharge = lostTotal + damagedTotal
          
          if (lost.length > 0 || damaged.length > 0 || consumed.length > 0) {
            phase1DamageData = {
              lost_items: lost.map((item: any) => ({ item_id: item.item_id || '', item_name: item.item_name || 'Không rõ', quantity: item.quantity || 1, estimated_value: item.estimated_value || 0 })),
              damaged_items: damaged.map((item: any) => ({ item_id: item.item_id || '', item_name: item.item_name || 'Không rõ', quantity: item.quantity || 1, damage_cost: item.damage_cost || 0, damage_type: item.damage_type })),
              consumed_items: consumed.map((item: any) => ({ item_id: item.item_id || '', item_name: item.item_name || 'Không rõ', quantity: item.quantity || 1 })),
              lost_total: lostTotal,
              damaged_total: damagedTotal,
            }
          }
        } else if (inspection?.phase1_damage_data) {
          const p1Data = inspection.phase1_damage_data as any as Phase1DamageData
          phase1DamageData = p1Data
          damageCharge = (p1Data.lost_total || 0) + (p1Data.damaged_total || 0)
        }

        if (!inspection) {
          return { bookingId: booking.id, roomId: booking.room_id, status: 'not_requested' as const, damageCharge }
        }

        const effectiveStatus = inspection.status === 'cancelled' ? 'not_requested' : inspection.status as 'pending' | 'in_progress' | 'completed'
        return {
          bookingId: booking.id,
          roomId: booking.room_id,
          status: effectiveStatus,
          inspectionId: inspection.status !== 'cancelled' ? inspection.id : undefined,
          startedAt: inspection.started_at,
          createdAt: inspection.created_at,
          assignedTo: inspection.assigned_to,
          damageCharge,
          phase1DamageData,
        }
      })
    },
    enabled: !!groupData?.bookings && open,
    refetchInterval: 10000,
  })

  // Fetch chargeable consumptions
  const { data: chargeableTotals, refetch: refetchChargeables } = useQuery({
    queryKey: ['group-chargeable-totals', bookingGroupId],
    queryFn: async (): Promise<Map<string, number>> => {
      if (!groupData?.bookings) return new Map()
      const bookingIds = groupData.bookings.map(b => b.id)
      const { data, error } = await supabase
        .from('chargeable_consumptions')
        .select('booking_id, total_amount')
        .in('booking_id', bookingIds)
      if (error) throw error
      const totalsMap = new Map<string, number>()
      for (const row of data || []) {
        const current = totalsMap.get(row.booking_id) || 0
        totalsMap.set(row.booking_id, current + (row.total_amount || 0))
      }
      return totalsMap
    },
    enabled: !!groupData?.bookings && open,
  })

  // Realtime subscriptions
  useEffect(() => {
    if (!groupData?.bookings || !open) return
    const bookingIds = groupData.bookings.map(b => b.id)
    const roomIds = groupData.bookings.map(b => b.room_id)
    
    const channel = supabase
      .channel(`group-inspections-realtime-${bookingGroupId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'checkout_inspection_requests', filter: `booking_id=in.(${bookingIds.join(',')})` }, () => {
        refetchInspections()
        queryClient.invalidateQueries({ queryKey: ['group-inspections', bookingGroupId] })
      })
      .subscribe()
    
    const roomChecksChannel = supabase
      .channel(`group-roomchecks-realtime-${bookingGroupId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'room_checks', filter: `room_id=in.(${roomIds.join(',')})` }, () => refetchInspections())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'room_checks', filter: `room_id=in.(${roomIds.join(',')})` }, () => refetchInspections())
      .subscribe()
    
    const chargeableChannel = supabase
      .channel(`group-chargeables-realtime-${bookingGroupId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chargeable_consumptions', filter: `booking_id=in.(${bookingIds.join(',')})` }, () => refetchChargeables())
      .subscribe()
    
    return () => {
      supabase.removeChannel(channel)
      supabase.removeChannel(roomChecksChannel)
      supabase.removeChannel(chargeableChannel)
    }
  }, [groupData?.bookings, bookingGroupId, open, refetchInspections, refetchChargeables, queryClient])

  const inspectionMap = useMemo(() => {
    return new Map(inspectionStatuses?.map(i => [i.bookingId, i]) || [])
  }, [inspectionStatuses])

  // Calculate totals for selected rooms
  const totals = useMemo(() => {
    if (!groupData || !inspectionStatuses) {
      return { roomTotal: 0, damageCharges: 0, serviceCharges: 0, lateCharges: 0, earlyCheckinCharges: 0, extraCharges: 0, totalPaid: 0, subtotal: 0, vatAmount: 0, serviceFeeAmount: 0, grandTotal: 0, remaining: 0, depositApplied: 0, holdingDeposit: 0, isLastCheckout: false }
    }

    const selectedBookings = groupData.bookings.filter(b => selectedRooms.has(b.id))
    const remainingBookings = groupData.bookings.filter(b => !selectedRooms.has(b.id) && b.status !== 'checked_out')
    
    let roomTotal = 0, damageCharges = 0, serviceCharges = 0, lateCharges = 0, earlyCheckinCharges = 0, extraCharges = 0, totalPaid = 0

    for (const b of selectedBookings) {
      const cost = roomCosts.get(b.id)
      if (cost) {
        roomTotal += cost.costBreakdown.roomTotal
        lateCharges += cost.adjustedLateCharge
        earlyCheckinCharges += cost.costBreakdown.earlyCheckinCharge || 0
        extraCharges += cost.costBreakdown.extraCharges || 0
        serviceCharges += cost.serviceCharges
        damageCharges += cost.adjustedDamageItems.reduce((s, i) => s + i.charge_amount * i.quantity, 0)
        totalPaid += cost.costBreakdown.amountPaid
      } else {
        roomTotal += b.total_amount || 0
        totalPaid += b.amount_paid || 0
        serviceCharges += chargeableTotals?.get(b.id) || 0
        const insp = inspectionMap.get(b.id)
        damageCharges += insp?.damageCharge || 0
      }
    }

    const isLastCheckout = remainingBookings.length === 0
    const depositApplied = isLastCheckout ? groupData.totalDeposit : 0
    const holdingDeposit = !isLastCheckout ? groupData.totalDeposit : 0
    
    const subtotal = roomTotal + damageCharges + serviceCharges + lateCharges + earlyCheckinCharges + extraCharges
    const vatRate = 0
    const serviceFeeRate = 0
    const vatAmount = Math.round(subtotal * vatRate / 100)
    const serviceFeeAmount = Math.round(subtotal * serviceFeeRate / 100)
    const grandTotal = subtotal + vatAmount + serviceFeeAmount
    const remaining = grandTotal - totalPaid - depositApplied

    return { roomTotal, damageCharges, serviceCharges, lateCharges, earlyCheckinCharges, extraCharges, totalPaid, subtotal, vatAmount, serviceFeeAmount, grandTotal, remaining, depositApplied, holdingDeposit, isLastCheckout }
  }, [groupData, inspectionStatuses, selectedRooms, inspectionMap, chargeableTotals, roomCosts])

  // Room stats
  const roomStats = useMemo(() => {
    if (!inspectionStatuses) return { ready: 0, inProgress: 0, pending: 0, needsRequest: 0 }
    const selectedInspections = inspectionStatuses.filter(i => selectedRooms.has(i.bookingId))
    return {
      ready: selectedInspections.filter(i => i.status === 'completed').length,
      inProgress: selectedInspections.filter(i => i.status === 'in_progress').length,
      pending: selectedInspections.filter(i => i.status === 'pending').length,
      needsRequest: selectedInspections.filter(i => i.status === 'not_requested').length,
    }
  }, [inspectionStatuses, selectedRooms])

  // Handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked && groupData) {
      const checkedInRooms = groupData.bookings.filter(b => b.status === 'checked_in').map(b => b.id)
      setSelectedRooms(new Set(checkedInRooms))
    } else {
      setSelectedRooms(new Set())
    }
  }

  const handleRoomSelect = (bookingId: string, checked: boolean) => {
    const newSelected = new Set(selectedRooms)
    if (checked) {
      newSelected.add(bookingId)
    } else {
      newSelected.delete(bookingId)
      const newAssignments = new Map(staffAssignments)
      newAssignments.delete(bookingId)
      setStaffAssignments(newAssignments)
    }
    setSelectedRooms(newSelected)
  }

  const handleStaffChange = (bookingId: string, staffId: string) => {
    const newAssignments = new Map(staffAssignments)
    newAssignments.set(bookingId, staffId)
    setStaffAssignments(newAssignments)
  }

  const toggleRoomExpand = (bookingId: string) => {
    setExpandedRooms(prev => {
      const newSet = new Set(prev)
      if (newSet.has(bookingId)) newSet.delete(bookingId)
      else newSet.add(bookingId)
      return newSet
    })
  }

  // Check if a booking is early checkout
  const isBookingEarlyCheckout = useCallback((booking: GroupBookingRoom) => {
    if ((booking.booking_type || 'daily') !== 'daily') return false
    const scheduledDate = new Date(booking.check_out_date)
    return isEarlyCheckout(new Date(), scheduledDate)
  }, [])

  // Batch send inspection requests
  const handleBatchInspectionRequest = async () => {
    const roomsToRequest = Array.from(selectedRooms).filter(bookingId => {
      const inspection = inspectionMap.get(bookingId)
      return !inspection || inspection.status === 'not_requested'
    })
    
    const missingStaff = roomsToRequest.filter(id => !staffAssignments.get(id))
    if (missingStaff.length > 0) {
      const booking = groupData?.bookings.find(b => b.id === missingStaff[0])
      toast.error(`Chưa chọn nhân viên cho phòng ${booking?.room?.room_number}`)
      return
    }
    
    if (roomsToRequest.length === 0) {
      toast.info('Tất cả phòng đã được gửi yêu cầu kiểm tra')
      return
    }
    
    setIsProcessing(true)
    try {
      for (const bookingId of roomsToRequest) {
        const booking = groupData?.bookings.find(b => b.id === bookingId)
        const staffId = staffAssignments.get(bookingId)
        if (!booking || !staffId) continue
        
        const { data: inspectionData, error: inspectionError } = await supabase
          .from('checkout_inspection_requests')
          .insert({
            tenant_id: tenantId,
            hotel_id: hotelId,
            room_id: booking.room_id,
            booking_id: bookingId,
            assigned_to: staffId,
            requested_by: user?.id,
            status: 'pending',
          })
          .select('id')
          .single()

        if (inspectionError) continue
        
        await supabase.from('housekeeping_tasks').insert({
          tenant_id: tenantId,
          hotel_id: hotelId,
          room_id: booking.room_id,
          booking_id: bookingId,
          assigned_to: staffId,
          requested_by: user?.id,
          task_type: 'checkout_inspection',
          title: `Kiểm tra checkout P.${booking.room?.room_number}`,
          priority: 'high',
          status: 'pending',
          checkout_inspection_id: inspectionData.id,
        })
        
        const staff = staffList.find(s => s.id === staffId)
        const staffName = staff?.full_name || 'Nhân viên'
        const roomNumber = booking.room?.room_number || ''
        const guestName = booking.guest_name
        
        await Promise.all([
          sendPushNotification({ userId: staffId, tenantId, title: `Yêu cầu kiểm tra phòng ${roomNumber}`, body: `Khách ${guestName} sắp checkout. Vui lòng kiểm tra phòng.`, actionUrl: `/my-tasks`, notificationType: 'room_checkout' }),
          createInAppNotification({ userId: staffId, tenantId, title: `Yêu cầu kiểm tra phòng ${roomNumber}`, body: `Khách ${guestName} sắp checkout. Vui lòng kiểm tra phòng.`, type: 'room_checkout', actionUrl: `/my-tasks` }),
          sendTelegramNotification({ tenantId, hotelId, userIds: [staffId], title: `🔍 Yêu cầu kiểm tra phòng ${roomNumber}`, message: `Khách: ${guestName}\nVui lòng kiểm tra phòng trước khi checkout.`, notificationType: 'checkout', actionUrl: `/my-tasks` }),
          sendTelegramNotification({ tenantId, hotelId, sendToStaffGroups: true, title: `🔍 Yêu cầu kiểm tra phòng ${roomNumber}`, message: `Khách: ${guestName}\n👤 Giao cho: ${staffName}`, notificationType: 'checkout', actionUrl: `/my-tasks` }),
        ])
      }
      
      toast.success(`Đã gửi ${roomsToRequest.length} yêu cầu kiểm tra`)
      refetchInspections()
    } catch (error) {
      console.error('Error sending inspection requests:', error)
      toast.error('Lỗi gửi yêu cầu kiểm tra')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCancelInspection = async (inspectionId: string) => {
    try {
      const { error } = await supabase
        .from('checkout_inspection_requests')
        .update({ status: 'cancelled' })
        .eq('id', inspectionId)
      if (error) throw error
      toast.success('Đã hủy yêu cầu kiểm tra')
      refetchInspections()
    } catch (error) {
      toast.error('Lỗi hủy yêu cầu kiểm tra')
    }
  }

  // Check if adjustments are valid (notes required when reducing charges)
  const hasInvalidAdjustments = useMemo(() => {
    for (const bookingId of selectedRooms) {
      const cost = roomCosts.get(bookingId)
      if (!cost) continue
      const booking = groupData?.bookings.find(b => b.id === bookingId)
      if (!booking) continue
      
      // Late charge needs note when reduced
      if ((booking.booking_type || 'daily') === 'daily' && cost.adjustedLateCharge < cost.lateCheckoutCharge && !cost.lateAdjustmentNote.trim()) {
        return true
      }
      // Damage needs note when reduced
      const currentDamageTotal = cost.adjustedDamageItems.reduce((s, i) => s + i.charge_amount * i.quantity, 0)
      if (currentDamageTotal < cost.originalDamageTotal && !cost.damageAdjustmentNote.trim()) {
        return true
      }
    }
    return false
  }, [selectedRooms, roomCosts, groupData])

  // Direct checkout (no payment dialog)
  const handleDirectCheckout = async () => {
    if (!groupData) return
    const readyRooms = Array.from(selectedRooms).filter(bookingId => {
      const booking = groupData.bookings.find(b => b.id === bookingId)
      if (!booking || booking.status === 'checked_out') return false
      const inspection = inspectionMap.get(bookingId)
      return inspection?.status === 'completed' || inspection?.status === 'not_requested'
    })
    
    if (readyRooms.length === 0) {
      toast.error('Không có phòng nào sẵn sàng checkout')
      return
    }
    
    await performCheckout(readyRooms)
  }

  // Pay then checkout
  const handlePayAndCheckout = () => {
    if (totals.remaining > 0) {
      setShowPaymentDialog(true)
    } else {
      handleDirectCheckout()
    }
  }

  // Actual checkout logic using RPC
  const performCheckout = async (bookingIds: string[]) => {
    if (!groupData) return
    
    setIsProcessing(true)
    try {
      for (const bookingId of bookingIds) {
        const booking = groupData.bookings.find(b => b.id === bookingId)
        if (!booking || booking.status === 'checked_out') continue
        
        const cost = roomCosts.get(bookingId)
        const lateCharge = cost?.adjustedLateCharge || 0
        const serviceCharges = cost?.serviceCharges || 0
        const damageCharges = cost?.adjustedDamageItems.reduce((s, i) => s + i.charge_amount * i.quantity, 0) || 0
        const costBreakdown = cost?.costBreakdown
        
        const allNotes: string[] = []
        if (cost?.lateAdjustmentNote) allNotes.push(`[Phụ thu: ${cost.lateAdjustmentNote}]`)
        if (cost?.damageAdjustmentNote) allNotes.push(`[Đền bù: ${cost.damageAdjustmentNote}]`)
        const damageNotesStr = allNotes.join(' | ') || null
        
        const { error } = await supabase.rpc('perform_checkout', {
          p_booking_id: bookingId,
          p_room_id: booking.room_id,
          p_late_checkout_charge: lateCharge,
          p_service_charges: serviceCharges,
          p_subtotal: costBreakdown?.subtotal || 0,
          p_vat_amount: costBreakdown?.vatAmount || 0,
          p_service_fee_amount: costBreakdown?.serviceFeeAmount || 0,
          p_total_amount: costBreakdown?.totalAmount || booking.total_amount || 0,
          p_damage_charges: damageCharges,
          p_damage_notes: damageNotesStr,
          p_damage_items: JSON.stringify(cost?.adjustedDamageItems || []),
          p_new_amount_paid: booking.amount_paid || 0,
        })
        
        if (error) throw error
        
        if (allNotes.length > 0) {
          const existingNotes = booking.notes || ''
          const updateNotes = existingNotes ? `${existingNotes}\n${allNotes.join('\n')}` : allNotes.join('\n')
          await supabase.from('room_bookings').update({ notes: updateNotes }).eq('id', bookingId)
        }
          
        const inspection = inspectionMap.get(bookingId)
        if (inspection?.inspectionId) {
          await supabase.from('checkout_inspection_requests').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', inspection.inspectionId)
        }
        
        if (tenantId && hotelId) {
          triggerRoomCheckoutNotification({ tenantId, hotelId, roomId: booking.room_id, roomNumber: booking.room?.room_number || '' }).catch(console.error)
        }
      }
      
      toast.success(`Đã checkout ${bookingIds.length} phòng thành công!`)
      
      const allRoomsNowDone = groupData.bookings.every(b => b.status === 'checked_out' || bookingIds.includes(b.id))
      if (allRoomsNowDone) {
        onOpenChange(false)
        onCheckoutComplete?.()
      }
      
      queryClient.invalidateQueries({ queryKey: ['all-bookings'] })
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      queryClient.invalidateQueries({ queryKey: ['group-booking', bookingGroupId] })
    } catch (error) {
      console.error('Error performing checkout:', error)
      toast.error('Lỗi checkout')
    } finally {
      setIsProcessing(false)
    }
  }

  // Print damage report
  const handlePrintReport = (bookingId: string) => {
    setSelectedRoomForReport(bookingId)
    setShowDamageReport(true)
    setTimeout(() => {
      if (reportRef.current) {
        const printWindow = window.open('', '_blank')
        if (printWindow) {
          printWindow.document.write('<html><head><title>Biên bản thiệt hại</title>')
          printWindow.document.write('<style>body { font-family: Arial, sans-serif; } table { border-collapse: collapse; width: 100%; } th, td { border: 1px solid #ccc; padding: 8px; }</style>')
          printWindow.document.write('</head><body>')
          printWindow.document.write(reportRef.current.innerHTML)
          printWindow.document.write('</body></html>')
          printWindow.document.close()
          printWindow.print()
        }
      }
      setShowDamageReport(false)
      setSelectedRoomForReport(null)
    }, 100)
  }

  const getInspectionStatusBadge = (status: InspectionStatus['status']) => {
    switch (status) {
      case 'completed':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs"><CheckCircle className="h-3 w-3 mr-1" />Đã kiểm tra</Badge>
      case 'in_progress':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs"><Clock className="h-3 w-3 mr-1 animate-pulse" />Đang kiểm tra</Badge>
      case 'pending':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs"><Clock className="h-3 w-3 mr-1" />Chờ kiểm tra</Badge>
      default:
        return <span className="text-xs text-muted-foreground">Chưa gửi yêu cầu</span>
    }
  }

  const checkedInRooms = groupData?.bookings.filter(b => b.status === 'checked_in') || []
  const allSelected = selectedRooms.size === checkedInRooms.length && checkedInRooms.length > 0

  if (isLoadingGroup) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (!groupData) return null

  // Get report data for printing
  const reportBooking = selectedRoomForReport ? groupData.bookings.find(b => b.id === selectedRoomForReport) : null
  const reportCost = selectedRoomForReport ? roomCosts.get(selectedRoomForReport) : null

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          {/* Header */}
          <DialogHeader className="px-4 pt-4 pb-2">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2 text-base">
                <DoorOpen className="h-4 w-4" />
                Checkout nhóm - {groupData.guestName} ({groupData.roomCount} phòng)
              </DialogTitle>
              {onMinimize && (
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onMinimize}>
                  <Minimize2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            {groupData.roomsCheckedOut > 0 && (
              <p className="text-xs text-muted-foreground">{groupData.roomsCheckedOut} phòng đã trả</p>
            )}
          </DialogHeader>

          <ScrollArea className="flex-1 overflow-auto">
            <div className="flex flex-col gap-3 px-4 pb-4">
              {/* Select All */}
              {checkedInRooms.length > 0 && (
                <div className="flex items-center gap-2 pb-1">
                  <Checkbox id="select-all" checked={allSelected} onCheckedChange={handleSelectAll} />
                  <Label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                    Chọn tất cả ({checkedInRooms.length} phòng đang ở)
                  </Label>
                </div>
              )}
              
              {/* Overdue Warning */}
              {overdueRooms.length > 0 && (
                <div className="flex items-start gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-red-700">
                    <span className="font-medium">{overdueRooms.length} phòng quá hạn checkout:</span>{' '}
                    {overdueRooms.map(b => `P.${b.room?.room_number}`).join(', ')}. Chi phí sẽ được tính đến ngày hôm nay.
                  </div>
                </div>
              )}

              {/* Room List - Collapsible per room */}
              <div className="space-y-2">
                {groupData.bookings.map((booking) => {
                  const inspection = inspectionMap.get(booking.id)
                  const isCheckedOut = booking.status === 'checked_out'
                  const isSelected = selectedRooms.has(booking.id)
                  const assignedStaff = staffAssignments.get(booking.id)
                  const needsStaffAssignment = isSelected && !isCheckedOut && (!inspection || inspection.status === 'not_requested')
                  const isExpanded = expandedRooms.has(booking.id)
                  const cost = roomCosts.get(booking.id)
                  const bookingType = (booking.booking_type as 'daily' | 'hourly' | 'monthly') || 'daily'
                  const isEarly = isBookingEarlyCheckout(booking)
                  const checkIn = new Date(booking.check_in_date)
                  const checkOut = new Date(booking.check_out_date)
                  const nights = Math.max(1, differenceInDays(checkOut, checkIn))
                  const roomSubtotal = cost?.costBreakdown.totalAmount || booking.total_amount || 0
                  
                  return (
                    <div
                      key={booking.id}
                      className={cn(
                        "border rounded-lg overflow-hidden transition-colors",
                        isCheckedOut && "bg-muted/50 opacity-60",
                        isSelected && !isCheckedOut && "border-blue-200"
                      )}
                    >
                      {/* Room Header */}
                      <div className="flex items-start gap-3 p-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => handleRoomSelect(booking.id, !!checked)}
                          disabled={isCheckedOut}
                          className="mt-0.5"
                        />
                        
                        <Collapsible open={isExpanded} onOpenChange={() => !isCheckedOut && toggleRoomExpand(booking.id)} className="flex-1">
                          <CollapsibleTrigger asChild>
                            <div className="flex items-center justify-between cursor-pointer hover:bg-muted/30 -mx-1 px-1 rounded">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">P.{booking.room?.room_number}</span>
                                <span className="text-xs text-muted-foreground capitalize">{bookingType === 'daily' ? 'Ngày' : bookingType === 'hourly' ? 'Giờ' : 'Tháng'}</span>
                                {isCheckedOut ? (
                                  <Badge variant="secondary" className="text-xs">Đã trả</Badge>
                                ) : (
                                  getInspectionStatusBadge(inspection?.status || 'not_requested')
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm">{formatVNCurrency(roomSubtotal)}</span>
                                {!isCheckedOut && (isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
                              </div>
                            </div>
                          </CollapsibleTrigger>
                          
                          {/* Expanded Room Detail - like single checkout */}
                          <CollapsibleContent>
                            {!isCheckedOut && (
                              <div className="mt-3 space-y-3 border-t pt-3">
                                {/* Staff Assignment */}
                                {needsStaffAssignment && (
                                  <div className="flex items-center gap-2">
                                    <Label className="text-xs text-muted-foreground whitespace-nowrap">NV kiểm tra:</Label>
                                    <Select value={assignedStaff || ''} onValueChange={(value) => handleStaffChange(booking.id, value)}>
                                      <SelectTrigger className="h-8 text-xs flex-1">
                                        <SelectValue placeholder="Chọn nhân viên..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {staffList.map(staff => (
                                          <SelectItem key={staff.id} value={staff.id}>
                                            <div className="flex items-center gap-2">
                                              <Avatar className="h-5 w-5">
                                                <AvatarImage src={staff.avatar_url || undefined} />
                                                <AvatarFallback className="text-xs">{staff.full_name?.[0]}</AvatarFallback>
                                              </Avatar>
                                              <span>{staff.full_name}</span>
                                            </div>
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                )}
                                
                                {/* Inspection Status Card */}
                                {isSelected && inspection && ['pending', 'in_progress', 'completed'].includes(inspection.status) && (
                                  <InspectionStatusCard
                                    inspection={inspection}
                                    staffList={staffList}
                                    onViewDetail={(staff) => {
                                      setSelectedStaffForDetail(staff as StaffWithStatus)
                                      setStaffDetailOpen(true)
                                    }}
                                    onCancelInspection={handleCancelInspection}
                                    isProcessing={isProcessing}
                                  />
                                )}

                                {/* Late Checkout Tiers - only for daily */}
                                {bookingType === 'daily' && (
                                  <>
                                    {isEarly ? (
                                      <div className="p-2 bg-green-50 border border-green-200 rounded-lg">
                                        <div className="flex items-center gap-2 text-green-700 text-xs">
                                          <Check className="h-3.5 w-3.5" />
                                          <span className="font-medium">Checkout sớm - Không phụ thu</span>
                                        </div>
                                      </div>
                                    ) : currentHour <= 12 ? (
                                      <div className="p-2 bg-green-50 border border-green-200 rounded-lg">
                                        <div className="flex items-center gap-2 text-green-700 text-xs">
                                          <Check className="h-3.5 w-3.5" />
                                          <span className="font-medium">Checkout đúng giờ</span>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="border rounded-lg overflow-hidden">
                                        <div className="bg-muted/50 px-3 py-1.5 text-xs font-medium">
                                          PHỤ THU CHECK-OUT TRỄ (tiêu chuẩn: 12:00)
                                        </div>
                                        <div className="divide-y">
                                          {LATE_CHECKOUT_TIERS.map((tier) => {
                                            const isActive = tier.id === activeTier?.id
                                            const tierAmount = Math.round((booking.room_price || 0) * tier.percent / 100)
                                            return (
                                              <div key={tier.id} className={cn("flex items-center justify-between px-3 py-1.5 text-xs", isActive && "bg-amber-50 border-l-2 border-l-amber-500")}>
                                                <div className="flex items-center gap-2">
                                                  {isActive && <Check className="h-3 w-3 text-amber-600" />}
                                                  <span className={cn(isActive && "font-medium")}>{tier.label}</span>
                                                  {tier.description && <span className="text-muted-foreground">({tier.description})</span>}
                                                </div>
                                                <span className={cn("font-mono", isActive && "font-medium text-amber-600")}>
                                                  {tier.percent}% = {formatVNCurrency(tierAmount)}
                                                </span>
                                              </div>
                                            )
                                          })}
                                        </div>
                                      </div>
                                    )}
                                  </>
                                )}

                                {/* Cost Breakdown */}
                                <div className="space-y-1.5 text-sm">
                                  <h4 className="font-medium text-xs text-muted-foreground uppercase">Chi tiết thanh toán</h4>
                                  
                                  {/* Room charges by type */}
                                  {bookingType === 'hourly' ? (
                                    <div className="flex justify-between text-xs">
                                      <span className="text-muted-foreground">Tiền phòng ({booking.booking_hours || 0} giờ × {formatVNCurrency(booking.hourly_rate || 0)})</span>
                                      <span className="font-mono">{formatVNCurrency(cost?.costBreakdown.roomTotal || 0)}</span>
                                    </div>
                                  ) : bookingType === 'monthly' ? (
                                    <>
                                      <div className="flex justify-between text-xs">
                                        <span className="text-muted-foreground">Tiền phòng ({booking.booking_months || 0} tháng × {formatVNCurrency(booking.monthly_rate || 0)})</span>
                                        <span className="font-mono">{formatVNCurrency(cost?.costBreakdown.roomTotal || 0)}</span>
                                      </div>
                                      {cost?.costBreakdown.monthlyDiscount && cost.costBreakdown.monthlyDiscount > 0 && (
                                        <div className="flex justify-between text-xs text-green-600">
                                          <span>Chiết khấu dài hạn</span>
                                          <span>-{formatVNCurrency(cost.costBreakdown.monthlyDiscount)}</span>
                                        </div>
                                      )}
                                    </>
                                  ) : (
                                    <div className="flex justify-between text-xs">
                                      <span className="text-muted-foreground">Tiền phòng ({nights} đêm × {formatVNCurrency(booking.room_price || 0)})</span>
                                      <span className="font-mono">{formatVNCurrency(cost?.costBreakdown.roomTotal || 0)}</span>
                                    </div>
                                  )}
                                  
                                  {/* Early checkin surcharge */}
                                  {cost && (cost.costBreakdown.earlyCheckinCharge || 0) > 0 && (
                                    <div className="flex justify-between text-xs">
                                      <span className="text-muted-foreground">Phụ thu check-in sớm</span>
                                      <span className="font-mono">{formatVNCurrency(cost.costBreakdown.earlyCheckinCharge)}</span>
                                    </div>
                                  )}

                                  {/* Editable late checkout charge - daily */}
                                  {bookingType === 'daily' && !isEarly && currentHour > 12 && cost && cost.lateCheckoutCharge > 0 && (
                                    <div className="p-2 bg-amber-50/50 rounded border border-amber-200 space-y-2">
                                      <div className="flex items-center justify-between">
                                        <Label className="text-xs text-amber-700">Phụ thu checkout trễ ({activeTier?.percent || 0}%)</Label>
                                        <div className="flex items-center gap-1">
                                          <Input
                                            type="text"
                                            inputMode="numeric"
                                            className="w-24 h-7 text-right font-mono text-xs"
                                            value={cost.adjustedLateCharge > 0 ? cost.adjustedLateCharge.toString() : ''}
                                            onChange={(e) => {
                                              const value = e.target.value.replace(/[^0-9]/g, '')
                                              adjustLateCharge(booking.id, parseInt(value) || 0, cost.lateAdjustmentNote)
                                            }}
                                            placeholder="0"
                                          />
                                          <span className="text-xs text-muted-foreground">đ</span>
                                        </div>
                                      </div>
                                      <div className="flex gap-1">
                                        <Button type="button" variant="ghost" size="sm" onClick={() => adjustLateCharge(booking.id, 0, cost.lateAdjustmentNote)} className="h-6 text-xs text-green-600" disabled={cost.adjustedLateCharge === 0}>
                                          Miễn phí
                                        </Button>
                                        {cost.adjustedLateCharge !== cost.lateCheckoutCharge && (
                                          <Button type="button" variant="ghost" size="sm" onClick={() => adjustLateCharge(booking.id, cost.lateCheckoutCharge, '')} className="h-6 text-xs">
                                            Theo chuẩn
                                          </Button>
                                        )}
                                      </div>
                                      {cost.adjustedLateCharge < cost.lateCheckoutCharge && (
                                        <div className="space-y-1">
                                          <Textarea
                                            placeholder="Lý do điều chỉnh phụ thu..."
                                            className="h-10 text-xs"
                                            value={cost.lateAdjustmentNote}
                                            onChange={(e) => adjustLateCharge(booking.id, cost.adjustedLateCharge, e.target.value)}
                                          />
                                          {!cost.lateAdjustmentNote.trim() && (
                                            <p className="text-xs text-destructive">Vui lòng nhập lý do</p>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Editable hourly overtime */}
                                  {bookingType === 'hourly' && cost && cost.adjustedLateCharge > 0 && (
                                    <div className="p-2 bg-amber-50/50 rounded border border-amber-200 space-y-2">
                                      <div className="flex items-center justify-between">
                                        <Label className="text-xs text-amber-700">Phí vượt giờ</Label>
                                        <div className="flex items-center gap-1">
                                          <Input
                                            type="text"
                                            inputMode="numeric"
                                            className="w-24 h-7 text-right font-mono text-xs"
                                            value={cost.adjustedLateCharge > 0 ? cost.adjustedLateCharge.toString() : ''}
                                            onChange={(e) => {
                                              const value = e.target.value.replace(/[^0-9]/g, '')
                                              adjustLateCharge(booking.id, parseInt(value) || 0, cost.lateAdjustmentNote)
                                            }}
                                            placeholder="0"
                                          />
                                          <span className="text-xs text-muted-foreground">đ</span>
                                        </div>
                                      </div>
                                      <Button type="button" variant="ghost" size="sm" onClick={() => adjustLateCharge(booking.id, 0, cost.lateAdjustmentNote)} className="h-6 text-xs text-green-600" disabled={cost.adjustedLateCharge === 0}>
                                        Miễn phí
                                      </Button>
                                    </div>
                                  )}

                                  {/* Service charges */}
                                  {cost && cost.serviceCharges > 0 && (
                                    <div className="flex justify-between text-xs">
                                      <span className="text-muted-foreground">Dịch vụ sử dụng</span>
                                      <span className="font-mono">{formatVNCurrency(cost.serviceCharges)}</span>
                                    </div>
                                  )}

                                  {/* Extra charges */}
                                  {cost && (cost.costBreakdown.extraCharges || 0) > 0 && (
                                    <div className="flex justify-between text-xs">
                                      <span className="text-muted-foreground">Chi phí khác</span>
                                      <span className="font-mono">{formatVNCurrency(cost.costBreakdown.extraCharges)}</span>
                                    </div>
                                  )}

                                  {/* Damage Charges Section */}
                                  {cost && cost.adjustedDamageItems.length > 0 && (
                                    <>
                                      <Separator />
                                      <DamageChargesSection
                                        damageItems={cost.adjustedDamageItems}
                                        originalItems={cost.damageItems}
                                        onAdjustCharge={(itemId, newCharge) => adjustDamageItemCharge(booking.id, itemId, newCharge)}
                                        onWaiveItem={(itemId) => adjustDamageItemCharge(booking.id, itemId, 0)}
                                        onResetItem={(itemId) => {
                                          const original = cost.damageItems.find(i => i.item_id === itemId)
                                          if (original) adjustDamageItemCharge(booking.id, itemId, original.charge_amount)
                                        }}
                                      />
                                      {/* Damage note */}
                                      {(() => {
                                        const currentDamageTotal = cost.adjustedDamageItems.reduce((s, i) => s + i.charge_amount * i.quantity, 0)
                                        if (currentDamageTotal < cost.originalDamageTotal) {
                                          return (
                                            <div className="space-y-1">
                                              <Textarea
                                                placeholder="Lý do điều chỉnh phí đền bù..."
                                                className="h-10 text-xs"
                                                value={cost.damageAdjustmentNote}
                                                onChange={(e) => setDamageNote(booking.id, e.target.value)}
                                              />
                                              {!cost.damageAdjustmentNote.trim() && (
                                                <p className="text-xs text-destructive">Vui lòng nhập lý do</p>
                                              )}
                                            </div>
                                          )
                                        }
                                        return null
                                      })()}
                                      <Button type="button" variant="outline" size="sm" onClick={() => handlePrintReport(booking.id)} className="w-full gap-2 h-7 text-xs">
                                        <Printer className="h-3.5 w-3.5" />
                                        In biên bản
                                      </Button>
                                    </>
                                  )}

                                  <Separator />

                                  {/* Room subtotal */}
                                  {cost && (
                                    <>
                                      <div className="flex justify-between text-xs">
                                        <span className="text-muted-foreground">Subtotal</span>
                                        <span className="font-mono">{formatVNCurrency(cost.costBreakdown.subtotal)}</span>
                                      </div>
                                      {cost.costBreakdown.vatAmount > 0 && (
                                        <div className="flex justify-between text-xs">
                                          <span className="text-muted-foreground">VAT ({cost.costBreakdown.vatRate}%)</span>
                                          <span className="font-mono">{formatVNCurrency(cost.costBreakdown.vatAmount)}</span>
                                        </div>
                                      )}
                                      {cost.costBreakdown.serviceFeeAmount > 0 && (
                                        <div className="flex justify-between text-xs">
                                          <span className="text-muted-foreground">Phí dịch vụ</span>
                                          <span className="font-mono">{formatVNCurrency(cost.costBreakdown.serviceFeeAmount)}</span>
                                        </div>
                                      )}
                                      <div className="flex justify-between font-medium text-xs">
                                        <span>Tổng phòng này</span>
                                        <span className="font-mono">{formatVNCurrency(cost.costBreakdown.totalAmount)}</span>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            )}
                          </CollapsibleContent>
                        </Collapsible>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Batch Inspection Request Button */}
              {roomStats.needsRequest > 0 && selectedRooms.size > 0 && (
                <Button type="button" variant="outline" className="w-full" onClick={handleBatchInspectionRequest} disabled={isProcessing}>
                  {isProcessing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                  Gửi yêu cầu kiểm tra ({roomStats.needsRequest} phòng)
                </Button>
              )}

              {/* Progress Warning */}
              {(roomStats.inProgress > 0 || roomStats.pending > 0) && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                  <span className="text-xs text-amber-700">
                    {roomStats.inProgress > 0 && `${roomStats.inProgress} đang kiểm tra`}
                    {roomStats.inProgress > 0 && roomStats.pending > 0 && ', '}
                    {roomStats.pending > 0 && `${roomStats.pending} chờ kiểm tra`}
                    . Có thể checkout sau khi hoàn thành.
                  </span>
                </div>
              )}

              <Separator />

              {/* === TỔNG HỢP === */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <CreditCard className="h-4 w-4" />
                  Tổng hợp thanh toán ({selectedRooms.size} phòng)
                </div>

                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tiền phòng</span>
                    <span className="font-mono">{formatVNCurrency(totals.roomTotal)}</span>
                  </div>
                  
                  {totals.earlyCheckinCharges > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Phụ thu check-in sớm</span>
                      <span className="font-mono text-amber-600">+{formatVNCurrency(totals.earlyCheckinCharges)}</span>
                    </div>
                  )}
                  
                  {totals.lateCharges > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Phụ thu checkout trễ</span>
                      <span className="font-mono text-amber-600">+{formatVNCurrency(totals.lateCharges)}</span>
                    </div>
                  )}
                  
                  {totals.damageCharges > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Phí đền bù thiệt hại</span>
                      <span className="font-mono text-red-600">+{formatVNCurrency(totals.damageCharges)}</span>
                    </div>
                  )}
                  
                  {totals.serviceCharges > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Dịch vụ sử dụng</span>
                      <span className="font-mono">+{formatVNCurrency(totals.serviceCharges)}</span>
                    </div>
                  )}
                  
                  {totals.extraCharges > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Chi phí khác</span>
                      <span className="font-mono">+{formatVNCurrency(totals.extraCharges)}</span>
                    </div>
                  )}

                  <Separator className="my-1" />
                  
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-mono">{formatVNCurrency(totals.subtotal)}</span>
                  </div>
                  
                  {totals.vatAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">VAT</span>
                      <span className="font-mono">{formatVNCurrency(totals.vatAmount)}</span>
                    </div>
                  )}
                  
                  {totals.serviceFeeAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Phí dịch vụ</span>
                      <span className="font-mono">{formatVNCurrency(totals.serviceFeeAmount)}</span>
                    </div>
                  )}

                  <Separator className="my-1" />
                  
                  <div className="flex justify-between font-bold">
                    <span>TỔNG CỘNG</span>
                    <span className="font-mono">{formatVNCurrency(totals.grandTotal)}</span>
                  </div>
                  
                  {totals.depositApplied > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Tiền đặt cọc</span>
                      <span className="font-mono">-{formatVNCurrency(totals.depositApplied)}</span>
                    </div>
                  )}
                  
                  {totals.holdingDeposit > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        Tiền cọc (giữ)
                        <span className="text-xs">(còn {groupData.roomsRemaining - selectedRooms.size} phòng)</span>
                      </span>
                      <span className="font-mono text-amber-600">{formatVNCurrency(totals.holdingDeposit)}</span>
                    </div>
                  )}
                  
                  {totals.totalPaid > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Đã thanh toán</span>
                      <span className="font-mono">-{formatVNCurrency(totals.totalPaid)}</span>
                    </div>
                  )}

                  <Separator className="my-1" />
                  
                  <div className={cn("flex justify-between font-bold text-lg", totals.remaining > 0 ? "text-red-600" : "text-green-600")}>
                    <span>CÒN LẠI</span>
                    <span className="font-mono">{formatVNCurrency(Math.max(0, totals.remaining))}</span>
                  </div>
                </div>
              </div>

              {/* Warning if unpaid */}
              {totals.remaining > 0 && (
                <div className="flex items-start gap-2 p-2 bg-amber-50 border border-amber-200 rounded-md">
                  <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">
                    Khách chưa thanh toán đầy đủ. Vui lòng thu tiền trước khi cho trả phòng hoặc xác nhận checkout với số nợ.
                  </p>
                </div>
              )}

              {/* Footer Actions */}
              <div className="flex flex-col sm:flex-row gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                  Hủy
                </Button>
                {onMinimize && (
                  <Button type="button" variant="outline" size="sm" onClick={onMinimize}>
                    <Minimize2 className="h-4 w-4 mr-1.5" />
                    Thu nhỏ
                  </Button>
                )}
                
                {totals.remaining > 0 ? (
                  <>
                    <Button
                      variant="outline"
                      className="flex-1"
                      disabled={isProcessing || isCalculating || selectedRooms.size === 0 || hasInvalidAdjustments}
                      onClick={handleDirectCheckout}
                    >
                      {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Cho trả phòng (nợ {formatVNCurrency(totals.remaining)})
                    </Button>
                    <Button
                      className="flex-1"
                      disabled={isProcessing || isCalculating || selectedRooms.size === 0 || hasInvalidAdjustments}
                      onClick={handlePayAndCheckout}
                    >
                      {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      <CreditCard className="h-4 w-4 mr-1.5" />
                      Thu tiền & Trả phòng
                    </Button>
                  </>
                ) : (
                  <Button
                    className="flex-1"
                    disabled={isProcessing || isCalculating || selectedRooms.size === 0 || hasInvalidAdjustments}
                    onClick={handleDirectCheckout}
                  >
                    {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    <CheckCircle2 className="h-4 w-4 mr-1.5" />
                    Xác nhận Checkout ({selectedRooms.size} phòng)
                  </Button>
                )}
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <GroupPaymentDialog
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
        bookingGroupId={bookingGroupId}
        tenantId={tenantId}
        hotelId={hotelId}
        onPaymentComplete={() => {
          setShowPaymentDialog(false)
          queryClient.invalidateQueries({ queryKey: ['group-booking', bookingGroupId] })
          // Auto checkout after payment
          const readyRooms = Array.from(selectedRooms).filter(bookingId => {
            const booking = groupData.bookings.find(b => b.id === bookingId)
            if (!booking || booking.status === 'checked_out') return false
            const inspection = inspectionMap.get(bookingId)
            return inspection?.status === 'completed' || inspection?.status === 'not_requested'
          })
          if (readyRooms.length > 0) {
            performCheckout(readyRooms)
          }
        }}
      />
      
      {/* Staff Detail Sheet */}
      <StaffDetailSheet
        staff={selectedStaffForDetail}
        open={staffDetailOpen}
        onOpenChange={setStaffDetailOpen}
      />

      {/* Hidden Damage Report for Printing */}
      {showDamageReport && reportBooking && reportCost && (
        <div className="hidden">
          <DamageReportDocument
            ref={reportRef}
            guestName={reportBooking.guest_name}
            roomNumber={reportBooking.room?.room_number || ''}
            checkoutDate={new Date()}
            damageItems={reportCost.adjustedDamageItems}
            totalCharge={reportCost.adjustedDamageItems.reduce((s, i) => s + i.charge_amount * i.quantity, 0)}
            adjustmentNote={reportCost.damageAdjustmentNote}
          />
        </div>
      )}
    </>
  )
}
