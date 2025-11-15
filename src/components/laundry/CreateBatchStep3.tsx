import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ImageUpload } from '@/components/shared/ImageUpload'
import { Badge } from '@/components/ui/badge'
import { useLaundryVendor } from '@/hooks/useLaundryVendors'
import { useItems } from '@/hooks/useItems'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { CreateBatchStep1Data, CreateBatchStep2Data, CreateBatchStep3Data } from '@/types/laundry.types'

const step3Schema = z.object({
  confirmed: z.boolean().refine((val) => val === true, {
    message: 'Vui lòng xác nhận thông tin',
  }),
})

type Step3FormValues = z.infer<typeof step3Schema>

interface CreateBatchStep3Props {
  step1Data: CreateBatchStep1Data
  step2Data: CreateBatchStep2Data
  onComplete: (data: CreateBatchStep3Data) => void
  onBack: () => void
  isSubmitting: boolean
}

export function CreateBatchStep3({
  step1Data,
  step2Data,
  onComplete,
  onBack,
  isSubmitting,
}: CreateBatchStep3Props) {
  const { data: vendor } = useLaundryVendor(step1Data.vendor_id)
  const itemsQuery = useItems({}, 1, 1000)
  const allItems = itemsQuery.data?.items || []
  
  const form = useForm<Step3FormValues>({
    resolver: zodResolver(step3Schema),
    defaultValues: {
      confirmed: false,
    },
  })
  
  const onSubmit = (data: Step3FormValues) => {
    onComplete(data as CreateBatchStep3Data)
  }
  
  // Calculate summary
  const totalItems = step2Data.items.reduce((sum, item) => sum + item.quantity, 0)
  const totalWeight = step2Data.items.reduce((sum, item) => sum + item.weight_kg, 0)
  const pricePerKg = (vendor?.contract_info as any)?.price_per_kg || 0
  const estimatedCost = totalWeight * pricePerKg
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Review Information */}
        <Card>
          <CardHeader>
            <CardTitle>Bước 3: Xác nhận thông tin</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1 Review */}
            <div>
              <h3 className="font-semibold mb-3">Thông tin cơ bản</h3>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-muted-foreground">Đơn vị giặt</dt>
                  <dd className="font-medium">{vendor?.name}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Ngày giao</dt>
                  <dd className="font-medium">{formatDate(step1Data.delivery_date.toISOString())}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Ngày nhận dự kiến</dt>
                  <dd className="font-medium">{formatDate(step1Data.expected_return_date.toISOString())}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Người nhận</dt>
                  <dd className="font-medium">{step1Data.receiver_name}</dd>
                </div>
                {step1Data.notes && (
                  <div className="col-span-2">
                    <dt className="text-muted-foreground">Ghi chú</dt>
                    <dd className="font-medium">{step1Data.notes}</dd>
                  </div>
                )}
              </dl>
            </div>
            
            {/* Step 2 Review */}
            <div>
              <h3 className="font-semibold mb-3">Danh sách đồ giặt</h3>
              <div className="space-y-2">
                {step2Data.items.map((item, index) => {
                  const itemData = allItems.find((i) => i.id === item.item_id)
                  return (
                    <div key={index} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="font-medium">{itemData?.name || 'Unknown'}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.quantity} cái × {item.weight_kg} kg
                          {item.condition_note && ` - ${item.condition_note}`}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            
            {/* Summary */}
            <div className="rounded-lg border bg-muted/50 p-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Tổng items</p>
                  <p className="text-xl font-bold">{totalItems}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tổng cân nặng</p>
                  <p className="text-xl font-bold">{totalWeight.toFixed(2)} kg</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Chi phí ước tính</p>
                  <p className="text-xl font-bold">{formatCurrency(estimatedCost)}</p>
                </div>
              </div>
            </div>
            
            {/* Confirmation */}
            <FormField
              control={form.control}
              name="confirmed"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Tôi xác nhận thông tin trên là chính xác
                    </FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Sau khi tạo lô giặt, bạn có thể theo dõi tiến độ trong trang quản lý lô giặt
                    </p>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
        
        <div className="flex justify-between">
          <Button type="button" variant="outline" onClick={onBack} disabled={isSubmitting}>
            Quay lại
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Đang tạo...' : 'Tạo lô giặt'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
