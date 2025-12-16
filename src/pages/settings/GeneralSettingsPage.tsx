import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { useTenant } from '@/hooks/useTenant'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Save } from 'lucide-react'
import { UnsavedChangesPrompt } from '@/components/settings/UnsavedChangesPrompt'
import { useAutoSave } from '@/hooks/useAutoSave'
import { logUpdate } from '@/lib/activityLogger'
import { SeedDataButton } from '@/components/settings/SeedDataButton'

const createGeneralSettingsSchema = (t: (key: string) => string) => z.object({
  name: z.string().min(2, t('settings:general.validation.companyNameMin')),
  email: z.string().email(t('settings:general.validation.emailInvalid')),
  phone: z.string().optional(),
  settings: z.object({
    timezone: z.string().default('Asia/Ho_Chi_Minh'),
    language: z.enum(['vi', 'en']).default('vi'),
    currency: z.string().default('VND'),
    date_format: z.string().default('DD/MM/YYYY'),
  }),
})

type GeneralSettingsForm = z.infer<ReturnType<typeof createGeneralSettingsSchema>>

export function GeneralSettingsPage() {
  const { t } = useTranslation(['settings', 'common'])
  const { tenant, isLoading } = useTenant()
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)
  const [enableAutoSave, setEnableAutoSave] = useState(false)

  const generalSettingsSchema = createGeneralSettingsSchema(t)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<GeneralSettingsForm>({
    resolver: zodResolver(generalSettingsSchema),
    values: tenant ? {
      name: tenant.name,
      email: tenant.email,
      phone: tenant.phone || '',
      settings: {
        timezone: (tenant.settings as any)?.timezone || 'Asia/Ho_Chi_Minh',
        language: (tenant.settings as any)?.language || 'vi',
        currency: (tenant.settings as any)?.currency || 'VND',
        date_format: (tenant.settings as any)?.date_format || 'DD/MM/YYYY',
      },
    } : undefined,
  })

  const formData = watch()

  // Auto-save
  useAutoSave({
    data: formData,
    onSave: async (data) => {
      if (!tenant) return
      
      const oldValues = {
        name: tenant.name,
        email: tenant.email,
        phone: tenant.phone,
        settings: tenant.settings,
      }

      await supabase
        .from('tenants')
        .update({
          name: data.name,
          email: data.email,
          phone: data.phone || null,
          settings: data.settings,
        })
        .eq('id', tenant.id)

      // Log the activity
      await logUpdate('tenant_settings', tenant.id, 'Cài đặt chung', oldValues, data)
    },
    enabled: enableAutoSave && isDirty,
  })

  const onSubmit = async (data: GeneralSettingsForm) => {
    if (!tenant) return

    setIsSaving(true)
    try {
      const oldValues = {
        name: tenant.name,
        email: tenant.email,
        phone: tenant.phone,
        settings: tenant.settings,
      }

      const { error } = await supabase
        .from('tenants')
        .update({
          name: data.name,
          email: data.email,
          phone: data.phone || null,
          settings: data.settings,
        })
        .eq('id', tenant.id)

      if (error) throw error

      // Log the activity
      await logUpdate('tenant_settings', tenant.id, t('settings:general.title'), oldValues, data)

      toast({
        title: t('settings:general.saved'),
        description: t('settings:general.savedDescription'),
      })
    } catch (error: any) {
      toast({
        title: t('settings:general.error'),
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('settings:general.pageTitle')}</h1>
        <p className="text-muted-foreground mt-2">
          {t('settings:general.pageDescription')}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Company Information */}
        <Card>
          <CardHeader>
            <CardTitle>{t('settings:general.companyInfo.title')}</CardTitle>
            <CardDescription>{t('settings:general.companyInfo.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('settings:general.companyName')} *</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder={t('settings:general.companyNamePlaceholder')}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">{t('settings:general.email')} *</Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  placeholder={t('settings:general.emailPlaceholder')}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">{t('settings:general.phone')}</Label>
                <Input
                  id="phone"
                  {...register('phone')}
                  placeholder={t('settings:general.phonePlaceholder')}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Regional Settings */}
        <Card>
          <CardHeader>
            <CardTitle>{t('settings:general.regionalSettings.title')}</CardTitle>
            <CardDescription>{t('settings:general.regionalSettings.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('settings:general.timezone')}</Label>
                <Select
                  value={watch('settings.timezone')}
                  onValueChange={(value) => setValue('settings.timezone', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Asia/Ho_Chi_Minh">{t('settings:general.timezones.hoChiMinh')}</SelectItem>
                    <SelectItem value="Asia/Bangkok">{t('settings:general.timezones.bangkok')}</SelectItem>
                    <SelectItem value="Asia/Singapore">{t('settings:general.timezones.singapore')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t('settings:general.language')}</Label>
                <Select
                  value={watch('settings.language')}
                  onValueChange={(value: 'vi' | 'en') => setValue('settings.language', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vi">{t('settings:general.languages.vi')}</SelectItem>
                    <SelectItem value="en">{t('settings:general.languages.en')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t('settings:general.currency')}</Label>
                <Select
                  value={watch('settings.currency')}
                  onValueChange={(value) => setValue('settings.currency', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VND">{t('settings:general.currencies.VND')}</SelectItem>
                    <SelectItem value="USD">{t('settings:general.currencies.USD')}</SelectItem>
                    <SelectItem value="EUR">{t('settings:general.currencies.EUR')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t('settings:general.dateFormat')}</Label>
                <Select
                  value={watch('settings.date_format')}
                  onValueChange={(value) => setValue('settings.date_format', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                    <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                    <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Demo Data Section */}
        <Card>
          <CardHeader>
            <CardTitle>{t('settings:demoData.title')}</CardTitle>
            <CardDescription>
              {t('settings:demoData.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SeedDataButton />
          </CardContent>
        </Card>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="auto-save"
              checked={enableAutoSave}
              onChange={(e) => setEnableAutoSave(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="auto-save" className="text-sm font-normal cursor-pointer">
              {t('settings:general.autoSave')}
            </Label>
          </div>
          
          <div className="flex gap-3">
            <Button type="button" variant="outline">
              {t('settings:general.cancel')}
            </Button>
            <Button type="submit" disabled={isSaving || !isDirty}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {!isSaving && <Save className="mr-2 h-4 w-4" />}
              {t('settings:general.saveChanges')}
            </Button>
          </div>
        </div>
      </form>

      <UnsavedChangesPrompt when={isDirty && !enableAutoSave} />
    </div>
  )
}
