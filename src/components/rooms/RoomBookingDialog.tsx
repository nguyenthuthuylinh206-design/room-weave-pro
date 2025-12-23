import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { format, addDays } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Calendar as CalendarIcon, User, Phone, Mail, Users, Save, X, Loader2 } from 'lucide-react'
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
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { cn } from '@/lib/utils'
import type { RoomBooking } from '@/hooks/useRoomBooking'

interface RoomBookingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  roomId: string
  roomNumber: string
  hotelId: string
  tenantId: string
  booking?: RoomBooking | null
}

export function RoomBookingDialog({
  open,
  onOpenChange,
  roomId,
  roomNumber,
  hotelId,
  tenantId,
  booking,
}: RoomBookingDialogProps) {
  const { t } = useTranslation(['rooms', 'common'])
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  const isEdit = !!booking
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [guestName, setGuestName] = useState(booking?.guest_name || '')
  const [guestPhone, setGuestPhone] = useState(booking?.guest_phone || '')
  const [guestEmail, setGuestEmail] = useState(booking?.guest_email || '')
  const [guestCount, setGuestCount] = useState(booking?.guest_count || 1)
  const [checkInDate, setCheckInDate] = useState<Date | undefined>(
    booking?.check_in_date ? new Date(booking.check_in_date) : new Date()
  )
  const [checkOutDate, setCheckOutDate] = useState<Date | undefined>(
    booking?.check_out_date ? new Date(booking.check_out_date) : addDays(new Date(), 1)
  )
  const [status, setStatus] = useState(booking?.status || 'confirmed')
  const [notes, setNotes] = useState(booking?.notes || '')
  
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
        status,
        notes: notes.trim() || null,
        actual_check_in: status === 'checked_in' ? new Date().toISOString() : null,
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
      
      queryClient.invalidateQueries({ queryKey: ['room-booking', roomId] })
      queryClient.invalidateQueries({ queryKey: ['room-bookings', roomId] })
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
      const { error } = await supabase
        .from('room_bookings')
        .update({
          status: 'checked_in',
          actual_check_in: new Date().toISOString(),
        })
        .eq('id', booking.id)
        
      if (error) throw error
      
      toast({
        title: t('booking.checkInSuccess'),
      })
      
      queryClient.invalidateQueries({ queryKey: ['room-booking', roomId] })
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
  
  const handleCheckOut = async () => {
    if (!booking) return
    
    setIsSubmitting(true)
    try {
      const { error } = await supabase
        .from('room_bookings')
        .update({
          status: 'checked_out',
          actual_check_out: new Date().toISOString(),
        })
        .eq('id', booking.id)
        
      if (error) throw error
      
      toast({
        title: t('booking.checkOutSuccess'),
      })
      
      queryClient.invalidateQueries({ queryKey: ['room-booking', roomId] })
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
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
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
          
          {/* Dates Row */}
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
                  />
                </PopoverContent>
              </Popover>
            </div>
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
                  onClick={handleCheckOut}
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
  )
}
