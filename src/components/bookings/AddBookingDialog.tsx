import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { format, addDays } from 'date-fns'
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
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from '@/components/ui/calendar'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { cn } from '@/lib/utils'
import { useAvailableRooms, AvailableRoom } from '@/hooks/useAvailableRooms'
import { useTenant } from '@/hooks/useTenant'
import { useHotelContext } from '@/contexts/HotelContext'

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
  const { selectedHotel, isAllHotelsMode } = useHotelContext()
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState<AvailableRoom | null>(null)
  
  // Form state
  const [guestName, setGuestName] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [guestCount, setGuestCount] = useState(1)
  const [checkInDate, setCheckInDate] = useState<Date | undefined>(new Date())
  const [checkOutDate, setCheckOutDate] = useState<Date | undefined>(addDays(new Date(), 1))
  const [notes, setNotes] = useState('')
  
  // Fetch available rooms based on selected dates
  const { data: availableRooms, isLoading: isLoadingRooms } = useAvailableRooms(
    checkInDate,
    checkOutDate
  )
  
  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedRoom(null)
      setGuestName('')
      setGuestPhone('')
      setGuestEmail('')
      setGuestCount(1)
      setCheckInDate(new Date())
      setCheckOutDate(addDays(new Date(), 1))
      setNotes('')
    }
  }, [open])
  
  // Clear room selection when dates change
  useEffect(() => {
    setSelectedRoom(null)
  }, [checkInDate, checkOutDate])
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedRoom) {
      toast({
        variant: 'destructive',
        title: 'Vui lòng chọn phòng',
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
    
    setIsSubmitting(true)
    
    try {
      const bookingData = {
        room_id: selectedRoom.id,
        hotel_id: selectedRoom.hotel_id,
        tenant_id: tenant?.id,
        guest_name: guestName.trim(),
        guest_phone: guestPhone.trim() || null,
        guest_email: guestEmail.trim() || null,
        guest_count: guestCount,
        check_in_date: format(checkInDate, 'yyyy-MM-dd'),
        check_out_date: format(checkOutDate, 'yyyy-MM-dd'),
        status: 'confirmed',
        notes: notes.trim() || null,
      }
      
      const { error } = await supabase
        .from('room_bookings')
        .insert(bookingData)
        
      if (error) throw error
      
      toast({
        title: t('booking.createSuccess'),
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
          {/* Step 1: Select Dates */}
          <div className="space-y-3">
            <h3 className="font-medium flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm">1</span>
              Chọn ngày check-in/out
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  Check-in *
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
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
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  Check-out *
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
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
              </div>
            </div>
          </div>
          
          {/* Step 2: Select Room */}
          <div className="space-y-3">
            <h3 className="font-medium flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm">2</span>
              Chọn phòng trống
              {availableRooms && (
                <Badge variant="secondary" className="ml-2">
                  {availableRooms.length} phòng
                </Badge>
              )}
            </h3>
            
            {isLoadingRooms ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : availableRooms && availableRooms.length > 0 ? (
              <ScrollArea className="h-[200px] rounded-md border p-2">
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                  {availableRooms.map((room) => (
                    <button
                      key={room.id}
                      type="button"
                      onClick={() => setSelectedRoom(room)}
                      className={cn(
                        "relative flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all hover:border-primary/50",
                        selectedRoom?.id === room.id
                          ? "border-primary bg-primary/5"
                          : "border-border"
                      )}
                    >
                      {selectedRoom?.id === room.id && (
                        <CheckCircle2 className="absolute top-1 right-1 h-4 w-4 text-primary" />
                      )}
                      <Building2 className="h-5 w-5 text-muted-foreground mb-1" />
                      <span className="font-semibold text-sm">{room.room_number}</span>
                      <span className="text-xs text-muted-foreground">
                        T{room.floor} • {getRoomTypeLabel(room.room_type)}
                      </span>
                      {isAllHotelsMode && room.hotel_name && (
                        <span className="text-xs text-muted-foreground truncate max-w-full">
                          {room.hotel_name}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-8 text-muted-foreground border rounded-lg">
                <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Không có phòng trống trong khoảng thời gian này</p>
              </div>
            )}
            
            {selectedRoom && (
              <div className="flex items-center gap-2 p-2 bg-primary/5 rounded-lg">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span className="text-sm">
                  Đã chọn: <strong>Phòng {selectedRoom.room_number}</strong> 
                  {' '}(Tầng {selectedRoom.floor}, {getRoomTypeLabel(selectedRoom.room_type)})
                </span>
              </div>
            )}
          </div>
          
          {/* Step 3: Guest Information */}
          <div className="space-y-3">
            <h3 className="font-medium flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm">3</span>
              Thông tin khách
            </h3>
            
            <div className="grid gap-4">
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
              
              {/* Guest Count & Notes */}
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
              disabled={isSubmitting || !selectedRoom}
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
