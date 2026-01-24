import { UseFormReturn } from 'react-hook-form'
import { Calendar, LogIn, LogOut, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import type { RoomCheckFormData, CheckType } from '@/types/rooms.types'
import { cn } from '@/lib/utils'

interface CheckTypeStepProps {
  form: UseFormReturn<RoomCheckFormData>
  quickMode: boolean
  setQuickMode: (value: boolean) => void
}

const checkTypes: { value: CheckType; label: string; shortLabel: string; icon: any }[] = [
  {
    value: 'daily',
    label: 'Hàng ngày',
    shortLabel: 'Hàng ngày',
    icon: Calendar,
  },
  {
    value: 'checkin',
    label: 'Check-in',
    shortLabel: 'Check-in',
    icon: LogIn,
  },
  {
    value: 'checkout',
    label: 'Check-out',
    shortLabel: 'Check-out',
    icon: LogOut,
  },
  {
    value: 'maintenance',
    label: 'Bảo trì',
    shortLabel: 'Bảo trì',
    icon: Wrench,
  },
]

export function CheckTypeStep({ form, quickMode, setQuickMode }: CheckTypeStepProps) {
  const selectedType = form.watch('check_type')

  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="check_type"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm">Chọn loại kiểm tra</FormLabel>
            <FormControl>
              {/* Horizontal compact buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                {checkTypes.map((type) => {
                  const Icon = type.icon
                  const isSelected = field.value === type.value
                  return (
                    <Button
                      key={type.value}
                      type="button"
                      variant={isSelected ? 'default' : 'outline'}
                      className={cn(
                        'h-16 flex-col gap-1 text-xs font-medium transition-all',
                        isSelected && 'ring-2 ring-primary ring-offset-2'
                      )}
                      onClick={() => field.onChange(type.value)}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{type.shortLabel}</span>
                    </Button>
                  )
                })}
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Quick mode toggle - compact inline */}
      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
        <div className="flex-1">
          <p className="text-sm font-medium">Chế độ nhanh</p>
          <p className="text-xs text-muted-foreground">
            Bỏ qua kiểm tra chi tiết, chỉ đánh giá tổng quan
          </p>
        </div>
        <Button
          type="button"
          variant={quickMode ? 'default' : 'outline'}
          size="sm"
          onClick={() => setQuickMode(!quickMode)}
          className="shrink-0"
        >
          {quickMode ? 'Bật' : 'Tắt'}
        </Button>
      </div>
    </div>
  )
}
