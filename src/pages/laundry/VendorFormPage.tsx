import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ImageUpload } from '@/components/shared/ImageUpload';
import { useLaundryVendor, useCreateVendor, useUpdateVendor } from '@/hooks/useLaundryVendors';
const vendorSchema = z.object({
  name: z.string().min(2, 'Tên đơn vị phải có ít nhất 2 ký tự'),
  type: z.enum(['external', 'in_house']),
  address: z.string().min(5, 'Địa chỉ phải có ít nhất 5 ký tự'),
  phone: z.string().min(10, 'Số điện thoại không hợp lệ'),
  email: z.string().email('Email không hợp lệ').optional().or(z.literal('')),
  website: z.string().url('Website không hợp lệ').optional().or(z.literal('')),
  contact_person: z.string().min(2, 'Tên người liên hệ phải có ít nhất 2 ký tự'),
  contract_info: z.object({
    price_per_kg: z.number().min(0, 'Giá phải lớn hơn 0'),
    minimum_order_kg: z.number().min(0).optional(),
    payment_terms: z.string().optional(),
    delivery_time: z.string().optional(),
    contract_start: z.string().optional(),
    contract_end: z.string().optional(),
    logo_url: z.string().optional()
  }),
  notes: z.string().optional()
});
type VendorFormValues = z.infer<typeof vendorSchema>;
export function VendorFormPage() {
  const {
    id
  } = useParams<{
    id: string;
  }>();
  const navigate = useNavigate();
  const isEdit = !!id;
  const {
    data: vendor,
    isLoading
  } = useLaundryVendor(id);
  const {
    mutate: createVendor,
    isPending: isCreating
  } = useCreateVendor();
  const {
    mutate: updateVendor,
    isPending: isUpdating
  } = useUpdateVendor();
  const form = useForm<VendorFormValues>({
    resolver: zodResolver(vendorSchema),
    defaultValues: {
      name: '',
      type: 'external',
      address: '',
      phone: '',
      email: '',
      website: '',
      contact_person: '',
      contract_info: {
        price_per_kg: 15000,
        minimum_order_kg: 50,
        payment_terms: '',
        delivery_time: '2 ngày',
        contract_start: '',
        contract_end: '',
        logo_url: ''
      },
      notes: ''
    }
  });
  useEffect(() => {
    if (vendor) {
      const contractInfo = vendor.contract_info as any;
      form.reset({
        name: vendor.name,
        type: vendor.type as 'external' | 'in_house',
        address: vendor.address,
        phone: vendor.phone,
        email: vendor.email || '',
        website: contractInfo?.website || '',
        contact_person: vendor.contact_person,
        contract_info: {
          price_per_kg: contractInfo?.price_per_kg || 0,
          minimum_order_kg: contractInfo?.minimum_order_kg || 0,
          payment_terms: contractInfo?.payment_terms || '',
          delivery_time: contractInfo?.delivery_time || '',
          contract_start: contractInfo?.contract_start || '',
          contract_end: contractInfo?.contract_end || '',
          logo_url: contractInfo?.logo_url || ''
        },
        notes: vendor.notes || ''
      });
    }
  }, [vendor, form]);
  const onSubmit = (data: VendorFormValues) => {
    if (isEdit && id) {
      updateVendor({
        id,
        data: data as any
      }, {
        onSuccess: () => navigate(`/laundry/vendors/${id}`)
      });
    } else {
      createVendor(data as any, {
        onSuccess: () => navigate('/laundry/vendors')
      });
    }
  };
  if (isLoading) {
    return <div>Loading...</div>;
  }
  return <div className="space-y-6">
      <PageHeader title={isEdit ? 'Sửa đơn vị giặt' : 'Thêm đơn vị giặt'} description={isEdit ? vendor?.name : 'Thêm đơn vị giặt là mới'}>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Quay lại
        </Button>
      </PageHeader>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Section 1: Thông tin cơ bản */}
          <Card>
            <CardHeader>
              <CardTitle>Thông tin cơ bản</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField control={form.control} name="name" render={({
                field
              }) => <FormItem>
                      <FormLabel>Tên đơn vị *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="VD: ABC Laundry" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>} />
                
                <FormField control={form.control} name="type" render={({
                field
              }) => <FormItem>
                      <FormLabel>Loại *</FormLabel>
                      <FormControl>
                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="external" id="external" />
                            
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="in_house" id="in_house" />
                            <label htmlFor="in_house" className="cursor-pointer">
                              Nội bộ
                            </label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>} />
              </div>
              
              <FormField control={form.control} name="contract_info.logo_url" render={({
              field
            }) => <FormItem>
                    <FormLabel>Logo</FormLabel>
                    <FormControl>
                      <ImageUpload images={field.value ? [field.value] : []} onChange={images => field.onChange(images[0] || '')} maxImages={1} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>} />
            </CardContent>
          </Card>
          
          {/* Section 2: Thông tin liên hệ */}
          <Card>
            <CardHeader>
              <CardTitle>Thông tin liên hệ</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="address" render={({
              field
            }) => <FormItem>
                    <FormLabel>Địa chỉ *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="123 Đường ABC, Quận 1, TP.HCM" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>} />
              
              <div className="grid gap-4 md:grid-cols-2">
                <FormField control={form.control} name="phone" render={({
                field
              }) => <FormItem>
                      <FormLabel>Điện thoại *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="0901234567" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>} />
                
                <FormField control={form.control} name="email" render={({
                field
              }) => <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="contact@example.com" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>} />
              </div>
              
              <div className="grid gap-4 md:grid-cols-2">
                <FormField control={form.control} name="website" render={({
                field
              }) => <FormItem>
                      <FormLabel>Website</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="https://example.com" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>} />
                
                <FormField control={form.control} name="contact_person" render={({
                field
              }) => <FormItem>
                      <FormLabel>Người liên hệ *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Nguyễn Văn A" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>} />
              </div>
            </CardContent>
          </Card>
          
          {/* Section 3: Thông tin hợp đồng */}
          <Card>
            
            
          </Card>
          
          {/* Section 4: Ghi chú */}
          <Card>
            <CardHeader>
              <CardTitle>Ghi chú</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField control={form.control} name="notes" render={({
              field
            }) => <FormItem>
                    <FormControl>
                      <Textarea {...field} placeholder="Thêm ghi chú về đơn vị giặt..." rows={4} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>} />
            </CardContent>
          </Card>
          
          {/* Actions */}
          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              Hủy
            </Button>
            <Button type="submit" disabled={isCreating || isUpdating}>
              {isCreating || isUpdating ? 'Đang xử lý...' : isEdit ? 'Cập nhật' : 'Tạo mới'}
            </Button>
          </div>
        </form>
      </Form>
    </div>;
}