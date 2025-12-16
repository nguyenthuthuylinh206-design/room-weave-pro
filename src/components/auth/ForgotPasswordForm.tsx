import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import { Mail, ArrowLeft, CheckCircle, Loader2, RefreshCw, AlertCircle, UserPlus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation(['auth', 'common'])
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

    if (error) {
      throw new Error(t('common:messages.errorOccurred'))
    }

    if (data?.email_not_found) {
      const err = new Error(t('errors.emailNotFound')) as Error & { emailNotFound?: boolean }
      err.emailNotFound = true
      throw err
    }

    if (data?.success === false || data?.error) {
      throw new Error(data.error || t('common:messages.errorOccurred'))
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
        title: t('forgotPassword.emailSent'),
        description: t('common:messages.success'),
      })
    } catch (error: any) {
      if (error.emailNotFound || error.message?.includes('chưa được đăng ký')) {
        setEmailNotFound(true)
      } else {
        toast({
          title: t('common:messages.error'),
          description: error.message || t('common:messages.errorOccurred'),
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
        title: t('forgotPassword.emailSent'),
        description: t('common:messages.success'),
      })
    } catch (error: any) {
      toast({
        title: t('common:messages.error'),
        description: error.message || t('common:messages.errorOccurred'),
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
            <CardTitle>{t('forgotPassword.emailSent')}</CardTitle>
            <CardDescription>
              {t('forgotPassword.subtitle')} <strong>{email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                {t('forgotPassword.checkInbox')}
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
                    {t('common:messages.loading')}
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {t('forgotPassword.resend')}
                  </>
                )}
              </Button>
              
              <Button asChild variant="ghost" className="w-full">
                <Link to="/auth/login">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {t('forgotPassword.backToLogin')}
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
          <CardTitle>{t('forgotPassword.title')}</CardTitle>
          <CardDescription>
            {t('forgotPassword.subtitle')}
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
                    <FormLabel>{t('forgotPassword.email')}</FormLabel>
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
                  <AlertTitle>{t('errors.emailNotFound')}</AlertTitle>
                  <AlertDescription className="mt-2 space-y-3">
                    <p>{t('errors.emailNotFound')}</p>
                    <Button asChild variant="outline" size="sm" className="w-full">
                      <Link to="/auth/register">
                        <UserPlus className="mr-2 h-4 w-4" />
                        {t('login.signUp')}
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
                    {t('common:messages.loading')}
                  </>
                ) : (
                  t('forgotPassword.sendButton')
                )}
              </Button>
            </form>
          </Form>

          <Button asChild variant="ghost" className="mt-4 w-full">
            <Link to="/auth/login">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('forgotPassword.backToLogin')}
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
