import { z } from 'zod'

export const roomFormSchema = z.object({
  room_number: z.string()
    .min(1, 'Vui lòng nhập số phòng')
    .max(10, 'Số phòng không được quá 10 ký tự')
    .trim(),
  floor: z.number().int('Tầng phải là số nguyên').min(1, 'Tầng phải >= 1'),
  room_type: z.enum(['standard', 'deluxe', 'suite', 'vip'], {
    required_error: 'Vui lòng chọn loại phòng',
  }),
  status: z.enum(['vacant', 'occupied', 'cleaning', 'maintenance', 'out_of_order']).default('vacant'),
  hotel_id: z.string().uuid('Vui lòng chọn khách sạn'),
  
  area_sqm: z.number().positive('Diện tích phải > 0').max(1000, 'Diện tích không hợp lệ').optional(),
  bed_type: z.enum(['single', 'double', 'twin', 'king', 'queen']).optional(),
  max_guests: z.number().int().min(1, 'Số khách phải >= 1').max(20, 'Số khách không hợp lệ').default(2),
  base_price: z.number().min(0, 'Giá phải >= 0').max(999999999, 'Giá không hợp lệ').optional(),
  
  has_window: z.boolean().default(true),
  has_balcony: z.boolean().default(false),
  view_type: z.enum(['city', 'sea', 'garden', 'mountain']).optional(),
  smoking_allowed: z.boolean().default(false),
  
  amenities: z.array(z.string().max(100, 'Tiện nghi không hợp lệ')).default([]),
  notes: z.string().max(1000, 'Ghi chú không được quá 1000 ký tự').optional(),
  
  apply_standards: z.boolean().default(true),
})

export const roomCheckFormSchema = z.object({
  check_type: z.enum(['daily', 'checkout', 'checkin', 'maintenance'], {
    required_error: 'Vui lòng chọn loại kiểm tra',
  }),
  cleanliness_score: z.number({
    required_error: 'Vui lòng đánh giá mức độ sạch sẽ',
  }).int().min(1, 'Điểm phải từ 1-5').max(5, 'Điểm phải từ 1-5'),
  items_complete: z.boolean().default(true),
  items_missing: z.array(z.any()).default([]),
  items_damaged: z.array(z.any()).default([]),
  notes: z.string().max(1000, 'Ghi chú không được quá 1000 ký tự').optional(),
  photos: z.array(z.string().url('URL ảnh không hợp lệ')).max(10, 'Tối đa 10 ảnh').default([]),
})

export const standardFormSchema = z.object({
  item_id: z.string().uuid('Vui lòng chọn đồ dùng'),
  quantity: z.number().int().min(1, 'Số lượng phải >= 1').max(1000, 'Số lượng không hợp lệ'),
})

export type RoomFormData = z.infer<typeof roomFormSchema>
export type RoomCheckFormData = z.infer<typeof roomCheckFormSchema>
export type StandardFormData = z.infer<typeof standardFormSchema>
