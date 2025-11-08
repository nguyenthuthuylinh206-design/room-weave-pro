import { Button } from '@/components/ui/button'
import { LucideIcon } from 'lucide-react'

interface PageHeaderProps {
  title: string
  description?: string
  action?: {
    label: string
    icon?: LucideIcon
    onClick: () => void
  }
}

export const PageHeader = ({ title, description, action }: PageHeaderProps) => {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="mt-2 text-muted-foreground">{description}</p>
        )}
      </div>
      {action && (
        <Button onClick={action.onClick}>
          {action.icon && <action.icon className="mr-2 h-4 w-4" />}
          {action.label}
        </Button>
      )}
    </div>
  )
}
