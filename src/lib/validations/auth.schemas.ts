import { z } from 'zod'

// Password validation
const passwordSchema = z
  .string()
  .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
  .regex(/[A-Z]/, 'Mật khẩu phải có ít nhất 1 chữ hoa')
  .regex(/[a-z]/, 'Mật khẩu phải có ít nhất 1 chữ thường')
  .regex(/[0-9]/, 'Mật khẩu phải có ít nhất 1 số')
  .regex(/[^A-Za-z0-9]/, 'Mật khẩu phải có ít nhất 1 ký tự đặc biệt')

// Phone validation (Vietnam format)
const phoneSchema = z
  .string()
  .regex(/^(0|\+84)[0-9]{9}$/, 'Số điện thoại không hợp lệ')
  .optional()
  .or(z.literal(''))

// Login schema
export const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
  rememberMe: z.boolean().optional(),
})

export type LoginFormData = z.infer<typeof loginSchema>

// Step 1: Basic Info
export const registerStep1Schema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: passwordSchema,
  confirmPassword: z.string(),
  fullName: z.string().min(2, 'Họ tên phải có ít nhất 2 ký tự'),
  phone: phoneSchema,
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Mật khẩu xác nhận không khớp',
  path: ['confirmPassword'],
})

export type RegisterStep1Data = z.infer<typeof registerStep1Schema>

// Step 2: Hotel Info
export const registerStep2Schema = z.object({
  tenantName: z.string().min(2, 'Tên khách sạn phải có ít nhất 2 ký tự'),
  hotelName: z.string().min(2, 'Tên khách sạn phải có ít nhất 2 ký tự'),
  hotelAddress: z.string().min(5, 'Địa chỉ phải có ít nhất 5 ký tự'),
  hotelPhone: phoneSchema,
  hotelEmail: z.string().email('Email không hợp lệ').optional().or(z.literal('')),
  totalRooms: z.number().int().min(1, 'Số phòng phải lớn hơn 0'),
})

export type RegisterStep2Data = z.infer<typeof registerStep2Schema>

// Step 3: Confirmation
export const registerStep3Schema = z.object({
  agreeToTerms: z.boolean().refine((val) => val === true, {
    message: 'Bạn phải đồng ý với điều khoản sử dụng',
  }),
})

export type RegisterStep3Data = z.infer<typeof registerStep3Schema>

// Forgot password schema
export const forgotPasswordSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
})

export type ForgotPasswordData = z.infer<typeof forgotPasswordSchema>

// Reset password schema
export const resetPasswordSchema = z.object({
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Mật khẩu xác nhận không khớp',
  path: ['confirmPassword'],
})

export type ResetPasswordData = z.infer<typeof resetPasswordSchema>

// Change password schema
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
  newPassword: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Mật khẩu xác nhận không khớp',
  path: ['confirmPassword'],
}).refine((data) => data.currentPassword !== data.newPassword, {
  message: 'Mật khẩu mới phải khác mật khẩu hiện tại',
  path: ['newPassword'],
})

export type ChangePasswordData = z.infer<typeof changePasswordSchema>
