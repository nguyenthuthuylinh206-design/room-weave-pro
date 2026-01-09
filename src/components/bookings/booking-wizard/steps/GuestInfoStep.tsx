import { User, Phone, Mail, Users, Globe } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BOOKING_SOURCES } from '@/lib/constants'
import { BookingFormState, BookingFormComputed } from '../types'

interface GuestInfoStepProps {
  state: BookingFormState
  computed: BookingFormComputed
  onUpdate: (data: Partial<BookingFormState>) => void
}

export function GuestInfoStep({ state, computed, onUpdate }: GuestInfoStepProps) {
  return (
    <div className="space-y-4">
      {/* Guest Name */}
      <div className="space-y-2">
        <Label htmlFor="guestName" className="flex items-center gap-2">
          <User className="h-4 w-4" />
          Tên khách *
        </Label>
        <Input
          id="guestName"
          value={state.guestName}
          onChange={(e) => onUpdate({ guestName: e.target.value })}
          placeholder="Nhập tên khách hàng"
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
            value={state.guestPhone}
            onChange={(e) => onUpdate({ guestPhone: e.target.value })}
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
            value={state.guestEmail}
            onChange={(e) => onUpdate({ guestEmail: e.target.value })}
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
            value={state.guestCount}
            onChange={(e) => onUpdate({ guestCount: parseInt(e.target.value) || 1 })}
          />
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Nguồn đặt phòng
          </Label>
          <Select value={state.bookingSource} onValueChange={(v) => onUpdate({ bookingSource: v })}>
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
            value={state.bookingReference}
            onChange={(e) => onUpdate({ bookingReference: e.target.value })}
            placeholder="ABC123..."
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="notes">Ghi chú</Label>
          <Input
            id="notes"
            value={state.notes}
            onChange={(e) => onUpdate({ notes: e.target.value })}
            placeholder="VIP, yêu cầu đặc biệt..."
          />
        </div>
      </div>
    </div>
  )
}
