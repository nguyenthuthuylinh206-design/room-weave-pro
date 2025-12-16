import { useNavigate } from 'react-router-dom'
import { PackagePlus, Wind, ClipboardCheck, FileText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useTranslation } from 'react-i18next'

export function QuickActions() {
  const { t } = useTranslation('dashboard')
  const navigate = useNavigate()
  
  const actions = [
    {
      icon: PackagePlus,
      labelKey: 'quickActions.newInbound',
      onClick: () => navigate('/inventory'),
      color: 'text-blue-600 dark:text-blue-400',
    },
    {
      icon: Wind,
      labelKey: 'quickActions.newLaundry',
      onClick: () => navigate('/laundry'),
      color: 'text-cyan-600 dark:text-cyan-400',
    },
    {
      icon: ClipboardCheck,
      labelKey: 'quickActions.checkRoom',
      onClick: () => navigate('/rooms'),
      color: 'text-purple-600 dark:text-purple-400',
    },
    {
      icon: FileText,
      labelKey: 'quickActions.viewReports',
      onClick: () => navigate('/reports'),
      color: 'text-orange-600 dark:text-orange-400',
    },
  ]
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('quickActions.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {actions.map((action) => (
            <Button
              key={action.labelKey}
              variant="outline"
              className="h-auto flex-col gap-2 py-4 hover:bg-accent"
              onClick={action.onClick}
            >
              <action.icon className={`h-6 w-6 ${action.color}`} />
              <span className="text-sm font-medium">{t(action.labelKey)}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
