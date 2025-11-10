import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { useVendor, useCreateVendor, useUpdateVendor } from '@/hooks/useVendors';
import { useUser } from '@/hooks/useUser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Building, 
  Phone, 
  Mail, 
  MapPin, 
  CreditCard, 
  FileText,
  X,
  Plus
} from 'lucide-react';
import { toast } from 'sonner';

const vendorSchema = z.object({
  name: z.string().min(3, 'Tên phải có ít nhất 3 ký tự'),
  category: z.enum(['supplier', 'service_provider', 'contractor']),
  products_services: z.array(z.string()).min(1, 'Chọn ít nhất 1 sản phẩm/dịch vụ'),
  
  address: z.string().min(10, 'Địa chỉ phải có ít nhất 10 ký tự'),
  country: z.string().default('Vietnam'),
  phone: z.string().regex(/^[\d\s\+\-\(\)]+$/, 'Số điện thoại không hợp lệ'),
  email: z.string().email('Email không hợp lệ').optional().or(z.literal('')),
  contact_person: z.string().min(3, 'Tên người liên hệ phải có ít nhất 3 ký tự'),
  
  payment_terms: z.string(),
  notes: z.string().optional(),
  status: z.enum(['active', 'inactive', 'suspended']).default('active')
});

type VendorFormData = z.infer<typeof vendorSchema>;

const PRODUCT_SERVICE_OPTIONS = [
  'Đồ vải',
  'Thiết bị điện',
  'Tiện nghi phòng',
  'Dịch vụ giặt là',
  'Dịch vụ bảo trì',
];

const VendorFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;
  const { user: currentUser } = useUser();

  const { data: vendor } = useVendor(id || '');
  const createVendor = useCreateVendor();
  const updateVendor = useUpdateVendor();

  const [productServiceOptions] = useState(PRODUCT_SERVICE_OPTIONS);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm<VendorFormData>({
    resolver: zodResolver(vendorSchema),
    defaultValues: vendor || {
      category: 'supplier',
      country: 'Vietnam',
      products_services: [],
      status: 'active',
      payment_terms: '30_days'
    }
  });

  const selectedCategory = watch('category');
  const productsServices = watch('products_services') || [];

  const onSubmit = async (data: VendorFormData) => {
    if (!currentUser?.tenant_id || !currentUser?.id) {
      toast.error('Không tìm thấy thông tin người dùng');
      return;
    }

    try {
      const vendorData = {
        name: data.name,
        category: data.category,
        products_services: data.products_services,
        address: data.address,
        country: data.country,
        phone: data.phone,
        email: data.email || '',
        contact_person: data.contact_person,
        payment_terms: data.payment_terms,
        notes: data.notes || '',
        code: `VND-${Date.now()}`,
        rating: 0,
        total_orders: 0,
        total_value: 0,
        on_time_delivery_rate: 100,
        documents: [],
        status: data.status,
        tenant_id: currentUser.tenant_id,
        created_by: currentUser.id
      };

      if (isEdit && id) {
        await updateVendor.mutateAsync({ id, ...vendorData });
        toast.success('Cập nhật nhà cung cấp thành công');
        navigate(`/vendors/${id}`);
      } else {
        const result = await createVendor.mutateAsync(vendorData);
        toast.success('Thêm nhà cung cấp thành công');
        navigate(`/vendors/${result.id}`);
      }
    } catch (error) {
      toast.error('Có lỗi xảy ra. Vui lòng thử lại.');
    }
  };

  const toggleProductService = (service: string) => {
    const current = productsServices;
    if (current.includes(service)) {
      setValue('products_services', current.filter(s => s !== service));
    } else {
      setValue('products_services', [...current, service]);
    }
  };

  return (
    <div className="p-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">
            {isEdit ? 'Sửa nhà cung cấp' : 'Thêm nhà cung cấp mới'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isEdit ? 'Cập nhật thông tin nhà cung cấp' : 'Điền thông tin nhà cung cấp mới'}
          </p>
        </div>

        {/* Thông tin cơ bản */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="w-5 h-5" />
              Thông tin cơ bản
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Tên công ty <span className="text-red-500">*</span></Label>
              <Input id="name" placeholder="VD: Công ty TNHH Vải Việt" {...register('name')} />
              {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Loại <span className="text-red-500">*</span></Label>
              <RadioGroup value={selectedCategory} onValueChange={(value) => setValue('category', value as any)} className="grid grid-cols-3 gap-4">
                <div className="flex items-center space-x-2 border rounded-lg p-4 cursor-pointer hover:bg-accent">
                  <RadioGroupItem value="supplier" id="supplier" />
                  <Label htmlFor="supplier" className="cursor-pointer flex-1">
                    <div className="font-medium">Nhà cung cấp</div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 border rounded-lg p-4 cursor-pointer hover:bg-accent">
                  <RadioGroupItem value="service_provider" id="service_provider" />
                  <Label htmlFor="service_provider" className="cursor-pointer flex-1">
                    <div className="font-medium">Dịch vụ</div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 border rounded-lg p-4 cursor-pointer hover:bg-accent">
                  <RadioGroupItem value="contractor" id="contractor" />
                  <Label htmlFor="contractor" className="cursor-pointer flex-1">
                    <div className="font-medium">Thầu phụ</div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Danh mục sản phẩm/dịch vụ <span className="text-red-500">*</span></Label>
              <div className="flex flex-wrap gap-2">
                {productServiceOptions.map((service) => (
                  <Badge
                    key={service}
                    variant={productsServices.includes(service) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleProductService(service)}
                  >
                    {service}
                    {productsServices.includes(service) && (
                      <X className="w-3 h-3 ml-1" />
                    )}
                  </Badge>
                ))}
              </div>
              {errors.products_services && <p className="text-sm text-red-500">{errors.products_services.message}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Thông tin liên hệ */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5" />
              Thông tin liên hệ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Địa chỉ <span className="text-red-500">*</span></Label>
                <Textarea id="address" placeholder="Số nhà, đường, phường/xã..." {...register('address')} />
                {errors.address && <p className="text-sm text-red-500">{errors.address.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Số điện thoại <span className="text-red-500">*</span></Label>
                <Input id="phone" placeholder="0901234567" {...register('phone')} />
                {errors.phone && <p className="text-sm text-red-500">{errors.phone.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="contact@example.com" {...register('email')} />
                {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_person">Người liên hệ <span className="text-red-500">*</span></Label>
                <Input id="contact_person" placeholder="Nguyễn Văn A" {...register('contact_person')} />
                {errors.contact_person && <p className="text-sm text-red-500">{errors.contact_person.message}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Điều khoản */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Điều khoản hợp tác
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="payment_terms">Điều khoản thanh toán <span className="text-red-500">*</span></Label>
              <Select value={watch('payment_terms')} onValueChange={(value) => setValue('payment_terms', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn điều khoản..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Thanh toán ngay</SelectItem>
                  <SelectItem value="7_days">7 ngày</SelectItem>
                  <SelectItem value="15_days">15 ngày</SelectItem>
                  <SelectItem value="30_days">30 ngày</SelectItem>
                  <SelectItem value="45_days">45 ngày</SelectItem>
                  <SelectItem value="60_days">60 ngày</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Ghi chú</Label>
              <Textarea id="notes" placeholder="Ghi chú về nhà cung cấp..." rows={4} {...register('notes')} />
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Hủy
          </Button>
          <Button type="submit" disabled={createVendor.isPending || updateVendor.isPending}>
            {createVendor.isPending || updateVendor.isPending ? 'Đang lưu...' : 'Lưu'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default VendorFormPage;
