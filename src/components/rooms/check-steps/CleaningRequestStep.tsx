import { UseFormReturn } from 'react-hook-form'
import { CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react'
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import type { RoomCheckFormData } from '@/types/rooms.types'

interface CleaningRequestStepProps {
  form: UseFormReturn<RoomCheckFormData>
}

const ROOM_CONDITIONS = [
  { value: 'clean', label: 'Sạch', icon: CheckCircle, color: 'text-green-600', selectedBg: 'bg-green-50 border-green-500 text-green-700' },
  { value: 'dirty', label: 'Bẩn nhẹ', icon: AlertCircle, color: 'text-amber-600', selectedBg: 'bg-amber-50 border-amber-500 text-amber-700' },
  { value: 'very_dirty', label: 'Rất bẩn', icon: AlertTriangle, color: 'text-red-600', selectedBg: 'bg-red-50 border-red-500 text-red-700' },
] as const

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Thấp' },
  { value: 'medium', label: 'Trung bình' },
  { value: 'high', label: 'Cao' },
  { value: 'urgent', label: 'Khẩn cấp' },
] as const

export function CleaningRequestStep({ form }: CleaningRequestStepProps) {
  const roomCondition = form.watch('room_condition')
  const needsCleaning = form.watch('needs_cleaning')
  
  const handleConditionChange = (value: string) => {
    form.setValue('room_condition', value as 'clean' | 'dirty' | 'very_dirty')
    
    if (value === 'clean') {
      form.setValue('needs_cleaning', false)
      form.setValue('cleaning_priority', 'medium')
    } else {
      form.setValue('needs_cleaning', true)
      form.setValue('cleaning_priority', value === 'very_dirty' ? 'high' : 'medium')
    }
  }

  return (
    <div className="space-y-4">
      {/* Room Condition — 3 chips ngang hàng */}
      <FormField
        control={form.control}
        name="room_condition"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-medium">Tình trạng phòng</FormLabel>
            <FormControl>
              <div className="grid grid-cols-3 gap-2 pt-1">
                {ROOM_CONDITIONS.map((condition) => {
                  const Icon = condition.icon
                  const isSelected = field.value === condition.value
                  return (
                    <button
                      key={condition.value}
                      type="button"
                      onClick={() => handleConditionChange(condition.value)}
                      className={cn(
                        'flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all',
                        isSelected
                          ? condition.selectedBg
                          : 'border-border bg-background text-muted-foreground hover:bg-muted/50'
                      )}
                    >
                      <Icon className={cn('h-4 w-4', isSelected ? condition.color : 'text-muted-foreground')} />
                      {condition.label}
                    </button>
                  )
                })}
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Needs Cleaning Checkbox */}
      {roomCondition && roomCondition !== 'clean' && (
        <FormField
          control={form.control}
          name="needs_cleaning"
          render={({ field }) => (
            <FormItem className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className="mt-0.5"
                />
              </FormControl>
              <div className="flex-1">
                <FormLabel className="text-sm font-medium cursor-pointer">
                  Yêu cầu dọn dẹp ngay
                </FormLabel>
                <p className="text-xs text-muted-foreground">
                  Gửi thông báo cho quản lý để phân công nhân viên dọn phòng
                </p>
              </div>
            </FormItem>
          )}
        />
      )}

      {/* Priority & Notes — khi cần dọn */}
      {needsCleaning && (
        <div className="space-y-3 animate-in slide-in-from-top-2 duration-200">
          <FormField
            control={form.control}
            name="cleaning_priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">Mức độ ưu tiên</FormLabel>
                <Select value={field.value || 'medium'} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Chọn mức độ ưu tiên" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="z-[200]">
                    {PRIORITY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="cleaning_notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">Ghi chú dọn dẹp</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="VD: Khách để lại nhiều rác, cần đổi ga giường..."
                    className="min-h-[60px] text-sm resize-none"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}

      {/* Summary — compact */}
      <div className="px-3 py-2 rounded-lg border bg-muted/20 text-xs text-muted-foreground">
        {(!roomCondition || roomCondition === 'clean') && !needsCleaning && (
          <p>Sau khi hoàn tất → Phòng chuyển sang <strong className="text-green-600">Trống</strong></p>
        )}
        {needsCleaning && (
          <p>Sau khi hoàn tất → Phòng chuyển sang <strong className="text-amber-600">Đang dọn</strong>, quản lý sẽ nhận thông báo</p>
        )}
      </div>
    </div>
  )
}
