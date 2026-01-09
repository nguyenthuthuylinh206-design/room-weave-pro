import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Calendar as CalendarIcon, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Label } from '@/components/ui/label'
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
import { cn } from '@/lib/utils'
import { TIME_OPTIONS } from '@/lib/constants'
import { BookingFormState, BookingFormComputed } from '../types'

interface DateTimeStepProps {
  state: BookingFormState
  computed: BookingFormComputed
  onUpdate: (data: Partial<BookingFormState>) => void
}

export function DateTimeStep({ state, computed, onUpdate }: DateTimeStepProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
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
                    !state.checkInDate && "text-muted-foreground"
                  )}
                >
                  {state.checkInDate ? format(state.checkInDate, 'dd/MM/yyyy', { locale: vi }) : "Chọn ngày"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={state.checkInDate}
                  onSelect={(date) => onUpdate({ checkInDate: date })}
                  locale={vi}
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            <Select value={state.checkInTime} onValueChange={(v) => onUpdate({ checkInTime: v })}>
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
                    !state.checkOutDate && "text-muted-foreground"
                  )}
                >
                  {state.checkOutDate ? format(state.checkOutDate, 'dd/MM/yyyy', { locale: vi }) : "Chọn ngày"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={state.checkOutDate}
                  onSelect={(date) => onUpdate({ checkOutDate: date })}
                  disabled={(date) => state.checkInDate ? date <= state.checkInDate : false}
                  locale={vi}
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            <Select value={state.checkOutTime} onValueChange={(v) => onUpdate({ checkOutTime: v })}>
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
      
      {computed.nights > 0 && (
        <div className="p-4 bg-primary/5 rounded-lg text-center">
          <span className="text-sm text-muted-foreground">Số đêm:</span>
          <span className="ml-2 text-2xl font-bold text-primary">{computed.nights}</span>
          <span className="ml-1 text-sm text-muted-foreground">đêm</span>
        </div>
      )}
    </div>
  )
}
