import { useState } from 'react'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { ACTIONS } from '@/hooks/useUserPermissions'
import { cn } from '@/lib/utils'

interface ModuleToggleProps {
  moduleName: string
  enabled: boolean
  source: 'role' | 'custom' | null
  onChange: (enabled: boolean) => void
  disabled?: boolean
  // Action-level control
  actions?: Record<string, boolean>
  onActionChange?: (action: string, enabled: boolean) => void
}

export function ModuleToggle({
  moduleName,
  enabled,
  source,
  onChange,
  disabled = false,
  actions,
  onActionChange,
}: ModuleToggleProps) {
  const [expanded, setExpanded] = useState(false)
  
  const hasActionControl = actions && onActionChange
  const allActionsEnabled = hasActionControl && Object.values(actions).every(v => v)
  const someActionsEnabled = hasActionControl && Object.values(actions).some(v => v) && !allActionsEnabled

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      {/* Module Header */}
      <div className="flex items-center justify-between py-3 px-4 hover:bg-accent/50 transition-colors">
        <div className="flex items-center gap-3 flex-1">
          {hasActionControl && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-0.5 hover:bg-accent rounded transition-colors"
              disabled={disabled || !enabled}
            >
              {expanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          )}
          
          <Switch
            checked={enabled}
            onCheckedChange={onChange}
            disabled={disabled}
          />
          
          <Label 
            className="text-sm font-medium cursor-pointer flex-1" 
            onClick={() => !disabled && onChange(!enabled)}
          >
            {moduleName}
          </Label>
        </div>
        
        <div className="flex items-center gap-2">
          {someActionsEnabled && enabled && (
            <Badge variant="outline" className="text-xs">
              Tùy chỉnh
            </Badge>
          )}
          {source && (
            <Badge variant={source === 'role' ? 'secondary' : 'default'} className="text-xs">
              {source === 'role' ? 'Role' : 'Custom'}
            </Badge>
          )}
        </div>
      </div>

      {/* Actions Detail */}
      {expanded && hasActionControl && enabled && (
        <div className="border-t bg-muted/30 p-4 space-y-2">
          <p className="text-xs text-muted-foreground mb-3">
            Tùy chỉnh quyền chi tiết:
          </p>
          
          <div className="grid grid-cols-2 gap-2">
            {ACTIONS.map((action) => (
              <div
                key={action.code}
                className="flex items-center gap-2 p-2 rounded bg-background border"
              >
                <Switch
                  checked={actions[action.code] || false}
                  onCheckedChange={(checked) => onActionChange(action.code, checked)}
                  disabled={disabled}
                  className="scale-90"
                />
                <Label className="text-xs cursor-pointer flex-1">
                  {action.name}
                </Label>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
