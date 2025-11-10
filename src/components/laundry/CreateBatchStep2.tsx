import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { formatCurrency } from '@/lib/utils'
import type { CreateBatchStep1Data, CreateBatchStep2Data } from '@/types/laundry.types'

const step2Schema = z.object({
  items: z.array(
    z.object({
      item_id: z.string().min(1, 'Vui lòng chọn item'),
      quantity: z.number().min(1, 'Số lượng phải >= 1'),
      weight_kg: z.number().min(0.1, 'Cân nặng phải >= 0.1 kg'),
      condition_note: z.string().optional(),
    })
  ).min(1, 'Vui lòng thêm ít nhất 1 item'),
})

type Step2FormValues = z.infer<typeof step2Schema>

interface CreateBatchStep2Props {
  initialData: CreateBatchStep2Data | null
  step1Data: CreateBatchStep1Data
  onComplete: (data: CreateBatchStep2Data) => void
  onBack: () => void
}

export function CreateBatchStep2({ initialData, step1Data, onComplete, onBack }: CreateBatchStep2Props) {
  const itemsQuery = useItems({ status: 'active' }, 1, 1000)
  const { data: vendor } = useLaundryVendor(step1Data.vendor_id)
  const availableItems = itemsQuery.data?.items?.filter((item) => item.quantity_in_stock > 0) || []
  
  const form = useForm<Step2FormValues>({
    resolver: zodResolver(step2Schema),
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
                                      {item.name} ({item.code})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <FormField
                          control={form.control}
                          name={`items.${index}.quantity`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="1"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
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
                <dd className="text-2xl font-bold">{formatCurrency(estimatedCost)}</dd>
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
