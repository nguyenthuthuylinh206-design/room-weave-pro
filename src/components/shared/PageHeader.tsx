import { Button } from '@/components/ui/button'
import { LucideIcon } from 'lucide-react'
import { ReactNode } from 'react'
import { ContextualHelpButton } from './ContextualHelpButton'

interface PageHeaderProps {
  title: string
  description?: string
  action?: {
    label: string
    icon?: LucideIcon
    onClick: () => void
  }
  children?: ReactNode
  showHelp?: boolean
}

export const PageHeader = ({ title, description, action, children, showHelp = true }: PageHeaderProps) => {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          {description && (
            <p className="mt-2 text-muted-foreground">{description}</p>
          )}
        </div>
        {showHelp && <ContextualHelpButton />}
      </div>
      <div className="flex gap-2">
        {children}
        {action && (
          <Button onClick={action.onClick}>
            {action.icon && <action.icon className="mr-2 h-4 w-4" />}
            {action.label}
          </Button>
        )}
      </div>
    </div>
  )
}
