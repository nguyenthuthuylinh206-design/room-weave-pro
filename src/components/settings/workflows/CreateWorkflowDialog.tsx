import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { WorkflowBasicInfo } from './steps/WorkflowBasicInfo'
import { WorkflowTrigger } from './steps/WorkflowTrigger'
import { WorkflowConditions } from './steps/WorkflowConditions'
import { WorkflowActions } from './steps/WorkflowActions'
import { useCreateWorkflow, WorkflowCondition } from '@/hooks/useWorkflows'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface CreateWorkflowDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface LocalWorkflowAction {
  type: string
  config: any
}

interface WorkflowForm {
  name: string
  description: string
  trigger_type: 'event' | 'schedule' | 'manual'
  trigger_event?: string
  trigger_schedule?: string
  conditions: WorkflowCondition[]
  actions: LocalWorkflowAction[]
}

const INITIAL_FORM: WorkflowForm = {
  name: '',
  description: '',
  trigger_type: 'event',
  conditions: [],
  actions: [],
}

export const CreateWorkflowDialog = ({ open, onOpenChange }: CreateWorkflowDialogProps) => {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<WorkflowForm>(INITIAL_FORM)
  const createWorkflow = useCreateWorkflow()

  const handleNext = () => {
    if (step < 4) setStep(step + 1)
  }

  const handleBack = () => {
    if (step > 1) setStep(step - 1)
  }

  const handleSubmit = async () => {
    try {
      await createWorkflow.mutateAsync({
        workflow: {
          name: form.name,
          description: form.description,
          trigger_type: form.trigger_type,
          trigger_event: form.trigger_event,
          trigger_schedule: form.trigger_schedule,
          conditions: form.conditions,
          status: 'active',
        },
        actions: form.actions.map((action, index) => ({
          action_type: action.type as any,
          action_config: action.config,
          order_index: index,
        })),
      })
      onOpenChange(false)
      setStep(1)
      setForm(INITIAL_FORM)
    } catch (error) {
      console.error('Failed to create workflow:', error)
    }
  }

  const canProceed = () => {
    switch (step) {
      case 1:
        return form.name.trim().length > 0
      case 2:
        if (form.trigger_type === 'event') {
          return !!form.trigger_event
        }
        if (form.trigger_type === 'schedule') {
          return !!form.trigger_schedule
        }
        return true
      case 3:
        return true // Conditions are optional
      case 4:
        return form.actions.length > 0
      default:
        return false
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Create Workflow - Step {step}/4
          </DialogTitle>
        </DialogHeader>

        <div className="mt-6">
          {step === 1 && (
            <WorkflowBasicInfo
              form={form}
              onChange={(updates) => setForm({ ...form, ...updates })}
            />
          )}

          {step === 2 && (
            <WorkflowTrigger
              form={form}
              onChange={(updates) => setForm({ ...form, ...updates })}
            />
          )}

          {step === 3 && (
            <WorkflowConditions
              conditions={form.conditions}
              onChange={(conditions) => setForm({ ...form, conditions })}
              triggerType={form.trigger_type}
              triggerEvent={form.trigger_event}
            />
          )}

          {step === 4 && (
            <WorkflowActions
              actions={form.actions}
              onChange={(actions) => setForm({ ...form, actions })}
              triggerType={form.trigger_type}
              triggerEvent={form.trigger_event}
            />
          )}
        </div>

        <div className="flex items-center justify-between mt-6 pt-6 border-t">
          <div className="flex items-center gap-2">
            {step > 1 && (
              <Button variant="outline" onClick={handleBack}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {step < 4 ? (
              <Button onClick={handleNext} disabled={!canProceed()}>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={handleSubmit}
                  disabled={!canProceed() || createWorkflow.isPending}
                >
                  Save Draft
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!canProceed() || createWorkflow.isPending}
                >
                  Create Workflow
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
