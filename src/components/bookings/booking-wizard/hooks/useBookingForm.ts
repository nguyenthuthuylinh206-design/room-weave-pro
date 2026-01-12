import { useState, useMemo, useEffect, useCallback } from 'react'
import { addDays, addMonths, addHours, differenceInCalendarDays, format, setHours, setMinutes } from 'date-fns'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { useTenant } from '@/hooks/useTenant'
import { formatCurrency } from '@/lib/utils'
import { OTA_SOURCES, OTA_DEFAULT_COMMISSION } from '@/lib/constants'
import { 
  BookingFormState, 
  BookingFormComputed, 
  StepValidation, 
  SelectedRoomWithPrice,
  BookingType,
  MONTHLY_DISCOUNTS,
  HOURLY_MIN_HOURS,
} from '../types'
import { AvailableRoom } from '@/hooks/useAvailableRooms'

const initialState: BookingFormState = {
  // Booking type
  bookingType: 'daily',
  
  // Daily booking
  checkInDate: new Date(),
  checkOutDate: addDays(new Date(), 1),
  checkInTime: '14:00',
  checkOutTime: '12:00',
  
  // Hourly booking
  hourlyDate: new Date(),
  hourlyStartTime: '14:00',
  bookingHours: HOURLY_MIN_HOURS,
  
  // Monthly booking
  monthlyStartDate: new Date(),
  bookingMonths: 1,
  
  // Rooms
  selectedRooms: [],
  
  // Guest info
  guestName: '',
  guestPhone: '',
  guestEmail: '',
  guestCount: 1,
  bookingSource: 'walk_in',
  bookingReference: '',
  notes: '',
  
  // Payment
  includeVat: true,
  vatRate: 8,
  includeServiceFee: true,
  serviceFeeRate: 5,
  depositAmount: 0,
  otaPaymentType: 'pay_at_hotel',
  otaPaidAmount: 0,
  otaCommissionRate: 0,
}

