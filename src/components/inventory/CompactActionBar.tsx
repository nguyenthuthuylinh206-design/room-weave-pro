import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { 
  Download, 
  Upload, 
  ClipboardCheck, 
  FileText, 
  Package 
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface CompactActionBarProps {
  onInbound: () => void
  onOutbound: () => void
}

export function CompactActionBar({ onInbound, onOutbound }: CompactActionBarProps) {
  const { t } = useTranslation('inventory')
  const navigate = useNavigate()

  const actions = [
    {
      icon: Download,
      label: t('inbound.title'),
      onClick: onInbound,
      variant: 'default' as const,
      className: 'bg-green-600 hover:bg-green-700 text-white border-0',
    },
    {
      icon: Upload,
      label: t('outbound.title'),
      onClick: onOutbound,
      variant: 'default' as const,
      className: 'bg-orange-500 hover:bg-orange-600 text-white border-0',
    },
    {
      icon: ClipboardCheck,
      label: t('adjustment.title'),
      onClick: () => navigate('/inventory/adjustments'),
      variant: 'outline' as const,
      className: '',
    },
    {
      icon: FileText,
      label: t('quickActions.viewTransactions'),
      onClick: () => navigate('/inventory/transactions'),
      variant: 'outline' as const,
      className: '',
    },
    {
      icon: Package,
      label: t('quickActions.manageItems'),
      onClick: () => navigate('/items'),
      variant: 'outline' as const,
      className: '',
    },
  ]

  return (
    <Card className="p-4 h-full flex flex-col justify-center">
      <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">
        {t('quickActions.title')}
      </p>
      <TooltipProvider delayDuration={100}>
        <div className="flex flex-wrap gap-2">
          {actions.map((action, index) => (
            <Tooltip key={index}>
              <TooltipTrigger asChild>
                <Button
                  variant={action.variant}
                  size="icon"
                  className={`h-10 w-10 ${action.className}`}
                  onClick={action.onClick}
                >
                  <action.icon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{action.label}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>
    </Card>
  )
}
