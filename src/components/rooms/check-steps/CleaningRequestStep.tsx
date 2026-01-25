import { UseFormReturn } from 'react-hook-form'
import { CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react'
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import type { RoomCheckFormData } from '@/types/rooms.types'

interface CleaningRequestStepProps {
  form: UseFormReturn<RoomCheckFormData>
}

const ROOM_CONDITIONS = [
  {
    value: 'clean',
    label: 'Sạch',
    description: 'Phòng sạch sẽ, không cần dọn dẹp',
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-50 border-green-200',
  },
  {
    value: 'dirty',
    label: 'Bẩn nhẹ',
    description: 'Cần dọn dẹp thường',
    icon: AlertCircle,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 border-amber-200',
  },
  {
    value: 'very_dirty',
    label: 'Rất bẩn',
    description: 'Cần dọn dẹp gấp',
    icon: AlertTriangle,
    color: 'text-red-600',
    bgColor: 'bg-red-50 border-red-200',
  },
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
  
  // Auto-set needs_cleaning based on room condition
  const handleConditionChange = (value: string) => {
    form.setValue('room_condition', value as 'clean' | 'dirty' | 'very_dirty')
    
    // Auto-toggle cleaning request
    if (value === 'clean') {
      form.setValue('needs_cleaning', false)
      form.setValue('cleaning_priority', 'medium')
    } else {
      form.setValue('needs_cleaning', true)
      // Auto-set priority based on condition
      if (value === 'very_dirty') {
        form.setValue('cleaning_priority', 'high')
      } else {
        form.setValue('cleaning_priority', 'medium')
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Room Condition Selection */}
      <FormField
        control={form.control}
        name="room_condition"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-medium">Tình trạng phòng</FormLabel>
            <FormControl>
              <RadioGroup
                value={field.value || 'clean'}
                onValueChange={handleConditionChange}
                className="grid gap-3 pt-2"
              >
                {ROOM_CONDITIONS.map((condition) => {
                  const Icon = condition.icon
                  const isSelected = field.value === condition.value
                  return (
                    <label
                      key={condition.value}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                        isSelected ? condition.bgColor : 'bg-background hover:bg-muted/50',
                        isSelected && 'ring-2 ring-offset-2',
                        condition.value === 'clean' && isSelected && 'ring-green-500',
                        condition.value === 'dirty' && isSelected && 'ring-amber-500',
                        condition.value === 'very_dirty' && isSelected && 'ring-red-500'
                      )}
                    >
                      <RadioGroupItem value={condition.value} className="sr-only" />
                      <Icon className={cn('h-5 w-5', condition.color)} />
                      <div className="flex-1">
                        <p className={cn('font-medium', isSelected && condition.color)}>
                          {condition.label}
                        </p>
                        <p className="text-xs text-muted-foreground">{condition.description}</p>
                      </div>
                    </label>
                  )
                })}
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Needs Cleaning Checkbox - Show when room is not clean */}
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

      {/* Priority & Notes - Show when needs cleaning */}
      {needsCleaning && (
        <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
          {/* Cleaning Priority */}
          <FormField
            control={form.control}
            name="cleaning_priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">Mức độ ưu tiên</FormLabel>
                <Select
                  value={field.value || 'medium'}
                  onValueChange={field.onChange}
                >
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

          {/* Cleaning Notes */}
          <FormField
            control={form.control}
            name="cleaning_notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">Ghi chú cho bộ phận dọn dẹp</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="VD: Khách để lại nhiều rác, cần đổi ga giường..."
                    className="min-h-[80px] text-sm resize-none"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}

      {/* Summary Info */}
      <div className="p-3 rounded-lg border bg-muted/20 text-sm">
        <p className="font-medium mb-1">Sau khi hoàn tất kiểm tra:</p>
        <ul className="text-muted-foreground space-y-1 text-xs">
          {(!roomCondition || roomCondition === 'clean') && !needsCleaning && (
            <li>• Phòng sẽ chuyển sang trạng thái <strong className="text-green-600">Trống</strong> (Vacant)</li>
          )}
          {needsCleaning && (
            <>
              <li>• Phòng sẽ chuyển sang trạng thái <strong className="text-amber-600">Đang dọn</strong> (Cleaning)</li>
              <li>• Quản lý sẽ nhận thông báo để phân công nhân viên</li>
              <li>• Khi dọn xong, phòng sẽ chuyển về trạng thái Trống</li>
            </>
          )}
        </ul>
      </div>
    </div>
  )
}
