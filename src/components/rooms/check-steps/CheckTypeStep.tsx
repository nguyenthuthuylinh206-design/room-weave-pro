import { UseFormReturn } from 'react-hook-form'
import { Calendar, LogIn, LogOut, Wrench, Package, PackagePlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import type { RoomCheckFormData, CheckType } from '@/types/rooms.types'
import { cn } from '@/lib/utils'
import { LastCheckContextCard } from './LastCheckContextCard'
import { QuickOkButton } from './QuickOkButton'
import type { QuickCheckType } from '@/hooks/useQuickRoomCheck'

interface CheckTypeStepProps {
  form: UseFormReturn<RoomCheckFormData>
  quickMode: boolean
  setQuickMode: (value: boolean) => void
  hideDelivery?: boolean // Ẩn option delivery khi user tự chọn (không phải từ luồng giao hàng)
  /** Bật Quick path "Phòng OK hoàn toàn" + Context Card khi truyền đủ roomId */
  roomId?: string
  hotelId?: string | null
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
  {
    value: 'delivery',
    label: 'Sau giao hàng',
    shortLabel: 'Giao hàng',
    icon: Package,
  },
  {
    value: 'replenish',
    label: 'Bổ sung & Dọn dẹp',
    shortLabel: 'Bổ sung',
    icon: PackagePlus,
  },
]

export function CheckTypeStep({ form, quickMode, setQuickMode, hideDelivery = true, roomId, hotelId }: CheckTypeStepProps) {
  const selectedType = form.watch('check_type')

  const visibleCheckTypes = hideDelivery
    ? checkTypes.filter(t => t.value !== 'delivery')
    : checkTypes

  // Quick path chỉ áp dụng cho các loại kiểm phổ biến nhất
  const quickEligible: QuickCheckType[] = ['daily', 'checkin', 'checkout']
  const showQuickPath = !!roomId && quickEligible.includes(selectedType as QuickCheckType)

  return (
    <div className="space-y-4">
      {/* Context card — lần kiểm gần nhất */}
      {roomId && <LastCheckContextCard roomId={roomId} />}

      {/* Quick path "Phòng OK hoàn toàn" — đặt nổi bật trên cùng */}
      {showQuickPath && (
        <div className="space-y-1.5 p-3 border rounded-lg bg-green-50/50 border-green-200">
          <QuickOkButton
            roomId={roomId!}
            hotelId={hotelId}
            checkType={selectedType as QuickCheckType}
          />
        </div>
      )}

      <FormField
        control={form.control}
        name="check_type"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm">Chọn loại kiểm tra</FormLabel>
            <FormControl>
              {/* Horizontal compact buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                {visibleCheckTypes.map((type) => {
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
