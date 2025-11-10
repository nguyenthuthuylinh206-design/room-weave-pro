import { Button } from '@/components/ui/button'
import { Plus, ChevronUp, ChevronDown, X } from 'lucide-react'
import { WorkflowAction } from '@/hooks/useWorkflows'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { CreateMaintenanceAction } from '../actions/CreateMaintenanceAction'
import { SendNotificationAction } from '../actions/SendNotificationAction'
import { Card } from '@/components/ui/card'

interface WorkflowActionsProps {
  actions: WorkflowAction[]
  onChange: (actions: WorkflowAction[]) => void
  triggerType: string
  triggerEvent?: string
}

const ACTION_TYPES = [
  { value: 'create_maintenance', label: 'Create Maintenance Request' },
  { value: 'send_notification', label: 'Send Notification' },
  { value: 'send_email', label: 'Send Email' },
  { value: 'update_record', label: 'Update Record' },
  { value: 'webhook', label: 'Call Webhook' },
  { value: 'wait', label: 'Wait / Delay' },
]

export const WorkflowActions = ({
  actions,
  onChange,
  triggerType,
  triggerEvent
}: WorkflowActionsProps) => {
  const addAction = (type: string) => {
    onChange([
      ...actions,
      {
        action_type: type as any,
        action_config: {},
        order_index: actions.length,
      }
    ])
  }

  const removeAction = (index: number) => {
    onChange(actions.filter((_, i) => i !== index))
  }

  const moveAction = (index: number, direction: 'up' | 'down') => {
    const newActions = [...actions]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    
    if (targetIndex >= 0 && targetIndex < actions.length) {
      [newActions[index], newActions[targetIndex]] = [newActions[targetIndex], newActions[index]]
      newActions.forEach((action, i) => {
        action.order_index = i
      })
      onChange(newActions)
    }
  }

  const updateAction = (index: number, config: any) => {
    onChange(
      actions.map((action, i) =>
        i === index ? { ...action, action_config: config } : action
      )
    )
  }

  const renderActionConfig = (action: WorkflowAction, index: number) => {
    switch (action.action_type) {
      case 'create_maintenance':
        return (
          <CreateMaintenanceAction
            config={action.action_config}
            onChange={(config) => updateAction(index, config)}
            triggerEvent={triggerEvent}
          />
        )
      case 'send_notification':
      case 'send_email':
        return (
          <SendNotificationAction
            config={action.action_config}
            onChange={(config) => updateAction(index, config)}
            type={action.action_type === 'send_email' ? 'email' : 'notification'}
          />
        )
      default:
        return <div className="text-sm text-muted-foreground">Configuration coming soon</div>
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">What should happen?</h3>
        <p className="text-sm text-muted-foreground">
          Define the actions to execute when conditions are met
        </p>
      </div>

      <div className="space-y-4">
        {actions.map((action, index) => (
          <Card key={index} className="p-6">
            <div className="flex items-start justify-between mb-4">
              <h4 className="font-semibold">
                Action {index + 1}: {ACTION_TYPES.find(t => t.value === action.action_type)?.label}
              </h4>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => moveAction(index, 'up')}
                  disabled={index === 0}
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => moveAction(index, 'down')}
                  disabled={index === actions.length - 1}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeAction(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="border-t pt-4">
              {renderActionConfig(action, index)}
            </div>
          </Card>
        ))}

        <div>
          <Label>Add Action</Label>
          <Select onValueChange={addAction}>
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder="Select action type" />
            </SelectTrigger>
            <SelectContent>
              {ACTION_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
