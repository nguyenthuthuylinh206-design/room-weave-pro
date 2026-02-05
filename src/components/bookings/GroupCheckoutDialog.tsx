import { useState, useEffect, useMemo, useCallback } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Users,
  DoorOpen,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  Minimize2,
  CreditCard,
  ClipboardCheck,
  Send,
  CheckCircle2,
  Phone,
} from 'lucide-react'
import { toast } from 'sonner'
import { format, differenceInDays } from 'date-fns'
import { vi } from 'date-fns/locale'
import { formatVNCurrency } from '@/lib/pricing'
import { useGroupBooking, GroupBookingRoom } from '@/hooks/useGroupBooking'
import { useOnShiftStaffList, OnShiftStaffMember } from '@/hooks/useOnShiftStaffList'
import { supabase } from '@/integrations/supabase/client'
import { cn } from '@/lib/utils'
import { GroupPaymentDialog } from './GroupPaymentDialog'
import { GroupCheckoutConfirmDialog } from './GroupCheckoutConfirmDialog'
import { useUser } from '@/hooks/useUser'
import { useGroupCheckoutCalculations, GroupBookingCostData } from '@/hooks/useGroupCheckoutCalculations'
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

interface InspectionStatus {
  bookingId: string
  roomId: string
  status: 'pending' | 'in_progress' | 'completed' | 'not_requested' | 'cancelled'
  damageCharge?: number
  inspectionId?: string
  startedAt?: string
  createdAt?: string
  assignedTo?: string
}

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
  
  // NEW: Cost calculation hook for proper checkout
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
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  
  // Staff detail sheet state
  const [selectedStaffForDetail, setSelectedStaffForDetail] = useState<StaffWithStatus | null>(null)
  const [staffDetailOpen, setStaffDetailOpen] = useState(false)
  
  // Room selection state - default select all checked_in rooms
  const [selectedRooms, setSelectedRooms] = useState<Set<string>>(new Set())
  
  // Staff assignments per booking - Map<bookingId, staffId>
  const [staffAssignments, setStaffAssignments] = useState<Map<string, string>>(new Map())

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
    }
  }, [open, resetCosts])


  // Fetch inspection statuses for all bookings in the group
  const { data: inspectionStatuses, isLoading: isLoadingInspections, refetch: refetchInspections } = useQuery({
    queryKey: ['group-inspections', bookingGroupId],
    queryFn: async (): Promise<InspectionStatus[]> => {
      if (!groupData?.bookings) return []

      const bookingIds = groupData.bookings.map(b => b.id)
      
      // Get inspection requests
      const { data: inspections, error } = await supabase
        .from('checkout_inspection_requests')
        .select('*')
        .in('booking_id', bookingIds)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Get room checks for damage info
      const { data: roomChecks } = await supabase
        .from('room_checks')
        .select('room_id, items_lost, items_damaged')
        .in('room_id', groupData.bookings.map(b => b.room_id))
        .in('check_type', ['checkout'])
        .order('created_at', { ascending: false })

      // Map bookings to their inspection status
      return groupData.bookings.map(booking => {
        const inspection = inspections?.find(i => i.booking_id === booking.id)
        const roomCheck = roomChecks?.find(c => c.room_id === booking.room_id)
        
        // Calculate damage charge from room check
        let damageCharge = 0
        if (roomCheck) {
          const lost = roomCheck.items_lost as any[] || []
          const damaged = roomCheck.items_damaged as any[] || []
          // Calculate lost items with estimated_value
          const lostTotal = lost.reduce((sum, item) => 
            sum + (item.estimated_value || 0) * (item.quantity || 1), 0
          )
          // Calculate damaged items with damage_cost
          const damagedTotal = damaged.reduce((sum, item) => 
            sum + (item.damage_cost || 0) * (item.quantity || 1), 0
          )
          damageCharge = lostTotal + damagedTotal
        }

        if (!inspection) {
          return {
            bookingId: booking.id,
            roomId: booking.room_id,
            status: 'not_requested' as const,
            damageCharge,
          }
        }

        // Treat cancelled as not_requested (allow re-requesting)
        const effectiveStatus = inspection.status === 'cancelled' 
          ? 'not_requested' 
          : inspection.status as 'pending' | 'in_progress' | 'completed'

        return {
          bookingId: booking.id,
          roomId: booking.room_id,
          status: effectiveStatus,
          inspectionId: inspection.status !== 'cancelled' ? inspection.id : undefined,
          startedAt: inspection.started_at,
          createdAt: inspection.created_at,
          assignedTo: inspection.assigned_to,
          damageCharge,
        }
      })
    },
    enabled: !!groupData?.bookings && open,
    refetchInterval: 10000, // Refresh every 10 seconds
  })

  // Realtime subscription for inspection status changes
  useEffect(() => {
    if (!groupData?.bookings || !open) return
    
    const bookingIds = groupData.bookings.map(b => b.id)
    const roomIds = groupData.bookings.map(b => b.room_id)
    
    // Subscribe to checkout_inspection_requests changes for this group
    const channel = supabase
      .channel(`group-inspections-realtime-${bookingGroupId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'checkout_inspection_requests',
          filter: `booking_id=in.(${bookingIds.join(',')})`,
        },
        (payload) => {
          console.log('[GroupCheckout Realtime] Inspection changed:', payload)
          refetchInspections()
          // Also invalidate cost calculations to update damage charges
          queryClient.invalidateQueries({ queryKey: ['group-inspections', bookingGroupId] })
        }
      )
      .subscribe((status) => {
        console.log('[GroupCheckout Realtime] Channel status:', status)
      })
    
    // Subscribe to room_checks changes to get damage data immediately
    const roomChecksChannel = supabase
      .channel(`group-roomchecks-realtime-${bookingGroupId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'room_checks',
          filter: `room_id=in.(${roomIds.join(',')})`,
        },
        (payload) => {
          console.log('[GroupCheckout Realtime] Room check inserted:', payload)
          refetchInspections()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'room_checks',
          filter: `room_id=in.(${roomIds.join(',')})`,
        },
        (payload) => {
          console.log('[GroupCheckout Realtime] Room check updated:', payload)
          refetchInspections()
        }
      )
      .subscribe((status) => {
        console.log('[GroupCheckout Realtime] Room checks channel status:', status)
      })
    
    return () => {
      supabase.removeChannel(channel)
      supabase.removeChannel(roomChecksChannel)
    }
  }, [groupData?.bookings, bookingGroupId, open, refetchInspections, queryClient])

  // Create inspection map for quick lookup
  const inspectionMap = useMemo(() => {
    return new Map(inspectionStatuses?.map(i => [i.bookingId, i]) || [])
  }, [inspectionStatuses])

  // Calculate totals for SELECTED rooms only
  const totals = useMemo(() => {
    if (!groupData || !inspectionStatuses) {
      return { 
        roomTotal: 0, 
        damageCharges: 0, 
        totalPaid: 0, 
        grandTotal: 0, 
        remaining: 0,
        depositApplied: 0,
        holdingDeposit: 0,
        isLastCheckout: false,
      }
    }

    const selectedBookings = groupData.bookings.filter(b => selectedRooms.has(b.id))
    const remainingBookings = groupData.bookings.filter(
      b => !selectedRooms.has(b.id) && b.status !== 'checked_out'
    )
    
    const roomTotal = selectedBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0)
    const damageCharges = selectedBookings.reduce((sum, b) => {
      const inspection = inspectionMap.get(b.id)
      return sum + (inspection?.damageCharge || 0)
    }, 0)
    const totalPaid = selectedBookings.reduce((sum, b) => sum + (b.amount_paid || 0), 0)
    
    // Deposit logic: only apply if this is the last checkout
    const isLastCheckout = remainingBookings.length === 0
    const depositApplied = isLastCheckout ? groupData.totalDeposit : 0
    const holdingDeposit = !isLastCheckout ? groupData.totalDeposit : 0
    
    const grandTotal = roomTotal + damageCharges
    const remaining = grandTotal - totalPaid - depositApplied

    return { 
      roomTotal, 
      damageCharges, 
      totalPaid, 
      grandTotal, 
      remaining,
      depositApplied,
      holdingDeposit,
      isLastCheckout,
    }
  }, [groupData, inspectionStatuses, selectedRooms, inspectionMap])

  // Count rooms that are ready vs in progress
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

  // Handle select all toggle
  const handleSelectAll = (checked: boolean) => {
    if (checked && groupData) {
      const checkedInRooms = groupData.bookings
        .filter(b => b.status === 'checked_in')
        .map(b => b.id)
      setSelectedRooms(new Set(checkedInRooms))
    } else {
      setSelectedRooms(new Set())
    }
  }

  // Handle individual room selection
  const handleRoomSelect = (bookingId: string, checked: boolean) => {
    const newSelected = new Set(selectedRooms)
    if (checked) {
      newSelected.add(bookingId)
    } else {
      newSelected.delete(bookingId)
      // Also remove staff assignment
      const newAssignments = new Map(staffAssignments)
      newAssignments.delete(bookingId)
      setStaffAssignments(newAssignments)
    }
    setSelectedRooms(newSelected)
  }

  // Handle staff assignment change
  const handleStaffChange = (bookingId: string, staffId: string) => {
    const newAssignments = new Map(staffAssignments)
    newAssignments.set(bookingId, staffId)
    setStaffAssignments(newAssignments)
  }

  // Batch send inspection requests
  const handleBatchInspectionRequest = async () => {
    const roomsToRequest = Array.from(selectedRooms).filter(bookingId => {
      const inspection = inspectionMap.get(bookingId)
      return !inspection || inspection.status === 'not_requested'
    })
    
    // Check all have staff assigned
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
        
        // Create inspection request
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

        if (inspectionError) {
          console.error('Error creating inspection request:', inspectionError)
          continue
        }
        
        // Create housekeeping task
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
        
        // Send notifications (parallel)
        const staff = staffList.find(s => s.id === staffId)
        const staffName = staff?.full_name || 'Nhân viên'
        const roomNumber = booking.room?.room_number || ''
        const guestName = booking.guest_name
        
        await Promise.all([
          // 1. Push notification for staff
          sendPushNotification({
            userId: staffId,
            tenantId,
            title: `Yêu cầu kiểm tra phòng ${roomNumber}`,
            body: `Khách ${guestName} sắp checkout. Vui lòng kiểm tra phòng.`,
            actionUrl: `/my-tasks`,
            notificationType: 'room_checkout',
          }),
          // 2. In-app notification for staff
          createInAppNotification({
            userId: staffId,
            tenantId,
            title: `Yêu cầu kiểm tra phòng ${roomNumber}`,
            body: `Khách ${guestName} sắp checkout. Vui lòng kiểm tra phòng.`,
            type: 'room_checkout',
            actionUrl: `/my-tasks`,
          }),
          // 3. Telegram to individual staff
          sendTelegramNotification({
            tenantId,
            hotelId,
            userIds: [staffId],
            title: `🔍 Yêu cầu kiểm tra phòng ${roomNumber}`,
            message: `Khách: ${guestName}\nVui lòng kiểm tra phòng trước khi checkout.`,
            notificationType: 'checkout',
            actionUrl: `/my-tasks`,
          }),
          // 4. Telegram to staff groups
          sendTelegramNotification({
            tenantId,
            hotelId,
            sendToStaffGroups: true,
            title: `🔍 Yêu cầu kiểm tra phòng ${roomNumber}`,
            message: `Khách: ${guestName}\n👤 Giao cho: ${staffName}\nVui lòng kiểm tra phòng trước khi checkout.`,
            notificationType: 'checkout',
            actionUrl: `/my-tasks`,
          }),
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

  // Handle cancelling inspection request
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
      console.error('Error cancelling inspection:', error)
      toast.error('Lỗi hủy yêu cầu kiểm tra')
    }
  }

  // Perform selective checkout - now shows confirm dialog first
  const handleSelectiveCheckout = async () => {
    if (!groupData) return
    
    // Get rooms that are ready (completed inspection or no request needed)
    const readyRooms = Array.from(selectedRooms).filter(bookingId => {
      const booking = groupData.bookings.find(b => b.id === bookingId)
      if (!booking || booking.status === 'checked_out') return false
      
      const inspection = inspectionMap.get(bookingId)
      // Allow checkout if inspection completed OR not requested (skip inspection)
      return inspection?.status === 'completed' || inspection?.status === 'not_requested'
    })
    
    if (readyRooms.length === 0) {
      toast.error('Không có phòng nào sẵn sàng checkout. Vui lòng chờ kiểm tra hoàn thành.')
      return
    }
    
    // Calculate costs for ready rooms before showing confirm dialog
    const bookingsToCalculate: GroupBookingCostData[] = readyRooms.map(bookingId => {
      const booking = groupData.bookings.find(b => b.id === bookingId)!
      const checkIn = new Date(booking.check_in_date)
      const checkOut = new Date(booking.check_out_date)
      const nights = Math.max(1, differenceInDays(checkOut, checkIn))
      
      return {
        bookingId: booking.id,
        roomId: booking.room_id,
        roomNumber: booking.room?.room_number || '',
        bookingType: (booking.booking_type as 'daily' | 'hourly' | 'monthly') || 'daily',
        roomPrice: (booking as any).room_price || 0,
        nights,
        hourlyRate: (booking as any).hourly_rate,
        hours: (booking as any).booking_hours,
        monthlyRate: (booking as any).monthly_rate,
        months: (booking as any).booking_months,
        totalAmount: booking.total_amount || 0,
        depositAmount: booking.deposit_amount || 0,
        amountPaid: booking.amount_paid || 0,
        checkInDate: checkIn,
        checkOutDate: checkOut,
      }
    })
    
    await calculateAllCosts(bookingsToCalculate)
    setShowConfirmDialog(true)
  }
  
  // Get confirm dialog data
  const confirmRooms = useMemo(() => {
    if (!groupData) return []
    return Array.from(selectedRooms)
      .map(bookingId => {
        const booking = groupData.bookings.find(b => b.id === bookingId)
        if (!booking || booking.status === 'checked_out') return null
        
        const inspection = inspectionMap.get(bookingId)
        if (inspection?.status !== 'completed' && inspection?.status !== 'not_requested') return null
        
        return {
          bookingId: booking.id,
          roomNumber: booking.room?.room_number || '',
          guestName: booking.guest_name,
          roomPrice: (booking as any).room_price || 0,
          bookingType: (booking.booking_type as 'daily' | 'hourly' | 'monthly') || 'daily',
          checkOutDate: new Date(),
          scheduledCheckOutDate: booking.check_out_date ? new Date(booking.check_out_date) : new Date(),
          hourlyRate: (booking as any).hourly_rate || 0,
          hours: (booking as any).booking_hours || 0,
          monthlyRate: (booking as any).monthly_rate || 0,
          months: (booking as any).booking_months || 0,
        }
      })
      .filter(Boolean) as {
        bookingId: string
        roomNumber: string
        guestName: string
        roomPrice: number
        bookingType: 'daily' | 'hourly' | 'monthly'
        checkOutDate?: Date
        scheduledCheckOutDate?: Date
        hourlyRate?: number
        hours?: number
        monthlyRate?: number
        months?: number
      }[]
  }, [groupData, selectedRooms, inspectionMap])
  
  // Calculate aggregated totals for confirm dialog
  const confirmTotals = useMemo(() => {
    const remainingBookings = groupData?.bookings.filter(
      b => !selectedRooms.has(b.id) && b.status !== 'checked_out'
    ) || []
    const isLastCheckout = remainingBookings.length === 0
    const totalGroupDeposit = groupData?.totalDeposit || 0
    
    return getAggregatedTotals(
      confirmRooms.map(r => r.bookingId),
      totalGroupDeposit,
      isLastCheckout
    )
  }, [confirmRooms, groupData, selectedRooms, getAggregatedTotals])
  
  // Handle confirm checkout (with or without payment)
  const handleConfirmCheckout = async (withPayment: boolean = false) => {
    if (!groupData) return
    
    const bookingIds = confirmRooms.map(r => r.bookingId)
    
    if (withPayment && confirmTotals.remaining > 0) {
      setShowConfirmDialog(false)
      setShowPaymentDialog(true)
      return
    }
    
    await performCheckout(bookingIds)
    setShowConfirmDialog(false)
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
        
        // Prepare RPC params with cost data
        const lateCharge = cost?.adjustedLateCharge || 0
        const serviceCharges = cost?.serviceCharges || 0
        const damageCharges = cost?.adjustedDamageItems.reduce((s, i) => s + i.charge_amount * i.quantity, 0) || 0
        const costBreakdown = cost?.costBreakdown
        
        // Combine adjustment notes
        const allNotes: string[] = []
        if (cost?.lateAdjustmentNote) allNotes.push(`[Phụ thu: ${cost.lateAdjustmentNote}]`)
        if (cost?.damageAdjustmentNote) allNotes.push(`[Đền bù: ${cost.damageAdjustmentNote}]`)
        const damageNotesStr = allNotes.join(' | ') || null
        
        // Use RPC for atomic checkout with full params
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
        })
        
        if (error) {
          console.error('RPC perform_checkout error:', error)
          throw error
        }
        
        // Update notes if there were adjustments
        if (allNotes.length > 0) {
          const existingNotes = (booking as any).notes || ''
          const updateNotes = existingNotes
            ? `${existingNotes}\n${allNotes.join('\n')}`
            : allNotes.join('\n')
          await supabase
            .from('room_bookings')
            .update({ notes: updateNotes })
            .eq('id', bookingId)
        }
          
        // Complete inspection request if exists
        const inspection = inspectionMap.get(bookingId)
        if (inspection?.inspectionId) {
          await supabase
            .from('checkout_inspection_requests')
            .update({ 
              status: 'completed',
              completed_at: new Date().toISOString(),
            })
            .eq('id', inspection.inspectionId)
        }
        
        // Send checkout notification
        if (tenantId && hotelId) {
          triggerRoomCheckoutNotification({
            tenantId,
            hotelId,
            roomId: booking.room_id,
            roomNumber: booking.room?.room_number || '',
          }).catch(err => console.error('Failed to send checkout notification:', err))
        }
      }
      
      toast.success(`Đã checkout ${bookingIds.length} phòng thành công!`)
      
      // Check if all rooms done
      const allRoomsNowDone = groupData.bookings.every(b => 
        b.status === 'checked_out' || bookingIds.includes(b.id)
      )
      
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

  const getInspectionStatusBadge = (status: InspectionStatus['status']) => {
    switch (status) {
      case 'completed':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
            <CheckCircle className="h-3 w-3 mr-1" />
            Đã kiểm tra
          </Badge>
        )
      case 'in_progress':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
            <Clock className="h-3 w-3 mr-1 animate-pulse" />
            Đang kiểm tra
          </Badge>
        )
      case 'pending':
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
            <Clock className="h-3 w-3 mr-1" />
            Chờ kiểm tra
          </Badge>
        )
      default:
        return (
          <span className="text-xs text-muted-foreground">Chưa gửi yêu cầu</span>
        )
    }
  }

  // Calculate how many checked_in rooms there are
  const checkedInRooms = groupData?.bookings.filter(b => b.status === 'checked_in') || []
  const allSelected = selectedRooms.size === checkedInRooms.length && checkedInRooms.length > 0

  if (isLoadingGroup) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (!groupData) {
    return null
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col p-0">
          {/* Header */}
          <DialogHeader className="px-4 pt-4 pb-2">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2 text-base">
                <DoorOpen className="h-4 w-4" />
                Checkout nhóm
              </DialogTitle>
              {onMinimize && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onMinimize}
                >
                  <Minimize2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {groupData.guestName} • {groupData.roomCount} phòng
              {groupData.roomsCheckedOut > 0 && (
                <span className="ml-1">({groupData.roomsCheckedOut} đã trả)</span>
              )}
            </p>
          </DialogHeader>

          <ScrollArea className="flex-1 overflow-auto">
            <div className="flex flex-col gap-3 px-4 pb-4">
              {/* Select All Checkbox */}
              {checkedInRooms.length > 0 && (
                <div className="flex items-center gap-2 pb-1">
                  <Checkbox
                    id="select-all"
                    checked={allSelected}
                    onCheckedChange={handleSelectAll}
                  />
                  <Label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                    Chọn tất cả ({checkedInRooms.length} phòng đang ở)
                  </Label>
                </div>
              )}
              
              {/* Room List with Selection & Staff Assignment */}
              <div className="space-y-2">
                {groupData.bookings.map((booking) => {
                  const inspection = inspectionMap.get(booking.id)
                  const isCheckedOut = booking.status === 'checked_out'
                  const isSelected = selectedRooms.has(booking.id)
                  const assignedStaff = staffAssignments.get(booking.id)
                  const needsStaffAssignment = isSelected && !isCheckedOut && (!inspection || inspection.status === 'not_requested')
                  
                  return (
                    <div
                      key={booking.id}
                      className={cn(
                        "border rounded-lg p-3 transition-colors",
                        isCheckedOut && "bg-muted/50 opacity-60",
                        isSelected && !isCheckedOut && "bg-blue-50/50 border-blue-200"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        {/* Checkbox */}
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => handleRoomSelect(booking.id, !!checked)}
                          disabled={isCheckedOut}
                          className="mt-0.5"
                        />
                        
                        <div className="flex-1 space-y-2">
                          {/* Room Info Row */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">
                                P.{booking.room?.room_number}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {booking.room?.room_type}
                              </span>
                              {inspection?.damageCharge != null && inspection.damageCharge > 0 && (
                                <span className="text-xs text-red-600 font-medium">
                                  +{formatVNCurrency(inspection.damageCharge)}
                                </span>
                              )}
                            </div>
                            
                            {isCheckedOut ? (
                              <Badge variant="secondary" className="text-xs">Đã trả</Badge>
                            ) : (
                              getInspectionStatusBadge(inspection?.status || 'not_requested')
                            )}
                          </div>
                          
                          {/* Staff Assignment - only show for selected rooms that need inspection */}
                          {needsStaffAssignment && (
                            <div className="flex items-center gap-2">
                              <Label className="text-xs text-muted-foreground whitespace-nowrap">
                                NV kiểm tra:
                              </Label>
                              <Select
                                value={assignedStaff || ''}
                                onValueChange={(value) => handleStaffChange(booking.id, value)}
                              >
                                <SelectTrigger className="h-8 text-xs flex-1">
                                  <SelectValue placeholder="Chọn nhân viên..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {isLoadingStaff ? (
                                    <div className="p-2 text-xs text-muted-foreground">
                                      Đang tải...
                                    </div>
                                  ) : staffList.length === 0 ? (
                                    <div className="p-2 text-xs text-muted-foreground">
                                      Không có nhân viên trong ca
                                    </div>
                                  ) : (
                                    staffList.map(staff => (
                                      <SelectItem key={staff.id} value={staff.id}>
                                        <div className="flex items-center gap-2">
                                          <Avatar className="h-5 w-5">
                                            <AvatarImage src={staff.avatar_url || undefined} />
                                            <AvatarFallback className="text-xs">
                                              {staff.full_name?.[0]}
                                            </AvatarFallback>
                                          </Avatar>
                                          <span>{staff.full_name}</span>
                                          <span className="text-xs text-green-600">(trong ca)</span>
                                        </div>
                                      </SelectItem>
                                    ))
                                  )}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                          
                          {/* Show inspection status card for pending/in_progress/completed */}
                          {isSelected && !isCheckedOut && inspection && ['pending', 'in_progress', 'completed'].includes(inspection.status) && (
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
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

            {/* Batch Inspection Request Button */}
            {roomStats.needsRequest > 0 && selectedRooms.size > 0 && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleBatchInspectionRequest}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
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

            {/* Payment Summary */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <CreditCard className="h-4 w-4" />
                Thanh toán
                {selectedRooms.size > 0 && (
                  <span className="text-muted-foreground font-normal">
                    ({selectedRooms.size} phòng đã chọn)
                  </span>
                )}
              </div>

              <div className="bg-muted/50 rounded-lg p-3 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tiền phòng</span>
                  <span className="font-mono">{formatVNCurrency(totals.roomTotal)}</span>
                </div>
                
                {totals.damageCharges > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Phí đền bù</span>
                    <span className="font-mono text-red-600">+{formatVNCurrency(totals.damageCharges)}</span>
                  </div>
                )}
                
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Đã thanh toán</span>
                  <span className="font-mono text-green-600">-{formatVNCurrency(totals.totalPaid)}</span>
                </div>
                
                {totals.depositApplied > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tiền cọc (áp dụng)</span>
                    <span className="font-mono text-green-600">-{formatVNCurrency(totals.depositApplied)}</span>
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
                
                <Separator className="my-1.5" />
                
                <div className="flex justify-between font-medium">
                  <span>CẦN THU</span>
                  <span className={cn(
                    "font-mono text-lg",
                    totals.remaining > 0 ? "text-primary" : "text-green-600"
                  )}>
                    {formatVNCurrency(Math.max(0, totals.remaining))}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              {onMinimize && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onMinimize}
                >
                  <Minimize2 className="h-4 w-4 mr-1.5" />
                  Thu nhỏ
                </Button>
              )}
              
              <Button
                className="flex-1"
                disabled={isProcessing || selectedRooms.size === 0}
                onClick={handleSelectiveCheckout}
              >
                {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {totals.remaining > 0 ? (
                  <>
                    <CreditCard className="h-4 w-4 mr-1.5" />
                    Thu tiền & Checkout ({selectedRooms.size})
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-1.5" />
                    Checkout ({selectedRooms.size} phòng)
                  </>
                )}
              </Button>
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
        }}
      />
      
      {/* Confirm Checkout Dialog */}
      <GroupCheckoutConfirmDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        rooms={confirmRooms}
        roomCosts={roomCosts}
        totals={confirmTotals}
        onAdjustLateCharge={adjustLateCharge}
        onAdjustDamageItem={adjustDamageItemCharge}
        onSetDamageNote={setDamageNote}
        onConfirm={() => handleConfirmCheckout(false)}
        onPayAndCheckout={() => handleConfirmCheckout(true)}
        isLoading={isProcessing || isCalculating}
      />
      
      {/* Staff Detail Sheet */}
      <StaffDetailSheet
        staff={selectedStaffForDetail}
        open={staffDetailOpen}
        onOpenChange={setStaffDetailOpen}
      />
    </>
  )
}
