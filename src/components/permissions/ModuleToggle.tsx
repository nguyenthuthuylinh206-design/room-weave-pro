import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'

interface ModuleToggleProps {
  moduleName: string
  enabled: boolean
  source: 'role' | 'custom' | null
  onChange: (enabled: boolean) => void
  disabled?: boolean
}

export function ModuleToggle({
  moduleName,
  enabled,
  source,
  onChange,
  disabled = false,
}: ModuleToggleProps) {
  return (
    <div className="flex items-center justify-between py-3 px-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <div className="flex items-center gap-3">
        <Switch
          checked={enabled}
          onCheckedChange={onChange}
          disabled={disabled}
        />
        <Label className="text-sm font-medium cursor-pointer" onClick={() => !disabled && onChange(!enabled)}>
          {moduleName}
        </Label>
      </div>
      
      {source && (
        <Badge variant={source === 'role' ? 'secondary' : 'default'} className="text-xs">
          {source === 'role' ? 'Role' : 'Custom'}
        </Badge>
      )}
    </div>
  )
}
