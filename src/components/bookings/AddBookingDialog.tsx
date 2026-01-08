import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { format, addDays, differenceInDays } from 'date-fns'
import { vi } from 'date-fns/locale'
import { 
  Calendar as CalendarIcon, 
  User, 
  Phone, 
  Mail, 
  Users, 
  Save, 
  X, 
  Loader2,
  Building2,
  CheckCircle2,
  Clock,
  CreditCard,
  Globe,
  Percent,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
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
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { cn, formatCurrency } from '@/lib/utils'
import { useAvailableRooms, AvailableRoom } from '@/hooks/useAvailableRooms'

interface SelectedRoomWithPrice extends AvailableRoom {
  customPrice: number
}
import { useTenant } from '@/hooks/useTenant'
import { useHotelContext } from '@/contexts/HotelContext'
import { BOOKING_SOURCES, TIME_OPTIONS } from '@/lib/constants'

interface AddBookingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function AddBookingDialog({
  open,
  onOpenChange,
  onSuccess,
}: AddBookingDialogProps) {
  const { t } = useTranslation(['rooms', 'common'])
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { tenant } = useTenant()
  const { isAllHotelsMode } = useHotelContext()
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedRooms, setSelectedRooms] = useState<SelectedRoomWithPrice[]>([])
  
  // Form state - Step 1: Dates & Times
  const [checkInDate, setCheckInDate] = useState<Date | undefined>(new Date())
  const [checkOutDate, setCheckOutDate] = useState<Date | undefined>(addDays(new Date(), 1))
  const [checkInTime, setCheckInTime] = useState('14:00')
  const [checkOutTime, setCheckOutTime] = useState('12:00')
  
  // Form state - Step 3: Guest Info
  const [guestName, setGuestName] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [guestCount, setGuestCount] = useState(1)
  const [bookingSource, setBookingSource] = useState('walk_in')
  const [bookingReference, setBookingReference] = useState('')
  const [notes, setNotes] = useState('')
  
  // Form state - Step 4: Pricing (roomPrice state removed - now per-room)
  const [depositAmount, setDepositAmount] = useState<number>(0)
  const [includeVat, setIncludeVat] = useState(true)
  const [vatRate, setVatRate] = useState(8)
  const [includeServiceFee, setIncludeServiceFee] = useState(true)
  const [serviceFeeRate, setServiceFeeRate] = useState(5)
  
  // Fetch available rooms based on selected dates
  const { data: availableRooms, isLoading: isLoadingRooms } = useAvailableRooms(
    checkInDate,
    checkOutDate
  )
  
  // Calculate nights
  const nights = useMemo(() => {
    if (!checkInDate || !checkOutDate) return 0
    return Math.max(1, differenceInDays(checkOutDate, checkInDate))
  }, [checkInDate, checkOutDate])
  
  // Calculate total room price for all selected rooms (using customPrice)
  const totalRoomPrice = useMemo(() => 
    selectedRooms.reduce((sum, room) => sum + (room.customPrice || 0), 0),
    [selectedRooms]
  )
  
  // Calculate subtotal (total room price x nights)
  const subtotal = useMemo(() => totalRoomPrice * nights, [totalRoomPrice, nights])
  
  // Calculate VAT amount
  const vatAmount = useMemo(() => 
    includeVat ? Math.round(subtotal * vatRate / 100) : 0,
    [subtotal, includeVat, vatRate]
  )
  
  // Calculate Service Fee amount
  const serviceFeeAmount = useMemo(() => 
    includeServiceFee ? Math.round(subtotal * serviceFeeRate / 100) : 0,
    [subtotal, includeServiceFee, serviceFeeRate]
  )
  
  // Calculate estimated total (subtotal + VAT + Service Fee)
  const estimatedTotal = useMemo(() => subtotal + vatAmount + serviceFeeAmount, [subtotal, vatAmount, serviceFeeAmount])
  
  // Remaining amount after deposit
  const remainingAmount = useMemo(() => 
    Math.max(0, estimatedTotal - depositAmount), 
    [estimatedTotal, depositAmount]
  )
  
  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedRooms([])
      setGuestName('')
      setGuestPhone('')
      setGuestEmail('')
      setGuestCount(1)
      setCheckInDate(new Date())
      setCheckOutDate(addDays(new Date(), 1))
      setCheckInTime('14:00')
      setCheckOutTime('12:00')
      setBookingSource('walk_in')
      setBookingReference('')
      setNotes('')
      setDepositAmount(0)
      setIncludeVat(true)
      setVatRate(8)
      setIncludeServiceFee(true)
      setServiceFeeRate(5)
    }
  }, [open])
  
  // Clear room selection when dates change
  useEffect(() => {
    setSelectedRooms([])
    setDepositAmount(0)
  }, [checkInDate, checkOutDate])
  
  // Toggle room selection with customPrice
  const toggleRoomSelection = (room: AvailableRoom) => {
    setSelectedRooms(prev => {
      const exists = prev.find(r => r.id === room.id)
      if (exists) {
        return prev.filter(r => r.id !== room.id)
      } else {
        // Add room with customPrice initialized from base_price
        return [...prev, { 
          ...room, 
          customPrice: room.base_price || 0 
        }]
      }
    })
  }
  
  // Update price for a specific room
  const updateRoomPrice = (roomId: string, newPrice: number) => {
    setSelectedRooms(prev => prev.map(room => 
      room.id === roomId 
        ? { ...room, customPrice: newPrice }
        : room
    ))
  }
  
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (selectedRooms.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Vui lòng chọn ít nhất 1 phòng',
      })
      return
    }
    
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
    
    // Validate room prices - each room must have a valid price
    const hasInvalidPrice = selectedRooms.some(room => (room.customPrice || 0) <= 0)
    if (hasInvalidPrice) {
      toast({
        variant: 'destructive',
        title: 'Vui lòng nhập giá cho tất cả các phòng',
      })
      return
    }
    
    setIsSubmitting(true)
    
    try {
      // Generate group ID if booking multiple rooms
      const bookingGroupId = selectedRooms.length > 1 ? crypto.randomUUID() : null
      
      // Calculate per-room values
      const depositPerRoom = Math.round(depositAmount / selectedRooms.length)
      const vatPerRoom = Math.round(vatAmount / selectedRooms.length)
      const serviceFeePerRoom = Math.round(serviceFeeAmount / selectedRooms.length)
      const subtotalPerRoom = Math.round(subtotal / selectedRooms.length)
      const totalPerRoom = Math.round(estimatedTotal / selectedRooms.length)
      
      // Create booking data for each room
      const bookingsData = selectedRooms.map((room, index) => {
        const roomPriceValue = room.customPrice
        const isLastRoom = index === selectedRooms.length - 1
        
        // For last room, use remaining amount to avoid rounding errors
        const roomDeposit = isLastRoom 
          ? depositAmount - (depositPerRoom * (selectedRooms.length - 1))
          : depositPerRoom
        const roomVat = includeVat ? Math.round(roomPriceValue * nights * vatRate / 100) : 0
        const roomServiceFee = includeServiceFee ? Math.round(roomPriceValue * nights * serviceFeeRate / 100) : 0
        const roomSubtotal = roomPriceValue * nights
        const roomTotal = roomSubtotal + roomVat + roomServiceFee
        
        return {
          room_id: room.id,
          hotel_id: room.hotel_id,
          tenant_id: tenant?.id,
          guest_name: guestName.trim(),
          guest_phone: guestPhone.trim() || null,
          guest_email: guestEmail.trim() || null,
          guest_count: selectedRooms.length === 1 ? guestCount : Math.ceil(guestCount / selectedRooms.length),
          check_in_date: format(checkInDate, 'yyyy-MM-dd'),
          check_out_date: format(checkOutDate, 'yyyy-MM-dd'),
          expected_check_in_time: checkInTime,
          expected_check_out_time: checkOutTime,
          status: 'confirmed',
          notes: notes.trim() || null,
          room_price: roomPriceValue,
          deposit_amount: roomDeposit,
          amount_paid: roomDeposit,
          payment_status: roomDeposit >= roomTotal ? 'paid' : roomDeposit > 0 ? 'partial' : 'pending',
          booking_source: bookingSource,
          booking_reference: bookingReference.trim() || null,
          subtotal: roomSubtotal,
          vat_rate: includeVat ? vatRate : 0,
          vat_amount: roomVat,
          service_fee_rate: includeServiceFee ? serviceFeeRate : 0,
          service_fee_amount: roomServiceFee,
          total_amount: roomTotal,
          booking_group_id: bookingGroupId,
        }
      })
      
      const { error } = await supabase
        .from('room_bookings')
        .insert(bookingsData)
        
      if (error) throw error
      
      toast({
        title: selectedRooms.length > 1 
          ? `Đã đặt ${selectedRooms.length} phòng thành công`
          : t('booking.createSuccess'),
        description: depositAmount > 0 
          ? `Đã đặt cọc ${formatCurrency(depositAmount)}`
          : undefined,
      })
      
      queryClient.invalidateQueries({ queryKey: ['all-bookings'] })
      queryClient.invalidateQueries({ queryKey: ['available-rooms'] })
      onSuccess?.()
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
  
  const getRoomTypeLabel = (type: string) => {
    switch (type) {
      case 'single': return 'Đơn'
      case 'double': return 'Đôi'
      case 'twin': return 'Twin'
      case 'suite': return 'Suite'
      case 'deluxe': return 'Deluxe'
      case 'vip': return 'VIP'
      default: return type
    }
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Thêm đặt phòng mới</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Select Dates & Times */}
          <div className="space-y-3">
            <h3 className="font-medium flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm">1</span>
              Chọn ngày & giờ check-in/out
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {/* Check-in Date & Time */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  Check-in *
                </Label>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "flex-1 justify-start text-left font-normal",
                          !checkInDate && "text-muted-foreground"
                        )}
                      >
                        {checkInDate ? format(checkInDate, 'dd/MM/yyyy', { locale: vi }) : "Chọn ngày"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={checkInDate}
                        onSelect={setCheckInDate}
                        locale={vi}
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <Select value={checkInTime} onValueChange={setCheckInTime}>
                    <SelectTrigger className="w-24">
                      <Clock className="h-4 w-4 mr-1" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_OPTIONS.map(time => (
                        <SelectItem key={time} value={time}>{time}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Check-out Date & Time */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  Check-out *
                </Label>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "flex-1 justify-start text-left font-normal",
                          !checkOutDate && "text-muted-foreground"
                        )}
                      >
                        {checkOutDate ? format(checkOutDate, 'dd/MM/yyyy', { locale: vi }) : "Chọn ngày"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={checkOutDate}
                        onSelect={setCheckOutDate}
                        disabled={(date) => checkInDate ? date <= checkInDate : false}
                        locale={vi}
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <Select value={checkOutTime} onValueChange={setCheckOutTime}>
                    <SelectTrigger className="w-24">
                      <Clock className="h-4 w-4 mr-1" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_OPTIONS.map(time => (
                        <SelectItem key={time} value={time}>{time}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            {nights > 0 && (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                Số đêm: <strong>{nights} đêm</strong>
              </div>
            )}
          </div>
          
          {/* Step 2: Select Rooms (Multi-select) */}
          <div className="space-y-3">
            <h3 className="font-medium flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm">2</span>
              Chọn phòng trống
              {availableRooms && (
                <Badge variant="secondary" className="ml-2">
                  {availableRooms.length} phòng
                </Badge>
              )}
              {selectedRooms.length > 0 && (
                <Badge variant="default" className="ml-1">
                  Đã chọn {selectedRooms.length}
                </Badge>
              )}
            </h3>
            
            <p className="text-xs text-muted-foreground">
              Click để chọn/bỏ chọn phòng. Có thể chọn nhiều phòng cùng lúc.
            </p>
            
            {isLoadingRooms ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : availableRooms && availableRooms.length > 0 ? (
              <ScrollArea className="h-[180px] rounded-md border p-2">
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                  {availableRooms.map((room) => {
                    const isSelected = selectedRooms.some(r => r.id === room.id)
                    return (
                      <button
                        key={room.id}
                        type="button"
                        onClick={() => toggleRoomSelection(room)}
                        className={cn(
                          "relative flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all hover:border-primary/50",
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border"
                        )}
                      >
                        {isSelected && (
                          <CheckCircle2 className="absolute top-1 right-1 h-4 w-4 text-primary" />
                        )}
                        <Building2 className="h-5 w-5 text-muted-foreground mb-1" />
                        <span className="font-semibold text-sm">{room.room_number}</span>
                        <span className="text-xs text-muted-foreground">
                          T{room.floor} • {getRoomTypeLabel(room.room_type)}
                        </span>
                        {room.base_price && room.base_price > 0 && (
                          <span className="text-xs font-medium text-primary">
                            {formatCurrency(room.base_price)}
                          </span>
                        )}
                        {isAllHotelsMode && room.hotel_name && (
                          <span className="text-xs text-muted-foreground truncate max-w-full">
                            {room.hotel_name}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-8 text-muted-foreground border rounded-lg">
                <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Không có phòng trống trong khoảng thời gian này</p>
              </div>
            )}
            
            {selectedRooms.length > 0 && (
              <div className="p-3 bg-primary/5 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="text-sm font-medium">
                      Đã chọn {selectedRooms.length} phòng - Nhập giá mỗi phòng:
                    </span>
                  </div>
                </div>
                
                {/* Per-room price inputs */}
                <div className="space-y-2">
                  {selectedRooms.map(room => (
                    <div key={room.id} className="flex items-center gap-2 p-2 bg-background rounded border">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="font-medium text-sm">{room.room_number}</span>
                          <span className="text-xs text-muted-foreground">
                            T{room.floor} • {getRoomTypeLabel(room.room_type)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={room.customPrice > 0 ? room.customPrice.toString() : ''}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9]/g, '')
                            updateRoomPrice(room.id, parseInt(value) || 0)
                          }}
                          placeholder="Giá/đêm"
                          className="w-28 h-8 text-right"
                        />
                        <span className="text-xs text-muted-foreground whitespace-nowrap">đ/đêm</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => toggleRoomSelection(room)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Room total summary */}
                <div className="flex justify-between items-center pt-2 border-t text-sm">
                  <span className="text-muted-foreground">Tổng giá phòng/đêm:</span>
                  <span className="font-medium text-primary">{formatCurrency(totalRoomPrice)}</span>
                </div>
              </div>
            )}
          </div>
          
          {/* Step 3: Guest Information */}
          <div className="space-y-3">
            <h3 className="font-medium flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm">3</span>
              Thông tin khách
            </h3>
            
            <div className="grid gap-3">
              {/* Guest Name */}
              <div className="space-y-2">
                <Label htmlFor="guestName" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Tên khách *
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
                    Số điện thoại
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
                    Email
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
              
              {/* Guest Count & Booking Source */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="guestCount" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Số khách
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
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Nguồn đặt phòng
                  </Label>
                  <Select value={bookingSource} onValueChange={setBookingSource}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BOOKING_SOURCES.map(source => (
                        <SelectItem key={source.value} value={source.value}>
                          {source.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Booking Reference & Notes */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="bookingReference">Mã đặt phòng OTA</Label>
                  <Input
                    id="bookingReference"
                    value={bookingReference}
                    onChange={(e) => setBookingReference(e.target.value)}
                    placeholder="ABC123..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Ghi chú</Label>
                  <Input
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="VIP, yêu cầu đặc biệt..."
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* Step 4: Pricing & Deposit */}
          <div className="space-y-3">
            <h3 className="font-medium flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm">4</span>
              Báo giá & Đặt cọc
            </h3>
            
            <div className="grid gap-3 p-4 border rounded-lg bg-muted/30">
              {/* Room Price Summary (prices are set in Step 2) */}
              {selectedRooms.length > 0 ? (
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Giá phòng × {nights} đêm:
                    </span>
                    <span className="font-medium">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {selectedRooms.map(r => `${r.room_number}: ${formatCurrency(r.customPrice)}`).join(' • ')}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground text-center py-2">
                  Vui lòng chọn phòng ở bước 2
                </div>
              )}
              
              {/* VAT Toggle & Input */}
              <div className="flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeVat}
                    onChange={(e) => setIncludeVat(e.target.checked)}
                    className="h-4 w-4 rounded border-border"
                  />
                  <span className="text-sm">Bao gồm VAT</span>
                </label>
                {includeVat && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={vatRate > 0 ? vatRate.toString() : ''}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, '')
                        setVatRate(Math.min(100, parseInt(value) || 0))
                      }}
                      className="w-16 h-8 text-center"
                      placeholder="8"
                    />
                    <Percent className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </div>
              
              {/* VAT Amount */}
              {includeVat && vatAmount > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Thuế VAT ({vatRate}%)</span>
                  <span className="font-medium">{formatCurrency(vatAmount)}</span>
                </div>
              )}
              
              {/* Service Fee Toggle & Input */}
              <div className="flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeServiceFee}
                    onChange={(e) => setIncludeServiceFee(e.target.checked)}
                    className="h-4 w-4 rounded border-border"
                  />
                  <span className="text-sm">Phí dịch vụ</span>
                </label>
                {includeServiceFee && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={serviceFeeRate > 0 ? serviceFeeRate.toString() : ''}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, '')
                        setServiceFeeRate(Math.min(100, parseInt(value) || 0))
                      }}
                      className="w-16 h-8 text-center"
                      placeholder="5"
                    />
                    <Percent className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </div>
              
              {/* Service Fee Amount */}
              {includeServiceFee && serviceFeeAmount > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Phí dịch vụ ({serviceFeeRate}%)</span>
                  <span className="font-medium">{formatCurrency(serviceFeeAmount)}</span>
                </div>
              )}
              
              {/* Estimated Total */}
              <div className="flex justify-between items-center py-2 border-t">
                <span className="text-sm font-medium">TỔNG TIỀN DỰ KIẾN</span>
                <span className="font-semibold text-lg text-primary">{formatCurrency(estimatedTotal)}</span>
              </div>
              <p className="text-xs text-muted-foreground -mt-2">
                (chưa bao gồm phụ thu check-in sớm/trả phòng muộn)
              </p>
              
              {/* Deposit */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                <div className="space-y-2">
                  <Label htmlFor="depositAmount" className="flex items-center gap-2">
                    Đặt cọc trước
                  </Label>
                  <Input
                    id="depositAmount"
                    type="text"
                    inputMode="numeric"
                    value={depositAmount > 0 ? depositAmount.toString() : ''}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, '')
                      setDepositAmount(parseInt(value) || 0)
                    }}
                    placeholder="0"
                  />
                  {depositAmount > 0 && (
                    <span className="text-xs text-muted-foreground">
                      = {formatCurrency(depositAmount)}
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Còn lại (khi checkout)</Label>
                  <div className={cn(
                    "h-9 flex items-center px-3 border rounded-md font-medium",
                    remainingAmount === 0 ? "bg-green-50 text-green-600 border-green-200" : "bg-muted"
                  )}>
                    {formatCurrency(remainingAmount)}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Submit Buttons */}
          <div className="flex gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              <X className="h-4 w-4 mr-2" />
              Hủy
            </Button>
            <Button 
              type="submit" 
              className="flex-1" 
              disabled={isSubmitting || selectedRooms.length === 0}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Thêm đặt phòng
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}