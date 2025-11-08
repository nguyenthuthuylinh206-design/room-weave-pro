import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
})

export const registerStep1Schema = z.object({
  fullName: z.string().min(2, 'Họ tên phải có ít nhất 2 ký tự'),
  email: z.string().email('Email không hợp lệ'),
  password: z
    .string()
    .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
    .regex(/[A-Z]/, 'Mật khẩu phải có ít nhất 1 chữ hoa')
    .regex(/[a-z]/, 'Mật khẩu phải có ít nhất 1 chữ thường')
    .regex(/[0-9]/, 'Mật khẩu phải có ít nhất 1 số'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Mật khẩu không khớp',
  path: ['confirmPassword'],
})

export const registerStep2Schema = z.object({
  tenantName: z.string().min(2, 'Tên tổ chức phải có ít nhất 2 ký tự'),
  tenantEmail: z.string().email('Email không hợp lệ'),
  tenantPhone: z.string().min(10, 'Số điện thoại không hợp lệ'),
})

export const registerStep3Schema = z.object({
  hotelName: z.string().min(2, 'Tên khách sạn phải có ít nhất 2 ký tự'),
  hotelAddress: z.string().min(5, 'Địa chỉ phải có ít nhất 5 ký tự'),
  hotelPhone: z.string().min(10, 'Số điện thoại không hợp lệ'),
  hotelEmail: z.string().email('Email không hợp lệ'),
  totalRooms: z.coerce.number().min(1, 'Phải có ít nhất 1 phòng').max(10000, 'Số phòng không hợp lệ'),
})

export const forgotPasswordSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
})

export const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
    .regex(/[A-Z]/, 'Mật khẩu phải có ít nhất 1 chữ hoa')
    .regex(/[a-z]/, 'Mật khẩu phải có ít nhất 1 chữ thường')
    .regex(/[0-9]/, 'Mật khẩu phải có ít nhất 1 số'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Mật khẩu không khớp',
  path: ['confirmPassword'],
})

export type LoginFormData = z.infer<typeof loginSchema>
export type RegisterStep1Data = z.infer<typeof registerStep1Schema>
export type RegisterStep2Data = z.infer<typeof registerStep2Schema>
export type RegisterStep3Data = z.infer<typeof registerStep3Schema>
export type ForgotPasswordData = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordData = z.infer<typeof resetPasswordSchema>
