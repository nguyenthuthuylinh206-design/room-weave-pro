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
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { VendorSelect } from './VendorSelect'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import type { CreateBatchStep1Data } from '@/types/laundry.types'
import { useUsers } from '@/hooks/useUsers'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const step1Schema = z.object({
  vendor_id: z.string().min(1, 'Vui lòng chọn đơn vị giặt'),
  delivery_date: z.date({ required_error: 'Vui lòng chọn ngày giao' }),
  expected_return_date: z.date({ required_error: 'Vui lòng chọn ngày nhận dự kiến' }),
  delivery_staff_id: z.string().min(1, 'Vui lòng chọn nhân viên giao'),
  receiver_name: z.string().min(2, 'Vui lòng nhập tên người nhận'),
  notes: z.string().optional(),
})

type Step1FormValues = z.infer<typeof step1Schema>

interface CreateBatchStep1Props {
  initialData: CreateBatchStep1Data | null
  onComplete: (data: CreateBatchStep1Data) => void
  onBack: () => void
}

export function CreateBatchStep1({ initialData, onComplete, onBack }: CreateBatchStep1Props) {
  const { users } = useUsers()
  const staffUsers = users?.filter((u) => u.status === 'active') || []
  
  const form = useForm<Step1FormValues>({
    resolver: zodResolver(step1Schema),
    defaultValues: initialData ? {
      vendor_id: initialData.vendor_id,
      delivery_date: initialData.delivery_date,
      expected_return_date: initialData.expected_return_date,
      delivery_staff_id: initialData.delivery_staff_id,
      receiver_name: initialData.receiver_name,
      notes: initialData.notes || '',
    } : {
      vendor_id: '',
      delivery_date: new Date(),
      expected_return_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      delivery_staff_id: '',
      receiver_name: '',
      notes: '',
    },
  })
  
  const onSubmit = (data: Step1FormValues) => {
    onComplete(data)
  }
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Bước 1: Thông tin cơ bản</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="vendor_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Đơn vị giặt *</FormLabel>
                  <FormControl>
                    <VendorSelect value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="delivery_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ngày giờ giao *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'PPP', { locale: vi })
                            ) : (
                              <span>Chọn ngày</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="expected_return_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ngày nhận dự kiến *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'PPP', { locale: vi })
                            ) : (
                              <span>Chọn ngày</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="delivery_staff_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nhân viên giao *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn nhân viên" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {staffUsers.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.full_name}
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
                name="receiver_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tên người nhận *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Người nhận từ đơn vị giặt" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ghi chú</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Ghi chú về lô giặt..."
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
        
        <div className="flex justify-between">
          <Button type="button" variant="outline" onClick={onBack}>
            Hủy
          </Button>
          <Button type="submit">
            Tiếp theo
          </Button>
        </div>
      </form>
    </Form>
  )
}
