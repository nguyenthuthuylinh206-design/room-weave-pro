import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { 
  User, 
  Calendar, 
  Phone, 
  Mail, 
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Edit2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useRoomBooking, RoomBooking } from '@/hooks/useRoomBooking'
import { RoomBookingDialog } from './RoomBookingDialog'
import { format, differenceInDays, isToday, isTomorrow } from 'date-fns'
import { vi } from 'date-fns/locale'

interface GuestInfoCardProps {
  roomId: string
  hotelId?: string
  tenantId?: string
  roomNumber?: string
  compact?: boolean
  canEdit?: boolean
}

export function GuestInfoCard({ 
  roomId, 
  hotelId = '',
  tenantId = '',
  roomNumber = '',
  compact = false,
  canEdit = true,
}: GuestInfoCardProps) {
  const { t } = useTranslation(['rooms'])
  const { data: booking, isLoading } = useRoomBooking(roomId)
  const [showBookingDialog, setShowBookingDialog] = useState(false)
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    )
  }
  
  if (!booking) {
    return (
      <>
        <Card className="border-dashed">
          <CardContent className="py-6 text-center">
            <User className="h-8 w-8 mx-auto text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground mt-2">
              {t('detail.noCurrentGuest')}
            </p>
            {canEdit && hotelId && tenantId && (
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-3"
                onClick={() => setShowBookingDialog(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('booking.addGuest')}
              </Button>
            )}
          </CardContent>
        </Card>
        
        {canEdit && hotelId && tenantId && (
          <RoomBookingDialog
            open={showBookingDialog}
            onOpenChange={setShowBookingDialog}
            roomId={roomId}
            roomNumber={roomNumber}
            hotelId={hotelId}
            tenantId={tenantId}
          />
        )}
      </>
    )
  }
  
  const checkInDate = new Date(booking.check_in_date)
  const checkOutDate = new Date(booking.check_out_date)
  const stayDuration = differenceInDays(checkOutDate, checkInDate)
  const isCheckingOutToday = isToday(checkOutDate)
  const isCheckingOutTomorrow = isTomorrow(checkOutDate)
  
  const getStatusBadge = () => {
    switch (booking.status) {
      case 'checked_in':
        return <Badge className="bg-green-500">{t('detail.guestStatus.checkedIn')}</Badge>
      case 'confirmed':
        return <Badge variant="secondary">{t('detail.guestStatus.confirmed')}</Badge>
      default:
        return null
    }
  }
  
  if (compact) {
    return (
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">{booking.guest_name}</p>
                <p className="text-xs text-muted-foreground">
                  {format(checkInDate, 'dd/MM')} - {format(checkOutDate, 'dd/MM')} • {stayDuration} đêm
                </p>
              </div>
            </div>
            {getStatusBadge()}
          </div>
          {isCheckingOutToday && (
            <div className="mt-2 p-2 bg-orange-50 dark:bg-orange-950/30 rounded border border-orange-200 dark:border-orange-800">
              <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
                <AlertCircle className="h-4 w-4" />
                <span className="text-xs font-medium">Checkout hôm nay</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }
  
  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">{t('detail.currentGuest')}</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge()}
              {canEdit && hotelId && tenantId && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setShowBookingDialog(true)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      <CardContent className="space-y-4">
        {/* Guest Name */}
        <div>
          <p className="text-lg font-semibold">{booking.guest_name}</p>
          {booking.guest_count > 1 && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
              <Users className="h-3.5 w-3.5" />
              <span>{t('detail.guestCount', { count: booking.guest_count })}</span>
            </div>
          )}
        </div>
        
        {/* Contact Info */}
        {(booking.guest_phone || booking.guest_email) && (
          <div className="space-y-1">
            {booking.guest_phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{booking.guest_phone}</span>
              </div>
            )}
            {booking.guest_email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{booking.guest_email}</span>
              </div>
            )}
          </div>
        )}
        
        {/* Dates */}
        <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg">
          <div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
              <Calendar className="h-3 w-3" />
              <span>Check-in</span>
            </div>
            <p className="font-medium">{format(checkInDate, 'dd/MM/yyyy', { locale: vi })}</p>
            {booking.actual_check_in && (
              <p className="text-xs text-muted-foreground">
                {format(new Date(booking.actual_check_in), 'HH:mm')}
              </p>
            )}
          </div>
          <div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
              <Calendar className="h-3 w-3" />
              <span>Check-out</span>
            </div>
            <p className={`font-medium ${isCheckingOutToday ? 'text-orange-600' : ''}`}>
              {format(checkOutDate, 'dd/MM/yyyy', { locale: vi })}
            </p>
            {isCheckingOutToday && (
              <Badge variant="outline" className="text-[10px] border-orange-500 text-orange-600 mt-1">
                Hôm nay
              </Badge>
            )}
            {isCheckingOutTomorrow && (
              <Badge variant="outline" className="text-[10px] mt-1">
                Ngày mai
              </Badge>
            )}
          </div>
        </div>
        
        {/* Stay Duration */}
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>{t('detail.stayDuration', { nights: stayDuration })}</span>
        </div>
        
        {/* Notes */}
        {booking.notes && (
          <div className="p-2 bg-muted/30 rounded border text-sm">
            <p className="text-xs text-muted-foreground mb-1">{t('detail.bookingNotes')}:</p>
            <p>{booking.notes}</p>
          </div>
        )}
      </CardContent>
      </Card>
      
      {canEdit && hotelId && tenantId && (
        <RoomBookingDialog
          open={showBookingDialog}
          onOpenChange={setShowBookingDialog}
          roomId={roomId}
          roomNumber={roomNumber}
          hotelId={hotelId}
          tenantId={tenantId}
          booking={booking}
        />
      )}
    </>
  )
}
