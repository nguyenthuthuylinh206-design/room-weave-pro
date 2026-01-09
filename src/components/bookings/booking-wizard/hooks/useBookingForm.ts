import { useState, useMemo, useEffect, useCallback } from 'react'
import { addDays, differenceInDays, format } from 'date-fns'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { useTenant } from '@/hooks/useTenant'
import { formatCurrency } from '@/lib/utils'
import { OTA_SOURCES, OTA_DEFAULT_COMMISSION } from '@/lib/constants'
import { BookingFormState, BookingFormComputed, StepValidation, SelectedRoomWithPrice } from '../types'
import { AvailableRoom } from '@/hooks/useAvailableRooms'

const initialState: BookingFormState = {
  checkInDate: new Date(),
  checkOutDate: addDays(new Date(), 1),
  checkInTime: '14:00',
  checkOutTime: '12:00',
  selectedRooms: [],
  guestName: '',
  guestPhone: '',
  guestEmail: '',
  guestCount: 1,
  bookingSource: 'walk_in',
  bookingReference: '',
  notes: '',
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

  // Clear room selection when dates change
  useEffect(() => {
    setState(prev => ({
      ...prev,
      selectedRooms: [],
      depositAmount: 0,
    }))
  }, [state.checkInDate, state.checkOutDate])

  // Computed values
  const computed: BookingFormComputed = useMemo(() => {
    const nights = state.checkInDate && state.checkOutDate 
      ? Math.max(1, differenceInDays(state.checkOutDate, state.checkInDate))
      : 0
    
    const totalRoomPrice = state.selectedRooms.reduce(
      (sum, room) => sum + (room.customPrice || 0), 0
    )
    
    const subtotal = totalRoomPrice * nights
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
      totalRoomPrice,
      subtotal,
      vatAmount,
      serviceFeeAmount,
      estimatedTotal,
      otaCommissionAmount,
      netRevenue,
      remainingAmount,
      isOtaSource,
    }
  }, [state, isOtaSource])

  // Validation
  const validation: StepValidation = useMemo(() => ({
    isStep1Valid: !!(state.checkInDate && state.checkOutDate && state.checkOutDate > state.checkInDate),
    isStep2Valid: state.selectedRooms.length > 0 && state.selectedRooms.every(r => r.customPrice > 0),
    isStep3Valid: state.guestName.trim().length > 0,
    isStep4Valid: true, // Payment is optional
  }), [state])

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
        return {
          ...prev,
          selectedRooms: [...prev.selectedRooms, { 
            ...room, 
            customPrice: room.base_price || 0 
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
    
    if (!state.checkInDate || !state.checkOutDate) {
      toast({ variant: 'destructive', title: 'Vui lòng chọn ngày check-in/out' })
      return false
    }
    
    if (state.checkOutDate <= state.checkInDate) {
      toast({ variant: 'destructive', title: 'Ngày check-out phải sau ngày check-in' })
      return false
    }
    
    const hasInvalidPrice = state.selectedRooms.some(room => (room.customPrice || 0) <= 0)
    if (hasInvalidPrice) {
      toast({ variant: 'destructive', title: 'Vui lòng nhập giá cho tất cả các phòng' })
      return false
    }
    
    setIsSubmitting(true)
    
    try {
      const bookingGroupId = state.selectedRooms.length > 1 ? crypto.randomUUID() : null
      const { nights, vatAmount, serviceFeeAmount, subtotal, estimatedTotal } = computed
      
      const depositPerRoom = Math.round(state.depositAmount / state.selectedRooms.length)
      
      const bookingsData = state.selectedRooms.map((room, index) => {
        const roomPriceValue = room.customPrice
        const isLastRoom = index === state.selectedRooms.length - 1
        
        const roomDeposit = isLastRoom 
          ? state.depositAmount - (depositPerRoom * (state.selectedRooms.length - 1))
          : depositPerRoom
        const roomVat = state.includeVat ? Math.round(roomPriceValue * nights * state.vatRate / 100) : 0
        const roomServiceFee = state.includeServiceFee ? Math.round(roomPriceValue * nights * state.serviceFeeRate / 100) : 0
        const roomSubtotal = roomPriceValue * nights
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
          check_in_date: format(state.checkInDate!, 'yyyy-MM-dd'),
          check_out_date: format(state.checkOutDate!, 'yyyy-MM-dd'),
          expected_check_in_time: state.checkInTime,
          expected_check_out_time: state.checkOutTime,
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
        }
      })
      
      const { error } = await supabase
        .from('room_bookings')
        .insert(bookingsData)
        
      if (error) throw error
      
      toast({
        title: state.selectedRooms.length > 1 
          ? `Đã đặt ${state.selectedRooms.length} phòng thành công`
          : 'Đã tạo đặt phòng thành công',
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
