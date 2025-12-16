import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Check, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form'
import {
  registerStep3Schema,
  RegisterStep3Data,
  RegisterStep1Data,
  RegisterStep2Data,
} from '@/lib/validations/auth.schemas'

interface RegisterStep3Props {
  onSubmit: (data: RegisterStep3Data) => void
  onBack: () => void
  step1Data: RegisterStep1Data
  step2Data: RegisterStep2Data
  isSubmitting: boolean
}

export function RegisterStep3({ onSubmit, onBack, step1Data, step2Data, isSubmitting }: RegisterStep3Props) {
  const { t } = useTranslation(['auth', 'common'])

  const form = useForm<RegisterStep3Data>({
    resolver: zodResolver(registerStep3Schema),
    defaultValues: {
      agreeToTerms: false,
    },
  })

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold mb-2">{t('register.personalInfo')}</h3>
          <div className="space-y-1 text-sm">
            <p><span className="text-muted-foreground">{t('register.fullName')}:</span> {step1Data.fullName}</p>
            <p><span className="text-muted-foreground">{t('register.email')}:</span> {step1Data.email}</p>
            {step1Data.phone && (
              <p><span className="text-muted-foreground">{t('register.phone')}:</span> {step1Data.phone}</p>
            )}
          </div>
        </div>

        <Separator />

        <div>
          <h3 className="font-semibold mb-2">{t('register.hotelInfo')}</h3>
          <div className="space-y-1 text-sm">
            <p><span className="text-muted-foreground">{t('register.tenantName')}:</span> {step2Data.tenantName}</p>
            <p><span className="text-muted-foreground">{t('register.hotelName')}:</span> {step2Data.hotelName}</p>
            <p><span className="text-muted-foreground">{t('register.hotelAddress')}:</span> {step2Data.hotelAddress}</p>
            {step2Data.hotelPhone && (
              <p><span className="text-muted-foreground">{t('register.hotelPhone')}:</span> {step2Data.hotelPhone}</p>
            )}
            {step2Data.hotelEmail && (
              <p><span className="text-muted-foreground">{t('register.hotelEmail')}:</span> {step2Data.hotelEmail}</p>
            )}
            <p><span className="text-muted-foreground">{t('register.totalRooms')}:</span> {step2Data.totalRooms}</p>
          </div>
        </div>
      </div>

      <Separator />

      {/* Terms and Conditions */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="agreeToTerms"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <Label className="cursor-pointer">
                    {t('register.agreeTerms')}
                  </Label>
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />

          {/* Navigation Buttons */}
          <div className="flex gap-4">
            <Button type="button" variant="outline" onClick={onBack} className="flex-1" disabled={isSubmitting}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('register.back')}
            </Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('common:messages.loading')}
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  {t('register.submit')}
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
