import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, ArrowRight, Building, MapPin, Phone, Mail, Hotel } from 'lucide-react'
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
import {
  registerStep2Schema,
  RegisterStep2Data,
} from '@/lib/validations/auth.schemas'

interface RegisterStep2Props {
  onSubmit: (data: RegisterStep2Data) => void
  onBack: () => void
  initialData: RegisterStep2Data | null
}

export function RegisterStep2({ onSubmit, onBack, initialData }: RegisterStep2Props) {
  const { t } = useTranslation('auth')

  const form = useForm<RegisterStep2Data>({
    resolver: zodResolver(registerStep2Schema),
    defaultValues: initialData || {
      tenantName: '',
      hotelName: '',
      hotelAddress: '',
      hotelPhone: '',
      hotelEmail: '',
      totalRooms: 1,
    },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Tenant Name */}
        <FormField
          control={form.control}
          name="tenantName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('register.tenantName')} *</FormLabel>
              <FormControl>
                <div className="relative">
                  <Building className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    {...field}
                    placeholder="Công ty ABC"
                    className="pl-10"
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Hotel Name */}
        <FormField
          control={form.control}
          name="hotelName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('register.hotelName')} *</FormLabel>
              <FormControl>
                <div className="relative">
                  <Hotel className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    {...field}
                    placeholder="Khách sạn Sunshine"
                    className="pl-10"
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Hotel Address */}
        <FormField
          control={form.control}
          name="hotelAddress"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('register.hotelAddress')} *</FormLabel>
              <FormControl>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    {...field}
                    placeholder="123 Đường ABC, Quận 1, TP.HCM"
                    className="pl-10"
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Hotel Phone */}
        <FormField
          control={form.control}
          name="hotelPhone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('register.hotelPhone')}</FormLabel>
              <FormControl>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    {...field}
                    type="tel"
                    placeholder="0912345678"
                    className="pl-10"
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Hotel Email */}
        <FormField
          control={form.control}
          name="hotelEmail"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('register.hotelEmail')}</FormLabel>
              <FormControl>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    {...field}
                    type="email"
                    placeholder="hotel@example.com"
                    className="pl-10"
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Total Rooms */}
        <FormField
          control={form.control}
          name="totalRooms"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('register.totalRooms')} *</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="number"
                  min="1"
                  placeholder="50"
                  onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Navigation Buttons */}
        <div className="flex gap-4">
          <Button type="button" variant="outline" onClick={onBack} className="flex-1">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('register.back')}
          </Button>
          <Button type="submit" className="flex-1">
            {t('register.next')}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </form>
    </Form>
  )
}
