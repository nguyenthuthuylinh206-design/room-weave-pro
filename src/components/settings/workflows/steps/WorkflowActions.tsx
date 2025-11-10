import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, ChevronUp, ChevronDown, Trash2 } from 'lucide-react'
import { CreateMaintenanceAction } from '../actions/CreateMaintenanceAction'
import { SendNotificationAction } from '../actions/SendNotificationAction'
import { UpdateRecordAction } from '../actions/UpdateRecordAction'
import { CallWebhookAction } from '../actions/CallWebhookAction'
import { ActionExecutionSettingsComponent } from '../shared/ActionExecutionSettings'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface LocalWorkflowAction {
  type: string
  config: any
}

const ACTION_TYPES = [
  { value: 'create_maintenance', label: 'Create Maintenance Request' },
  { value: 'send_notification', label: 'Send Notification' },
  { value: 'send_email', label: 'Send Email' },
  { value: 'update_record', label: 'Update Record' },
  { value: 'call_webhook', label: 'Call Webhook' },
]

interface WorkflowActionsProps {
  actions: LocalWorkflowAction[]
  onChange: (actions: LocalWorkflowAction[]) => void
  triggerType: string
  triggerEvent?: string
}

export const WorkflowActions = ({ actions, onChange, triggerType, triggerEvent }: WorkflowActionsProps) => {
  const addAction = (type: string) => {
    const newAction: LocalWorkflowAction = {
      type,
      config: {}
    }
    onChange([...actions, newAction])
  }

  const removeAction = (index: number) => {
    onChange(actions.filter((_, i) => i !== index))
  }

  const moveAction = (index: number, direction: 'up' | 'down') => {
    const newActions = [...actions]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    
    if (targetIndex >= 0 && targetIndex < actions.length) {
      [newActions[index], newActions[targetIndex]] = [newActions[targetIndex], newActions[index]]
      onChange(newActions)
    }
  }

  const updateAction = (index: number, config: any) => {
    const newActions = [...actions]
    newActions[index] = { ...newActions[index], config }
    onChange(newActions)
  }

  const getActionLabel = (type: string) => {
    return ACTION_TYPES.find(t => t.value === type)?.label || type
  }

  const renderActionConfig = (action: LocalWorkflowAction, index: number) => {
    switch (action.type) {
      case 'create_maintenance':
        return (
          <CreateMaintenanceAction
            config={action.config}
            onChange={(config) => updateAction(index, config)}
          />
        )
      case 'send_notification':
      case 'send_email':
        return (
          <SendNotificationAction
            config={action.config}
            onChange={(config) => updateAction(index, config)}
            type={action.type === 'send_email' ? 'email' : 'notification'}
            triggerType={triggerType}
          />
        )
      case 'update_record':
        return (
          <UpdateRecordAction
            config={action.config}
            onChange={(config) => updateAction(index, config)}
          />
        )
      case 'call_webhook':
        return (
          <CallWebhookAction
            config={action.config}
            onChange={(config) => updateAction(index, config)}
          />
        )
      default:
        return <div>Unknown action type</div>
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {actions && actions.length > 0 ? (
          actions.map((action, index) => (
            <Card key={index} className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Action {index + 1}</Badge>
                  <span className="font-medium">{getActionLabel(action.type)}</span>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => moveAction(index, 'up')}
                    disabled={index === 0}
                    title="Move up"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => moveAction(index, 'down')}
                    disabled={index === actions.length - 1}
                    title="Move down"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeAction(index)}
                    title="Remove action"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
              
              <div className="mt-4">
                {renderActionConfig(action, index)}
              </div>
            </Card>
          ))
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>No actions added yet. Add your first action below.</p>
          </div>
        )}
      </div>

      <Select onValueChange={(value) => addAction(value)}>
        <SelectTrigger className="w-[250px]">
          <SelectValue placeholder="Add action..." />
        </SelectTrigger>
        <SelectContent>
          {ACTION_TYPES.map((type) => (
            <SelectItem key={type.value} value={type.value}>
              {type.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {actions && actions.length > 0 && (
        <ActionExecutionSettingsComponent
          settings={{
            execution_mode: 'sequential',
            on_failure: 'stop',
            retry_count: 3
          }}
          onChange={() => {}}
        />
      )}
    </div>
  )
}
