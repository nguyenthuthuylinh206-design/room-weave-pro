import { z } from 'zod'

export const userFormSchema = z.object({
  fullName: z.string().min(2, 'Họ tên phải có ít nhất 2 ký tự'),
  email: z.string().email('Email không hợp lệ'),
  phone: z.string().optional(),
  department: z.enum(['housekeeping', 'laundry', 'inventory', 'maintenance']).optional(),
  status: z.enum(['active', 'inactive']).default('active'),
})

export const profileFormSchema = z.object({
  fullName: z.string().min(2, 'Họ tên phải có ít nhất 2 ký tự'),
  phone: z.string().optional(),
  avatarUrl: z.string().optional(),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(6, 'Mật khẩu hiện tại không hợp lệ'),
  newPassword: z
    .string()
    .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
    .regex(/[A-Z]/, 'Mật khẩu phải có ít nhất 1 chữ hoa')
    .regex(/[a-z]/, 'Mật khẩu phải có ít nhất 1 chữ thường')
    .regex(/[0-9]/, 'Mật khẩu phải có ít nhất 1 số'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Mật khẩu không khớp',
  path: ['confirmPassword'],
})

export type UserFormData = z.infer<typeof userFormSchema>
export type ProfileFormData = z.infer<typeof profileFormSchema>
export type ChangePasswordData = z.infer<typeof changePasswordSchema>
