import { UseFormReturn } from 'react-hook-form'
import { Calendar, LogIn, LogOut, Wrench } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Card, CardContent } from '@/components/ui/card'
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import type { RoomCheckFormData, CheckType } from '@/types/rooms.types'

interface CheckTypeStepProps {
  form: UseFormReturn<RoomCheckFormData>
  quickMode: boolean
  setQuickMode: (value: boolean) => void
}

const checkTypes: { value: CheckType; label: string; description: string; icon: any }[] = [
  {
    value: 'daily',
    label: 'Kiểm tra hàng ngày',
    description: 'Kiểm tra vệ sinh và đồ dùng thường ngày',
    icon: Calendar,
  },
  {
    value: 'checkin',
    label: 'Kiểm tra check-in',
    description: 'Kiểm tra phòng trước khi khách vào',
    icon: LogIn,
  },
  {
    value: 'checkout',
    label: 'Kiểm tra check-out',
    description: 'Kiểm tra phòng sau khi khách rời đi',
    icon: LogOut,
  },
  {
    value: 'maintenance',
    label: 'Kiểm tra bảo trì',
    description: 'Kiểm tra sau bảo trì hoặc sửa chữa',
    icon: Wrench,
  },
]

export function CheckTypeStep({ form, quickMode, setQuickMode }: CheckTypeStepProps) {
  return (
    <div className="space-y-6">
      <FormField
        control={form.control}
        name="check_type"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-base">Loại kiểm tra</FormLabel>
            <FormControl>
              <RadioGroup
                onValueChange={field.onChange}
                defaultValue={field.value}
                className="grid gap-4 pt-2"
              >
                {checkTypes.map((type) => {
                  const Icon = type.icon
                  return (
                    <Label
                      key={type.value}
                      htmlFor={type.value}
                      className="cursor-pointer"
                    >
                      <Card className={`transition-all hover:border-primary ${
                        field.value === type.value ? 'border-primary bg-primary/5' : ''
                      }`}>
                        <CardContent className="flex items-start gap-4 p-4">
                          <RadioGroupItem
                            value={type.value}
                            id={type.value}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Icon className="h-5 w-5 text-primary" />
                              <span className="font-medium">{type.label}</span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {type.description}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </Label>
                  )
                })}
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}
