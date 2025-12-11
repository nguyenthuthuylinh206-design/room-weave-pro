import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import { Mail, ArrowLeft, CheckCircle, Loader2, RefreshCw, AlertCircle, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { forgotPasswordSchema, ForgotPasswordData } from '@/lib/validations/auth.schemas'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

export function ForgotPasswordForm() {
  const [isSuccess, setIsSuccess] = useState(false)
  const [email, setEmail] = useState('')
  const [isResending, setIsResending] = useState(false)
  const [emailNotFound, setEmailNotFound] = useState(false)
  const { toast } = useToast()

  const form = useForm<ForgotPasswordData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  })

  const sendResetEmail = async (emailAddress: string) => {
    const { data, error } = await supabase.functions.invoke('send-password-reset', {
      body: { email: emailAddress },
    })

    // Handle function invocation error (includes non-2xx responses)
    if (error) {
      // Try to parse the error context for email_not_found flag
      const errorMessage = error.message || 'Không thể gửi email'
      
      // Check if this is an "email not found" error
      if (errorMessage.includes('chưa được đăng ký') || errorMessage.includes('404')) {
        const err = new Error('Email này chưa được đăng ký trong hệ thống') as Error & { emailNotFound?: boolean }
        err.emailNotFound = true
        throw err
      }
      
      throw new Error(errorMessage)
    }

    // Handle application-level error from edge function (for 2xx responses with error in body)
    if (data?.error) {
      const err = new Error(data.error) as Error & { emailNotFound?: boolean }
      err.emailNotFound = data.email_not_found === true
      throw err
    }

    return data
  }

  const onSubmit = async (data: ForgotPasswordData) => {
    try {
      setEmail(data.email)
      setEmailNotFound(false)
      await sendResetEmail(data.email)
      setIsSuccess(true)
      toast({
        title: 'Email đã gửi',
        description: 'Vui lòng kiểm tra hộp thư của bạn.',
      })
    } catch (error: any) {
      // Check if email not found
      if (error.emailNotFound || error.message?.includes('chưa được đăng ký')) {
        setEmailNotFound(true)
        // Don't show toast for email not found - show inline alert instead
      } else {
        toast({
          title: 'Lỗi',
          description: error.message || 'Không thể gửi email. Vui lòng thử lại.',
          variant: 'destructive',
        })
      }
    }
  }

  const handleResend = async () => {
    if (!email) return
    
    setIsResending(true)
    try {
      await sendResetEmail(email)
      toast({
        title: 'Email đã gửi lại',
        description: 'Vui lòng kiểm tra hộp thư của bạn.',
      })
    } catch (error: any) {
      toast({
        title: 'Lỗi',
        description: error.message || 'Không thể gửi lại email. Vui lòng thử lại.',
        variant: 'destructive',
      })
    } finally {
      setIsResending(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
            <CardTitle>Email đã gửi</CardTitle>
            <CardDescription>
              Chúng tôi đã gửi link đặt lại mật khẩu đến <strong>{email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                Vui lòng kiểm tra hộp thư (kể cả thư mục spam) và nhấp vào link để đặt lại mật khẩu.
                Link này sẽ hết hạn sau 1 giờ.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Button
                onClick={handleResend}
                variant="outline"
                className="w-full"
                disabled={isResending}
              >
                {isResending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang gửi...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Gửi lại email
                  </>
                )}
              </Button>
              
              <Button asChild variant="ghost" className="w-full">
                <Link to="/auth/login">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Quay lại đăng nhập
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Quên mật khẩu</CardTitle>
          <CardDescription>
            Nhập email của bạn và chúng tôi sẽ gửi link đặt lại mật khẩu
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          {...field}
                          type="email"
                          placeholder="email@example.com"
                          className="pl-10"
                          autoComplete="email"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {emailNotFound && (
                <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Email không tồn tại</AlertTitle>
                  <AlertDescription className="mt-2 space-y-3">
                    <p>Email <strong>{form.getValues('email')}</strong> chưa được đăng ký trong hệ thống.</p>
                    <Button asChild variant="outline" size="sm" className="w-full">
                      <Link to="/auth/register">
                        <UserPlus className="mr-2 h-4 w-4" />
                        Đăng ký tài khoản mới
                      </Link>
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang gửi...
                  </>
                ) : (
                  'Gửi link đặt lại mật khẩu'
                )}
              </Button>
            </form>
          </Form>

          <Button asChild variant="ghost" className="mt-4 w-full">
            <Link to="/auth/login">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Quay lại đăng nhập
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
