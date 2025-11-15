import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useItems } from '@/hooks/useItems'
import { useLaundryVendor } from '@/hooks/useLaundryVendors'
import { formatCurrency, cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { CreateBatchStep1Data, CreateBatchStep2Data } from '@/types/laundry.types'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useUser } from '@/hooks/useUser'

// Schema will be created dynamically in component with stock validation
const createStep2Schema = (availableItems: any[]) => z.object({
  items: z.array(
    z.object({
      item_id: z.string().min(1, 'Vui lòng chọn item'),
      quantity: z.number().min(1, 'Số lượng phải >= 1'),
      weight_kg: z.number().min(0, 'Cân nặng phải >= 0 kg'),
      condition_note: z.string().optional(),
    })
  ).min(1, 'Vui lòng thêm ít nhất 1 item'),
}).superRefine((data, ctx) => {
  data.items.forEach((item, index) => {
    const selectedItem = availableItems.find(i => i.id === item.item_id)
    if (selectedItem && item.quantity > (selectedItem.quantity_in_stock || 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Chỉ còn ${selectedItem.quantity_in_stock} ${selectedItem.unit} trong kho`,
        path: ['items', index, 'quantity']
      })
    }
  })
})

type Step2FormValues = {
  items: {
    item_id: string
    quantity: number
    weight_kg: number
    condition_note?: string
  }[]
}

interface CreateBatchStep2Props {
  initialData: CreateBatchStep2Data | null
  step1Data: CreateBatchStep1Data
  onComplete: (data: CreateBatchStep2Data) => void
  onBack: () => void
}

export function CreateBatchStep2({ initialData, step1Data, onComplete, onBack }: CreateBatchStep2Props) {
  const { tenantId } = useUser()
  const itemsQuery = useItems({ status: 'active' }, 1, 1000)
  const { data: vendor } = useLaundryVendor(step1Data.vendor_id)
  
  // Fetch launderable categories
  const { data: launderableCategories } = useQuery({
    queryKey: ['launderable-categories', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('item_categories')
        .select('id')
        .eq('is_launderable', true)
        .eq('status', 'active')
      
      if (error) throw error
      return data?.map(cat => cat.id) || []
    },
    enabled: !!tenantId,
  })
  
  const availableItems = itemsQuery.data?.items?.filter((item) => {
    const hasStock = (item.quantity_in_stock || 0) > 0
    const isLaunderable = item.category_id && launderableCategories?.includes(item.category_id)
    return hasStock && isLaunderable
  }) || []

  const hasNoLaunderableItems = itemsQuery.data?.items && 
    itemsQuery.data.items.length > 0 && 
    availableItems.length === 0
  
  const form = useForm<Step2FormValues>({
    resolver: zodResolver(createStep2Schema(availableItems)),
    defaultValues: initialData ? {
      items: initialData.items.map(item => ({
        item_id: item.item_id,
        quantity: item.quantity,
        weight_kg: item.weight_kg,
        condition_note: item.condition_note || '',
      })),
    } : {
      items: [{ item_id: '', quantity: 1, weight_kg: 0, condition_note: '' }],
    },
  })
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  })
  
  const watchItems = form.watch('items')
  
  // Calculate summary
  const totalItems = watchItems.reduce((sum, item) => sum + (item.quantity || 0), 0)
  const totalWeight = watchItems.reduce((sum, item) => sum + (item.weight_kg || 0), 0)
  const pricePerKg = (vendor?.contract_info as any)?.price_per_kg || 0
  const estimatedCost = totalWeight * pricePerKg
  
  const onSubmit = (data: Step2FormValues) => {
    onComplete(data as CreateBatchStep2Data)
  }
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Bước 2: Chọn đồ giặt</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ item_id: '', quantity: 1, weight_kg: 0, condition_note: '' })}
              >
                <Plus className="mr-2 h-4 w-4" />
                Thêm item
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">Item *</TableHead>
                    <TableHead className="w-24 text-center">Tồn kho</TableHead>
                    <TableHead className="w-32">Số lượng *</TableHead>
                    <TableHead className="w-32">Cân nặng (kg) *</TableHead>
                    <TableHead>Ghi chú tình trạng</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((field, index) => (
                    <TableRow key={field.id}>
                      <TableCell>
                        <FormField
                          control={form.control}
                          name={`items.${index}.item_id`}
                          render={({ field }) => (
                            <FormItem>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Chọn item" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {availableItems.map((item) => (
                                    <SelectItem key={item.id} value={item.id}>
                                      <div className="flex justify-between items-center w-full gap-3">
                                        <span>{item.name} ({item.code})</span>
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs text-muted-foreground">
                                            Tồn: {item.quantity_in_stock} {item.unit}
                                          </span>
                                          {(item.quantity_in_stock || 0) < 10 && (
                                            <Badge variant="secondary" className="text-xs">
                                              Sắp hết
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        {(() => {
                          const selectedItemId = form.watch(`items.${index}.item_id`)
                          const selectedItem = availableItems.find(i => i.id === selectedItemId)
                          return selectedItem ? (
                            <div className="text-sm">
                              <span className={cn(
                                "font-medium",
                                (selectedItem.quantity_in_stock || 0) < 10 && "text-orange-600",
                                (selectedItem.quantity_in_stock || 0) === 0 && "text-red-600"
                              )}>
                                {selectedItem.quantity_in_stock}
                              </span>
                              <span className="text-muted-foreground ml-1">{selectedItem.unit}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )
                        })()}
                      </TableCell>
                      <TableCell>
                        <FormField
                          control={form.control}
                          name={`items.${index}.quantity`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <div className="flex gap-2 items-center">
                                  <Input
                                    type="number"
                                    min="1"
                                    {...field}
                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="shrink-0"
                                    onClick={() => {
                                      const selectedItemId = form.watch(`items.${index}.item_id`)
                                      const selectedItem = availableItems.find(i => i.id === selectedItemId)
                                      if (selectedItem) {
                                        form.setValue(`items.${index}.quantity`, selectedItem.quantity_in_stock || 0)
                                      }
                                    }}
                                  >
                                    Max
                                  </Button>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <FormField
                          control={form.control}
                          name={`items.${index}.weight_kg`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.1"
                                  min="0.1"
                                  {...field}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <FormField
                          control={form.control}
                          name={`items.${index}.condition_note`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input {...field} placeholder="VD: Có vết bẩn" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        {fields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => remove(index)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        
        {/* Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Tổng kết</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-3 gap-4">
              <div>
                <dt className="text-sm text-muted-foreground">Tổng số items</dt>
                <dd className="text-2xl font-bold">{totalItems}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Tổng cân nặng</dt>
                <dd className="text-2xl font-bold">{totalWeight.toFixed(2)} kg</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Chi phí ước tính</dt>
                <dd className="text-2xl font-bold">
                  {estimatedCost > 0 
                    ? formatCurrency(estimatedCost)
                    : <span className="text-muted-foreground font-normal text-base">Chưa xác định</span>
                  }
                </dd>
                {estimatedCost === 0 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    💡 Chi phí sẽ được tính khi có cân nặng và giá từ đơn vị giặt
                  </p>
                )}
              </div>
            </dl>
          </CardContent>
        </Card>
        
        <div className="flex justify-between">
          <Button type="button" variant="outline" onClick={onBack}>
            Quay lại
          </Button>
          <Button type="submit">
            Tiếp theo
          </Button>
        </div>
      </form>
    </Form>
  )
}