export function useBookingForm() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { tenant } = useTenant()
  
  const [state, setState] = useState<BookingFormState>(initialState)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Check if OTA source
  const isOtaSource = useMemo(() => 
    OTA_SOURCES.includes(state.bookingSource), 
    [state.bookingSource]
  )

  // Auto-fill OTA commission rate when booking source changes
  useEffect(() => {
    if (isOtaSource) {
      const defaultRate = OTA_DEFAULT_COMMISSION[state.bookingSource] || 15
      setState(prev => ({
        ...prev,
        otaCommissionRate: defaultRate,
        otaPaymentType: 'pay_at_hotel',
        otaPaidAmount: 0,
      }))
    } else {
      setState(prev => ({
        ...prev,
        otaCommissionRate: 0,
        otaPaymentType: 'pay_at_hotel',
        otaPaidAmount: 0,
      }))
    }
  }, [state.bookingSource, isOtaSource])

  // Clear room selection when dates/type change
  useEffect(() => {
    setState(prev => ({
      ...prev,
      selectedRooms: [],
      depositAmount: 0,
    }))
  }, [state.bookingType, state.checkInDate, state.checkOutDate, state.hourlyDate, state.monthlyStartDate, state.bookingMonths])

  // Computed values
  const computed: BookingFormComputed = useMemo(() => {
    let nights = 0
    let hours = 0
    let months = 0
    let displayDuration = ''
    
    // Calculate duration based on booking type
    if (state.bookingType === 'daily') {
      nights = state.checkInDate && state.checkOutDate 
        ? Math.max(1, differenceInCalendarDays(state.checkOutDate, state.checkInDate))
        : 0
      displayDuration = `${nights} đêm`
    } else if (state.bookingType === 'hourly') {
      hours = state.bookingHours || 0
      displayDuration = `${hours} giờ`
    } else if (state.bookingType === 'monthly') {
      months = state.bookingMonths || 0
      displayDuration = `${months} tháng`
    }
    
    // Calculate total room price based on booking type
    let totalRoomPrice = 0
    
    state.selectedRooms.forEach(room => {
      if (state.bookingType === 'daily') {
        totalRoomPrice += (room.customPrice || 0)
      } else if (state.bookingType === 'hourly') {
        // Use hourly_price from room or calculate from base_price
        const hourlyPrice = room.hourly_price || Math.round((room.base_price || 0) / 4)
        totalRoomPrice += hourlyPrice
      } else if (state.bookingType === 'monthly') {
        // Use monthly_price from room or calculate from base_price
        const monthlyPrice = room.monthly_price || (room.base_price || 0) * 25
        totalRoomPrice += monthlyPrice
      }
    })
    
    // Calculate subtotal based on duration
    let subtotal = 0
    if (state.bookingType === 'daily') {
      subtotal = totalRoomPrice * nights
    } else if (state.bookingType === 'hourly') {
      subtotal = totalRoomPrice * hours
    } else if (state.bookingType === 'monthly') {
      const discount = MONTHLY_DISCOUNTS[months] || 0
      const baseSubtotal = totalRoomPrice * months
      subtotal = baseSubtotal - Math.round(baseSubtotal * discount / 100)
    }
    
    const vatAmount = state.includeVat ? Math.round(subtotal * state.vatRate / 100) : 0
    const serviceFeeAmount = state.includeServiceFee ? Math.round(subtotal * state.serviceFeeRate / 100) : 0
    const estimatedTotal = subtotal + vatAmount + serviceFeeAmount
    
    const otaCommissionAmount = isOtaSource && state.otaCommissionRate > 0
      ? Math.round(estimatedTotal * state.otaCommissionRate / 100)
      : 0
    
    const netRevenue = estimatedTotal - otaCommissionAmount
    const remainingAmount = Math.max(0, estimatedTotal - state.depositAmount)

    return {
      nights,
      hours,
      months,
      totalRoomPrice,
      subtotal,
      vatAmount,
      serviceFeeAmount,
      estimatedTotal,
      otaCommissionAmount,
      netRevenue,
      remainingAmount,
      isOtaSource,
      displayDuration,
    }
  }, [state, isOtaSource])

  // Validation
  const validation: StepValidation = useMemo(() => {
    let isStep1Valid = false
    
    if (state.bookingType === 'daily') {
      isStep1Valid = !!(state.checkInDate && state.checkOutDate && state.checkOutDate > state.checkInDate)
    } else if (state.bookingType === 'hourly') {
      isStep1Valid = !!(state.hourlyDate && state.hourlyStartTime && state.bookingHours >= 2)
    } else if (state.bookingType === 'monthly') {
      isStep1Valid = !!(state.monthlyStartDate && state.bookingMonths >= 1)
    }
    
    return {
      isStep1Valid,
      isStep2Valid: state.selectedRooms.length > 0 && state.selectedRooms.every(r => r.customPrice > 0),
      isStep3Valid: state.guestName.trim().length > 0,
      isStep4Valid: true, // Payment is optional
    }
  }, [state])

  // Actions
  const updateState = useCallback((updates: Partial<BookingFormState>) => {
    setState(prev => ({ ...prev, ...updates }))
  }, [])

  const setDateTimeData = useCallback((data: {
    checkInDate?: Date
    checkOutDate?: Date
    checkInTime?: string
    checkOutTime?: string
  }) => {
    setState(prev => ({ ...prev, ...data }))
  }, [])

  const toggleRoomSelection = useCallback((room: AvailableRoom) => {
    setState(prev => {
      const exists = prev.selectedRooms.find(r => r.id === room.id)
      if (exists) {
        return {
          ...prev,
          selectedRooms: prev.selectedRooms.filter(r => r.id !== room.id)
        }
      } else {
        // Set price based on booking type
        let customPrice = room.base_price || 0
        if (prev.bookingType === 'hourly') {
          customPrice = room.hourly_price || Math.round((room.base_price || 0) / 4)
        } else if (prev.bookingType === 'monthly') {
          customPrice = room.monthly_price || (room.base_price || 0) * 25
        }
        
        return {
          ...prev,
          selectedRooms: [...prev.selectedRooms, { 
            ...room, 
            customPrice,
          }]
        }
      }
    })
  }, [])

  const updateRoomPrice = useCallback((roomId: string, newPrice: number) => {
    setState(prev => ({
      ...prev,
      selectedRooms: prev.selectedRooms.map(room => 
        room.id === roomId ? { ...room, customPrice: newPrice } : room
      )
    }))
  }, [])

  const reset = useCallback(() => {
    setState(initialState)
  }, [])

  const submit = useCallback(async (onSuccess?: () => void): Promise<boolean> => {
    // Validation
    if (state.selectedRooms.length === 0) {
      toast({ variant: 'destructive', title: 'Vui lòng chọn ít nhất 1 phòng' })
      return false
    }
    
    if (!state.guestName.trim()) {
      toast({ variant: 'destructive', title: 'Vui lòng nhập tên khách' })
      return false
    }
    
    // Date validation based on booking type
    if (state.bookingType === 'daily') {
      if (!state.checkInDate || !state.checkOutDate) {
        toast({ variant: 'destructive', title: 'Vui lòng chọn ngày check-in/out' })
        return false
      }
      if (state.checkOutDate <= state.checkInDate) {
        toast({ variant: 'destructive', title: 'Ngày check-out phải sau ngày check-in' })
        return false
      }
    } else if (state.bookingType === 'hourly') {
      if (!state.hourlyDate || !state.hourlyStartTime) {
        toast({ variant: 'destructive', title: 'Vui lòng chọn ngày và giờ bắt đầu' })
        return false
      }
    } else if (state.bookingType === 'monthly') {
      if (!state.monthlyStartDate) {
        toast({ variant: 'destructive', title: 'Vui lòng chọn ngày bắt đầu' })
        return false
      }
    }
    
    const hasInvalidPrice = state.selectedRooms.some(room => (room.customPrice || 0) <= 0)
    if (hasInvalidPrice) {
      toast({ variant: 'destructive', title: 'Vui lòng nhập giá cho tất cả các phòng' })
      return false
    }

    // Calculate dates based on booking type
    let checkIn: string
    let checkOut: string
    let hourlyStartTime: string | null = null
    let hourlyEndTime: string | null = null
    
    if (state.bookingType === 'daily') {
      checkIn = format(state.checkInDate!, 'yyyy-MM-dd')
      checkOut = format(state.checkOutDate!, 'yyyy-MM-dd')
    } else if (state.bookingType === 'hourly') {
      checkIn = format(state.hourlyDate!, 'yyyy-MM-dd')
      checkOut = format(state.hourlyDate!, 'yyyy-MM-dd') // Same day
      
      // Calculate exact timestamps
      const [startHour, startMin] = state.hourlyStartTime.split(':').map(Number)
      const startDateTime = setMinutes(setHours(state.hourlyDate!, startHour), startMin)
      const endDateTime = addHours(startDateTime, state.bookingHours)
      hourlyStartTime = startDateTime.toISOString()
      hourlyEndTime = endDateTime.toISOString()
    } else {
      // Monthly
      checkIn = format(state.monthlyStartDate!, 'yyyy-MM-dd')
      checkOut = format(addMonths(state.monthlyStartDate!, state.bookingMonths), 'yyyy-MM-dd')
    }

    // Validate no overlap for each room (for daily/monthly)
    if (state.bookingType !== 'hourly') {
      for (const room of state.selectedRooms) {
        const { data, error } = await supabase.rpc('validate_booking_dates', {
          p_room_id: room.id,
          p_check_in: checkIn,
          p_check_out: checkOut,
          p_exclude_booking_id: null,
        })

        if (error) {
          toast({ variant: 'destructive', title: 'Lỗi kiểm tra lịch đặt', description: error.message })
          return false
        }

        const result = data as { valid: boolean; message?: string; conflicts?: any[] }
        if (!result.valid) {
          toast({ 
            variant: 'destructive', 
            title: `Phòng ${room.room_number} đã có lịch đặt`, 
            description: result.message || 'Vui lòng chọn ngày khác' 
          })
          return false
        }
      }
    }
    
    setIsSubmitting(true)
    
    try {
      const bookingGroupId = state.selectedRooms.length > 1 ? crypto.randomUUID() : null
      const { nights, hours, months, vatAmount, serviceFeeAmount, subtotal, estimatedTotal } = computed
      
      const depositPerRoom = Math.round(state.depositAmount / state.selectedRooms.length)
      
      const bookingsData = state.selectedRooms.map((room, index) => {
        const roomPriceValue = room.customPrice
        const isLastRoom = index === state.selectedRooms.length - 1
        
        const roomDeposit = isLastRoom 
          ? state.depositAmount - (depositPerRoom * (state.selectedRooms.length - 1))
          : depositPerRoom
        
        // Calculate per-room totals
        let roomSubtotal = 0
        if (state.bookingType === 'daily') {
          roomSubtotal = roomPriceValue * nights
        } else if (state.bookingType === 'hourly') {
          roomSubtotal = roomPriceValue * hours
        } else if (state.bookingType === 'monthly') {
          const discount = MONTHLY_DISCOUNTS[months] || 0
          roomSubtotal = roomPriceValue * months
          roomSubtotal = roomSubtotal - Math.round(roomSubtotal * discount / 100)
        }
        
        const roomVat = state.includeVat ? Math.round(roomSubtotal * state.vatRate / 100) : 0
        const roomServiceFee = state.includeServiceFee ? Math.round(roomSubtotal * state.serviceFeeRate / 100) : 0
        const roomTotal = roomSubtotal + roomVat + roomServiceFee
        
        const roomOtaCommission = isOtaSource && state.otaCommissionRate > 0
          ? Math.round(roomTotal * state.otaCommissionRate / 100)
          : 0
        const roomNetRevenue = roomTotal - roomOtaCommission
        
        let finalPaymentStatus = 'pending'
        let finalAmountPaid = roomDeposit
        let finalDepositAmount = roomDeposit
        let roomOtaPaidAmount = 0
        
        if (isOtaSource && state.otaPaymentType === 'prepaid') {
          roomOtaPaidAmount = roomTotal
          finalPaymentStatus = 'paid'
          finalAmountPaid = roomTotal
          finalDepositAmount = roomTotal
        } else if (isOtaSource && state.otaPaymentType === 'partial_prepaid' && state.otaPaidAmount > 0) {
          roomOtaPaidAmount = Math.round(state.otaPaidAmount / state.selectedRooms.length)
          finalDepositAmount = roomOtaPaidAmount
          finalAmountPaid = roomOtaPaidAmount
          finalPaymentStatus = roomOtaPaidAmount >= roomTotal ? 'paid' : 'partial'
        } else {
          finalPaymentStatus = roomDeposit >= roomTotal ? 'paid' : roomDeposit > 0 ? 'partial' : 'pending'
        }
        
        return {
          room_id: room.id,
          hotel_id: room.hotel_id,
          tenant_id: tenant?.id,
          guest_name: state.guestName.trim(),
          guest_phone: state.guestPhone.trim() || null,
          guest_email: state.guestEmail.trim() || null,
          guest_count: state.selectedRooms.length === 1 ? state.guestCount : Math.ceil(state.guestCount / state.selectedRooms.length),
          check_in_date: checkIn,
          check_out_date: checkOut,
          expected_check_in_time: state.bookingType === 'hourly' ? state.hourlyStartTime : state.checkInTime,
          expected_check_out_time: state.bookingType === 'hourly' 
            ? format(addHours(new Date(`2000-01-01T${state.hourlyStartTime}`), state.bookingHours), 'HH:mm')
            : state.checkOutTime,
          status: 'confirmed',
          notes: state.notes.trim() || null,
          room_price: roomPriceValue,
          deposit_amount: finalDepositAmount,
          amount_paid: finalAmountPaid,
          payment_status: finalPaymentStatus,
          booking_source: state.bookingSource,
          booking_reference: state.bookingReference.trim() || null,
          subtotal: roomSubtotal,
          vat_rate: state.includeVat ? state.vatRate : 0,
          vat_amount: roomVat,
          service_fee_rate: state.includeServiceFee ? state.serviceFeeRate : 0,
          service_fee_amount: roomServiceFee,
          total_amount: roomTotal,
          booking_group_id: bookingGroupId,
          ota_payment_type: isOtaSource ? state.otaPaymentType : null,
          ota_paid_amount: isOtaSource && state.otaPaymentType !== 'pay_at_hotel' ? roomOtaPaidAmount : 0,
          ota_commission_rate: isOtaSource ? state.otaCommissionRate : null,
          ota_commission_amount: roomOtaCommission,
          net_revenue: roomNetRevenue,
          // New fields for booking type
          booking_type: state.bookingType,
          hourly_rate: state.bookingType === 'hourly' ? roomPriceValue : null,
          monthly_rate: state.bookingType === 'monthly' ? roomPriceValue : null,
          booking_hours: state.bookingType === 'hourly' ? state.bookingHours : null,
          booking_months: state.bookingType === 'monthly' ? state.bookingMonths : null,
          hourly_start_time: hourlyStartTime,
          hourly_end_time: hourlyEndTime,
        }
      })
      
      const { error } = await supabase
        .from('room_bookings')
        .insert(bookingsData)
        
      if (error) throw error
      
      const bookingTypeLabel = state.bookingType === 'hourly' ? 'theo giờ' : state.bookingType === 'monthly' ? 'theo tháng' : ''
      
      toast({
        title: state.selectedRooms.length > 1 
          ? `Đã đặt ${state.selectedRooms.length} phòng ${bookingTypeLabel} thành công`
          : `Đã tạo đặt phòng ${bookingTypeLabel} thành công`,
        description: state.depositAmount > 0 
          ? `Đã đặt cọc ${formatCurrency(state.depositAmount)}`
          : undefined,
      })
      
      queryClient.invalidateQueries({ queryKey: ['all-bookings'] })
      queryClient.invalidateQueries({ queryKey: ['available-rooms'] })
      onSuccess?.()
      return true
    } catch (error: any) {
      console.error('Error saving booking:', error)
      toast({
        variant: 'destructive',
        title: 'Lỗi khi lưu đặt phòng',
        description: error.message,
      })
      return false
    } finally {
      setIsSubmitting(false)
    }
  }, [state, computed, isOtaSource, tenant, toast, queryClient])

  return {
    state,
    computed,
    validation,
    isSubmitting,
    updateState,
    setDateTimeData,
    toggleRoomSelection,
    updateRoomPrice,
    reset,
    submit,
  }
}
