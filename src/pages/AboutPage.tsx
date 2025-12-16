import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/card'
import { Info, Building2, Shield, Zap, Users } from 'lucide-react'

export default function AboutPage() {
  const { t } = useTranslation('common')
  
  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-b">
        <div className="max-w-screen-xl mx-auto px-4 py-8">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Info className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{t('about.title')}</h1>
              <p className="text-sm text-muted-foreground">
                {t('about.appName')}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 py-6 space-y-6">
        <Card className="p-6 text-center">
          <div className="flex justify-center mb-4">
            <Building2 className="h-16 w-16 text-primary" />
          </div>
          <h2 className="text-xl font-bold mb-2">{t('about.appName')}</h2>
          <p className="text-muted-foreground mb-4">
            {t('about.tagline')}
          </p>
          <p className="text-sm text-muted-foreground">
            {t('about.version')} 1.0.0
          </p>
        </Card>

        <div>
          <h2 className="text-lg font-semibold mb-3">{t('about.features')}</h2>
          <div className="grid gap-3">
            <Card className="p-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium mb-1">{t('about.realTimeManagement')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t('about.realTimeDesc')}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium mb-1">{t('about.multiHotelSupport')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t('about.multiHotelDesc')}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium mb-1">{t('about.secureReliable')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t('about.secureDesc')}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">{t('about.legal')}</h2>
          <Card className="divide-y">
            <button className="w-full p-4 text-left hover:bg-accent transition-colors">
              {t('about.termsOfService')}
            </button>
            <button className="w-full p-4 text-left hover:bg-accent transition-colors">
              {t('about.privacyPolicy')}
            </button>
            <button className="w-full p-4 text-left hover:bg-accent transition-colors">
              {t('about.licenses')}
            </button>
          </Card>
        </div>

        <Card className="p-6 text-center bg-gradient-to-br from-primary/5 to-background">
          <p className="text-sm text-muted-foreground mb-2">
            {t('about.builtWith')}
          </p>
          <p className="text-xs text-muted-foreground">
            {t('about.copyright')}
          </p>
        </Card>
      </div>
    </div>
  )
}
