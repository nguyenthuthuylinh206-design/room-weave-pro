import { ArrowLeft, LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'

interface MobileDetailHeaderProps {
  title: string
  showBack?: boolean
  onBack?: () => void
  action?: {
    icon: LucideIcon
    onClick: () => void
    label?: string
  }
  rightContent?: React.ReactNode
  className?: string
}

export const MobileDetailHeader = ({
  title,
  showBack = true,
  onBack,
  action,
  rightContent,
  className,
}: MobileDetailHeaderProps) => {
  const navigate = useNavigate()

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate('/')
    }
  }

  return (
    <header
      className={cn(
        'sticky top-0 z-20 bg-background border-b shadow-sm safe-area-top',
        className
      )}
    >
      <div className="flex items-center justify-between px-4 h-14">
        {/* Left: Back Button + Title */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {showBack && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 flex-shrink-0"
              onClick={handleBack}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <h1 className="font-semibold text-base truncate">{title}</h1>
        </div>

        {/* Right: Action Button or Custom Content */}
        {rightContent ? (
          rightContent
        ) : action && (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 flex-shrink-0"
            onClick={action.onClick}
            aria-label={action.label}
          >
            <action.icon className="h-5 w-5" />
          </Button>
        )}
      </div>
    </header>
  )
}
