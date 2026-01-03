import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { format, addDays, differenceInDays } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Calendar as CalendarIcon, User, Phone, Mail, Users, Save, X, Loader2, DollarSign, CreditCard, Clock, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { cn, formatCurrency } from '@/lib/utils'
import { CheckoutSummaryDialog } from '@/components/bookings/CheckoutSummaryDialog'
import { 
  calculateBookingCost, 
  calculateEarlyCheckinCharge, 
  calculateLateCheckoutCharge,
  getEarlyCheckinDescription,
  getLateCheckoutDescription,
  DEFAULT_PRICING_RULES,
  BookingCostBreakdown
} from '@/lib/bookingCalculations'
import type { RoomBooking } from '@/hooks/useRoomBooking'

// Time options for check-in/check-out
const TIME_OPTIONS = [
  '05:00', '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', 
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', 
  '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'
]

interface RoomBookingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  roomId: string
  roomNumber: string
  hotelId: string
  tenantId: string
  booking?: RoomBooking | null
  defaultRoomPrice?: number
}

export function RoomBookingDialog({
  open,
  onOpenChange,
  roomId,
  roomNumber,
  hotelId,
  tenantId,
  booking,
  defaultRoomPrice = 0,
}: RoomBookingDialogProps) {
  const { t } = useTranslation(['rooms', 'common'])
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  const isEdit = !!booking
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showCheckoutSummary, setShowCheckoutSummary] = useState(false)
  const [showPaymentDetails, setShowPaymentDetails] = useState(false)
  
  // Guest info
  const [guestName, setGuestName] = useState(booking?.guest_name || '')
  const [guestPhone, setGuestPhone] = useState(booking?.guest_phone || '')
  const [guestEmail, setGuestEmail] = useState(booking?.guest_email || '')
  const [guestCount, setGuestCount] = useState(booking?.guest_count || 1)
  
  // Dates and times
  const [checkInDate, setCheckInDate] = useState<Date | undefined>(
    booking?.check_in_date ? new Date(booking.check_in_date) : new Date()
  )
  const [checkOutDate, setCheckOutDate] = useState<Date | undefined>(
    booking?.check_out_date ? new Date(booking.check_out_date) : addDays(new Date(), 1)
  )
  const [checkInTime, setCheckInTime] = useState<string>((booking as any)?.expected_check_in_time?.slice(0, 5) || '14:00')
  const [checkOutTime, setCheckOutTime] = useState<string>((booking as any)?.expected_check_out_time?.slice(0, 5) || '12:00')
  
  const [status, setStatus] = useState(booking?.status || 'confirmed')
  const [notes, setNotes] = useState(booking?.notes || '')
  
  // Financial fields
  const [roomPrice, setRoomPrice] = useState<number>((booking as any)?.room_price || defaultRoomPrice)
  const [extraCharges, setExtraCharges] = useState<number>((booking as any)?.extra_charges || 0)
  const [depositAmount, setDepositAmount] = useState<number>((booking as any)?.deposit_amount || 0)
  const [amountPaid, setAmountPaid] = useState<number>((booking as any)?.amount_paid || 0)
  
  // Surcharges (auto-calculated)
  const [earlyCheckinCharge, setEarlyCheckinCharge] = useState<number>((booking as any)?.early_checkin_charge || 0)
  const [lateCheckoutCharge, setLateCheckoutCharge] = useState<number>((booking as any)?.late_checkout_charge || 0)
  
  // Service charges from consumables
  const [serviceCharges, setServiceCharges] = useState<number>((booking as any)?.service_charges || 0)
  
  // Tax rates
  const [vatRate, setVatRate] = useState<number>((booking as any)?.vat_rate || DEFAULT_PRICING_RULES.vatRate)
  const [serviceFeeRate, setServiceFeeRate] = useState<number>((booking as any)?.service_fee_rate || DEFAULT_PRICING_RULES.serviceFeeRate)
  
  // Calculate nights
  const nights = checkInDate && checkOutDate ? Math.max(1, differenceInDays(checkOutDate, checkInDate)) : 1
  
  // Calculate cost breakdown
  const costBreakdown = useMemo<BookingCostBreakdown>(() => {
    return calculateBookingCost({
      roomPrice,
      nights,
      earlyCheckinCharge,
      lateCheckoutCharge,
      serviceCharges,
      extraCharges,
      vatRate,
      serviceFeeRate,
      depositAmount,
      amountPaid,
    })
  }, [roomPrice, nights, earlyCheckinCharge, lateCheckoutCharge, serviceCharges, extraCharges, vatRate, serviceFeeRate, depositAmount, amountPaid])

  // Auto-calculate early check-in surcharge when time changes
  useEffect(() => {
    if (checkInTime && roomPrice) {
      const charge = calculateEarlyCheckinCharge(checkInTime, roomPrice)
      setEarlyCheckinCharge(charge)
    }
  }, [checkInTime, roomPrice])

  // Reset form when booking changes
  useEffect(() => {
    if (booking) {
      setGuestName(booking.guest_name || '')
      setGuestPhone(booking.guest_phone || '')
      setGuestEmail(booking.guest_email || '')
      setGuestCount(booking.guest_count || 1)
      setCheckInDate(booking.check_in_date ? new Date(booking.check_in_date) : new Date())
      setCheckOutDate(booking.check_out_date ? new Date(booking.check_out_date) : addDays(new Date(), 1))
      setCheckInTime((booking as any)?.expected_check_in_time?.slice(0, 5) || '14:00')
      setCheckOutTime((booking as any)?.expected_check_out_time?.slice(0, 5) || '12:00')
      setStatus(booking.status || 'confirmed')
      setNotes(booking.notes || '')
      setRoomPrice((booking as any)?.room_price || defaultRoomPrice)
      setExtraCharges((booking as any)?.extra_charges || 0)
      setDepositAmount((booking as any)?.deposit_amount || 0)
      setAmountPaid((booking as any)?.amount_paid || 0)
      setEarlyCheckinCharge((booking as any)?.early_checkin_charge || 0)
      setLateCheckoutCharge((booking as any)?.late_checkout_charge || 0)
      setServiceCharges((booking as any)?.service_charges || 0)
      setVatRate((booking as any)?.vat_rate || DEFAULT_PRICING_RULES.vatRate)
      setServiceFeeRate((booking as any)?.service_fee_rate || DEFAULT_PRICING_RULES.serviceFeeRate)
    }
  }, [booking, defaultRoomPrice])
  
  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['room-booking', roomId] })
    queryClient.invalidateQueries({ queryKey: ['room-bookings', roomId] })
    queryClient.invalidateQueries({ queryKey: ['all-bookings'] })
    queryClient.invalidateQueries({ queryKey: ['booking-stats'] })
    queryClient.invalidateQueries({ queryKey: ['today-checkouts'] })
    queryClient.invalidateQueries({ queryKey: ['today-checkins'] })
    queryClient.invalidateQueries({ queryKey: ['rooms'] })
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!guestName.trim()) {
      toast({
        variant: 'destructive',
        title: t('booking.validation.guestNameRequired'),
      })
      return
    }
    
    if (!checkInDate || !checkOutDate) {
      toast({
        variant: 'destructive',
        title: t('booking.validation.datesRequired'),
      })
      return
    }
    
    if (checkOutDate <= checkInDate) {
      toast({
        variant: 'destructive',
        title: t('booking.validation.invalidDates'),
      })
      return
    }
    
    setIsSubmitting(true)
    
    try {
      const bookingData = {
        room_id: roomId,
        hotel_id: hotelId,
        tenant_id: tenantId,
        guest_name: guestName.trim(),
        guest_phone: guestPhone.trim() || null,
        guest_email: guestEmail.trim() || null,
        guest_count: guestCount,
        check_in_date: format(checkInDate, 'yyyy-MM-dd'),
        check_out_date: format(checkOutDate, 'yyyy-MM-dd'),
        expected_check_in_time: checkInTime,
        expected_check_out_time: checkOutTime,
        status,
        notes: notes.trim() || null,
        actual_check_in: status === 'checked_in' ? new Date().toISOString() : null,
        // Financial fields
        room_price: roomPrice,
        extra_charges: extraCharges,
        early_checkin_charge: earlyCheckinCharge,
        late_checkout_charge: lateCheckoutCharge,
        service_charges: serviceCharges,
        subtotal: costBreakdown.subtotal,
        vat_rate: vatRate,
        vat_amount: costBreakdown.vatAmount,
        service_fee_rate: serviceFeeRate,
        service_fee_amount: costBreakdown.serviceFeeAmount,
        total_amount: costBreakdown.totalAmount,
        deposit_amount: depositAmount,
        amount_paid: amountPaid,
      }
      
      if (isEdit && booking) {
        const { error } = await supabase
          .from('room_bookings')
          .update(bookingData)
          .eq('id', booking.id)
          
        if (error) throw error
        
        toast({
          title: t('booking.updateSuccess'),
        })
      } else {
        const { error } = await supabase
          .from('room_bookings')
          .insert(bookingData)
          
        if (error) throw error
        
        toast({
          title: t('booking.createSuccess'),
        })
      }
      
      invalidateQueries()
      onOpenChange(false)
    } catch (error: any) {
      console.error('Error saving booking:', error)
      toast({
        variant: 'destructive',
        title: t('booking.saveError'),
        description: error.message,
      })
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const handleCheckIn = async () => {
    if (!booking) return
    
    setIsSubmitting(true)
    try {
      // Calculate early check-in surcharge based on actual time
      const now = new Date()
      const actualTime = format(now, 'HH:mm')
      const calculatedEarlyCharge = calculateEarlyCheckinCharge(actualTime, roomPrice)
      
      // Update booking status
      const { error: bookingError } = await supabase
        .from('room_bookings')
        .update({
          status: 'checked_in',
          actual_check_in: now.toISOString(),
          early_checkin_charge: calculatedEarlyCharge,
        })
        .eq('id', booking.id)
        
      if (bookingError) throw bookingError

      // Update room status to 'occupied'
      const { error: roomError } = await supabase
        .from('rooms')
        .update({ status: 'occupied' })
        .eq('id', roomId)
        
      if (roomError) throw roomError
      
      toast({
        title: t('booking.checkInSuccess'),
        description: calculatedEarlyCharge > 0 
          ? `Phụ thu check-in sớm: ${formatCurrency(calculatedEarlyCharge)}`
          : undefined,
      })
      
      invalidateQueries()
      onOpenChange(false)
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t('booking.checkInError'),
        description: error.message,
      })
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const handleCheckOutClick = () => {
    // Calculate late checkout charge based on current time
    const now = new Date()
    const actualTime = format(now, 'HH:mm')
    const calculatedLateCharge = calculateLateCheckoutCharge(actualTime, roomPrice)
    setLateCheckoutCharge(calculatedLateCharge)
    
    // Show checkout summary dialog
    setShowCheckoutSummary(true)
  }
  
  const performCheckOut = async () => {
    if (!booking) return
    
    setIsSubmitting(true)
    setShowCheckoutSummary(false)
    
    try {
      const now = new Date()
      
      // Update booking with final calculations
      const { error: bookingError } = await supabase
        .from('room_bookings')
        .update({
          status: 'checked_out',
          actual_check_out: now.toISOString(),
          late_checkout_charge: lateCheckoutCharge,
          subtotal: costBreakdown.subtotal,
          vat_amount: costBreakdown.vatAmount,
          service_fee_amount: costBreakdown.serviceFeeAmount,
          total_amount: costBreakdown.totalAmount,
        })
        .eq('id', booking.id)
        
      if (bookingError) throw bookingError

      // Update room status to 'check_out' (needs inspection/cleaning)
      const { error: roomError } = await supabase
        .from('rooms')
        .update({ status: 'check_out' })
        .eq('id', roomId)
        
      if (roomError) throw roomError
      
      toast({
        title: t('booking.checkOutSuccess'),
      })
      
      invalidateQueries()
      onOpenChange(false)
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t('booking.checkOutError'),
        description: error.message,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReceivePayment = async () => {
    if (!booking) return
    
    // Set amount paid to cover remaining
    const newAmountPaid = costBreakdown.totalAmount - depositAmount
    setAmountPaid(newAmountPaid)
    
    setIsSubmitting(true)
    try {
      const { error } = await supabase
        .from('room_bookings')
        .update({
          amount_paid: newAmountPaid,
          subtotal: costBreakdown.subtotal,
          vat_amount: costBreakdown.vatAmount,
          service_fee_amount: costBreakdown.serviceFeeAmount,
          total_amount: costBreakdown.totalAmount,
        })
        .eq('id', booking.id)
        
      if (error) throw error
      
      toast({
        title: 'Đã nhận thanh toán đầy đủ',
      })
      
      invalidateQueries()
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Lỗi cập nhật thanh toán',
        description: error.message,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePayAndCheckout = async () => {
    if (!booking) return
    
    setIsSubmitting(true)
    setShowCheckoutSummary(false)
    
    try {
      const now = new Date()
      const newAmountPaid = costBreakdown.totalAmount - depositAmount
      
      // Update booking with payment and checkout
      const { error: bookingError } = await supabase
        .from('room_bookings')
        .update({
          status: 'checked_out',
          actual_check_out: now.toISOString(),
          amount_paid: newAmountPaid,
          late_checkout_charge: lateCheckoutCharge,
          subtotal: costBreakdown.subtotal,
          vat_amount: costBreakdown.vatAmount,
          service_fee_amount: costBreakdown.serviceFeeAmount,
          total_amount: costBreakdown.totalAmount,
        })
        .eq('id', booking.id)
        
      if (bookingError) throw bookingError

      // Update room status
      const { error: roomError } = await supabase
        .from('rooms')
        .update({ status: 'check_out' })
        .eq('id', roomId)
        
      if (roomError) throw roomError
      
      toast({
        title: 'Đã thanh toán và check-out thành công',
      })
      
      invalidateQueries()
      onOpenChange(false)
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: error.message,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Get surcharge descriptions
  const earlyCheckinDesc = getEarlyCheckinDescription(checkInTime)
  const lateCheckoutDesc = getLateCheckoutDescription(checkOutTime)
  
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEdit ? t('booking.editTitle') : t('booking.addTitle')} - {t('detail.title', { number: roomNumber })}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Guest Name */}
            <div className="space-y-2">
              <Label htmlFor="guestName" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                {t('booking.guestName')} *
              </Label>
              <Input
                id="guestName"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder={t('booking.guestNamePlaceholder')}
                required
              />
            </div>
            
            {/* Contact Row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="guestPhone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  {t('booking.phone')}
                </Label>
                <Input
                  id="guestPhone"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  placeholder="0909..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guestEmail" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  {t('booking.email')}
                </Label>
                <Input
                  id="guestEmail"
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  placeholder="email@..."
                />
              </div>
            </div>
            
            {/* Guest Count */}
            <div className="space-y-2">
              <Label htmlFor="guestCount" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                {t('booking.guestCount')}
              </Label>
              <Input
                id="guestCount"
                type="number"
                min={1}
                max={10}
                value={guestCount}
                onChange={(e) => setGuestCount(parseInt(e.target.value) || 1)}
              />
            </div>
            
            {/* Check-in/Check-out Section */}
            <div className="border rounded-lg p-3 space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Thời gian lưu trú
              </h4>
              
              <div className="grid grid-cols-2 gap-3">
                {/* Check-in */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Check-in *</Label>
                  <div className="flex gap-1">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className={cn(
                            "flex-1 justify-start text-left font-normal h-8",
                            !checkInDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="h-3 w-3 mr-1" />
                          {checkInDate ? format(checkInDate, 'dd/MM', { locale: vi }) : "Ngày"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={checkInDate}
                          onSelect={setCheckInDate}
                          locale={vi}
                        />
                      </PopoverContent>
                    </Popover>
                    <Select value={checkInTime} onValueChange={setCheckInTime}>
                      <SelectTrigger className="w-20 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_OPTIONS.map((time) => (
                          <SelectItem key={time} value={time}>{time}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {earlyCheckinDesc && (
                    <p className="text-xs text-amber-600">{earlyCheckinDesc}</p>
                  )}
                </div>
                
                {/* Check-out */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Check-out *</Label>
                  <div className="flex gap-1">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className={cn(
                            "flex-1 justify-start text-left font-normal h-8",
                            !checkOutDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="h-3 w-3 mr-1" />
                          {checkOutDate ? format(checkOutDate, 'dd/MM', { locale: vi }) : "Ngày"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={checkOutDate}
                          onSelect={setCheckOutDate}
                          disabled={(date) => checkInDate ? date <= checkInDate : false}
                          locale={vi}
                        />
                      </PopoverContent>
                    </Popover>
                    <Select value={checkOutTime} onValueChange={setCheckOutTime}>
                      <SelectTrigger className="w-20 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_OPTIONS.map((time) => (
                          <SelectItem key={time} value={time}>{time}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {lateCheckoutDesc && (
                    <p className="text-xs text-amber-600">{lateCheckoutDesc}</p>
                  )}
                </div>
              </div>
              
              {/* Actual check-in/out times */}
              {isEdit && booking && (
                <div className="text-xs text-muted-foreground pt-2 border-t space-y-1">
                  <div className="flex justify-between">
                    <span>Thực tế check-in:</span>
                    <span className={booking.actual_check_in ? 'text-green-600 font-medium' : ''}>
                      {booking.actual_check_in 
                        ? format(new Date(booking.actual_check_in), 'dd/MM/yyyy HH:mm', { locale: vi })
                        : '--'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Thực tế check-out:</span>
                    <span className={(booking as any)?.actual_check_out ? 'text-green-600 font-medium' : ''}>
                      {(booking as any)?.actual_check_out 
                        ? format(new Date((booking as any).actual_check_out), 'dd/MM/yyyy HH:mm', { locale: vi })
                        : '--'
                      }
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Financial Section */}
            <div className="border rounded-lg p-3 space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Thông tin thanh toán
              </h4>
              
              {/* Room Price & Deposit */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="roomPrice" className="text-xs text-muted-foreground">Giá phòng/đêm</Label>
                  <Input
                    id="roomPrice"
                    type="number"
                    min={0}
                    className="h-8"
                    value={roomPrice}
                    onChange={(e) => setRoomPrice(parseInt(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="depositAmount" className="text-xs text-muted-foreground">Tiền đặt cọc</Label>
                  <Input
                    id="depositAmount"
                    type="number"
                    min={0}
                    className="h-8"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(parseInt(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>
              </div>
              
              {/* Cost Summary - Always visible */}
              <div className="space-y-2 pt-2 border-t text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tiền phòng ({nights} đêm)</span>
                  <span>{formatCurrency(costBreakdown.roomTotal)}</span>
                </div>
                
                {/* Collapsible Details */}
                <Collapsible open={showPaymentDetails} onOpenChange={setShowPaymentDetails}>
                  <CollapsibleContent className="space-y-2">
                    {/* Surcharges */}
                    {costBreakdown.earlyCheckinCharge > 0 && (
                      <div className="flex justify-between text-amber-600">
                        <span>+ Phụ thu check-in sớm</span>
                        <span>{formatCurrency(costBreakdown.earlyCheckinCharge)}</span>
                      </div>
                    )}
                    {costBreakdown.lateCheckoutCharge > 0 && (
                      <div className="flex justify-between text-amber-600">
                        <span>+ Phụ thu check-out trễ</span>
                        <span>{formatCurrency(costBreakdown.lateCheckoutCharge)}</span>
                      </div>
                    )}
                    
                    {/* Service charges */}
                    {costBreakdown.serviceCharges > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">+ Dịch vụ sử dụng</span>
                        <span>{formatCurrency(costBreakdown.serviceCharges)}</span>
                      </div>
                    )}
                    
                    {/* Extra charges */}
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">+ Chi phí khác</span>
                      <Input
                        type="number"
                        min={0}
                        className="h-7 w-28 text-right"
                        value={extraCharges}
                        onChange={(e) => setExtraCharges(parseInt(e.target.value) || 0)}
                        placeholder="0"
                      />
                    </div>
                    
                    <Separator />
                    
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatCurrency(costBreakdown.subtotal)}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">VAT ({vatRate}%)</span>
                      <span>{formatCurrency(costBreakdown.vatAmount)}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Phí dịch vụ ({serviceFeeRate}%)</span>
                      <span>{formatCurrency(costBreakdown.serviceFeeAmount)}</span>
                    </div>
                  </CollapsibleContent>
                  
                  <CollapsibleTrigger asChild>
                    <Button type="button" variant="ghost" size="sm" className="w-full h-6 text-xs text-muted-foreground">
                      {showPaymentDetails ? (
                        <>Thu gọn <ChevronUp className="h-3 w-3 ml-1" /></>
                      ) : (
                        <>Xem chi tiết <ChevronDown className="h-3 w-3 ml-1" /></>
                      )}
                    </Button>
                  </CollapsibleTrigger>
                </Collapsible>
                
                <Separator />
                
                <div className="flex justify-between font-bold">
                  <span>TỔNG CỘNG</span>
                  <span>{formatCurrency(costBreakdown.totalAmount)}</span>
                </div>
                
                {depositAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Đã đặt cọc</span>
                    <span>-{formatCurrency(depositAmount)}</span>
                  </div>
                )}
                
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Đã thanh toán</span>
                  <Input
                    type="number"
                    min={0}
                    className="h-7 w-28 text-right"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(parseInt(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>
                
                <Separator />
                
                <div className="flex justify-between">
                  <span className="font-medium">CÒN LẠI</span>
                  <span className={cn(
                    "font-bold",
                    costBreakdown.remainingAmount > 0 ? "text-red-600" : "text-green-600"
                  )}>
                    {formatCurrency(costBreakdown.remainingAmount)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center pt-1">
                  <span className="text-muted-foreground text-xs">Trạng thái</span>
                  <span className={cn(
                    "text-xs font-medium",
                    costBreakdown.paymentStatus === 'paid' && "text-green-600",
                    costBreakdown.paymentStatus === 'partial' && "text-amber-600",
                    costBreakdown.paymentStatus === 'pending' && "text-red-600"
                  )}>
                    {costBreakdown.paymentStatus === 'paid' && 'Đã thanh toán đủ'}
                    {costBreakdown.paymentStatus === 'partial' && 'Thanh toán một phần'}
                    {costBreakdown.paymentStatus === 'pending' && 'Chưa thanh toán'}
                  </span>
                </div>
              </div>

              {/* Quick Payment Button */}
              {isEdit && costBreakdown.paymentStatus !== 'paid' && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full border-green-500 text-green-600 hover:bg-green-50"
                  onClick={handleReceivePayment}
                  disabled={isSubmitting}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Nhận thanh toán đầy đủ ({formatCurrency(costBreakdown.remainingAmount)})
                </Button>
              )}
            </div>
            
            {/* Status */}
            <div className="space-y-2">
              <Label>{t('booking.status')}</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="confirmed">{t('booking.statusConfirmed')}</SelectItem>
                  <SelectItem value="checked_in">{t('booking.statusCheckedIn')}</SelectItem>
                  <SelectItem value="checked_out">{t('booking.statusCheckedOut')}</SelectItem>
                  <SelectItem value="cancelled">{t('booking.statusCancelled')}</SelectItem>
                  <SelectItem value="no_show">{t('booking.statusNoShow')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">{t('booking.notes')}</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('booking.notesPlaceholder')}
                rows={2}
              />
            </div>
            
            {/* Quick Actions for existing booking */}
            {isEdit && booking && (
              <div className="flex gap-2 pt-2 border-t">
                {booking.status === 'confirmed' && (
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={handleCheckIn}
                    disabled={isSubmitting}
                  >
                    {t('booking.doCheckIn')}
                  </Button>
                )}
                {booking.status === 'checked_in' && (
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={handleCheckOutClick}
                    disabled={isSubmitting}
                  >
                    {t('booking.doCheckOut')}
                  </Button>
                )}
              </div>
            )}
            
            {/* Submit Buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                <X className="h-4 w-4 mr-2" />
                {t('common:cancel')}
              </Button>
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {isEdit ? t('common:save') : t('booking.addGuest')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Checkout Summary Dialog */}
      <CheckoutSummaryDialog
        open={showCheckoutSummary}
        onOpenChange={setShowCheckoutSummary}
        guestName={guestName}
        roomNumber={roomNumber}
        actualCheckoutTime={format(new Date(), 'HH:mm')}
        costBreakdown={costBreakdown}
        onConfirmCheckout={performCheckOut}
        onPayAndCheckout={handlePayAndCheckout}
        isLoading={isSubmitting}
      />
    </>
  )
}
