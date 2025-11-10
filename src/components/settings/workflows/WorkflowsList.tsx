import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Edit, Pause, Play, Trash2, FileText } from 'lucide-react'
import { Workflow, useToggleWorkflow, useDeleteWorkflow } from '@/hooks/useWorkflows'
import { format } from 'date-fns'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface WorkflowsListProps {
  workflows: Workflow[]
}

export const WorkflowsList = ({ workflows }: WorkflowsListProps) => {
  const toggleWorkflow = useToggleWorkflow()
  const deleteWorkflow = useDeleteWorkflow()

  const handleToggle = (workflow: Workflow) => {
    toggleWorkflow.mutate({
      id: workflow.id,
      status: workflow.status === 'active' ? 'inactive' : 'active'
    })
  }

  const handleDelete = (id: string) => {
    deleteWorkflow.mutate(id)
  }

  const getTriggerLabel = (workflow: Workflow) => {
    if (workflow.trigger_type === 'event' && workflow.trigger_event) {
      return workflow.trigger_event.replace('_', ' ').replace('.', ': ')
    }
    if (workflow.trigger_type === 'schedule' && workflow.trigger_schedule) {
      return `Schedule: ${workflow.trigger_schedule}`
    }
    return workflow.trigger_type
  }

  return (
    <div className="space-y-4">
      {workflows.map((workflow) => (
        <Card key={workflow.id} className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h4 className="text-lg font-semibold">{workflow.name}</h4>
                <Badge variant={workflow.status === 'active' ? 'default' : 'secondary'}>
                  {workflow.status === 'active' && '🟢'}
                  {workflow.status === 'inactive' && '⚪'}
                  {workflow.status === 'error' && '🔴'}
                  {' '}{workflow.status}
                </Badge>
                {workflow.last_run_at && (
                  <span className="text-sm text-muted-foreground">
                    Last run: {format(new Date(workflow.last_run_at), 'PPp')}
                  </span>
                )}
              </div>
              {workflow.description && (
                <p className="text-sm text-muted-foreground mb-3">
                  {workflow.description}
                </p>
              )}
            </div>
          </div>

          <div className="border-t pt-4 mb-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">Trigger:</span>
              <span className="text-muted-foreground capitalize">
                {getTriggerLabel(workflow)}
              </span>
            </div>
            {workflow.conditions && workflow.conditions.length > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">Conditions:</span>
                <span className="text-muted-foreground">
                  {workflow.conditions.length} condition(s)
                </span>
              </div>
            )}
            {workflow.actions && workflow.actions.length > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">Actions:</span>
                <span className="text-muted-foreground">
                  {workflow.actions.length} action(s)
                </span>
              </div>
            )}
          </div>

          <div className="border-t pt-4 mb-4">
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">Stats:</span>{' '}
              {workflow.total_executions} executions this month •{' '}
              {workflow.success_count} successful •{' '}
              {workflow.failed_count} failed
            </div>
            {workflow.last_error && (
              <div className="mt-2 text-sm text-destructive">
                Last error: {workflow.last_error}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleToggle(workflow)}
              disabled={toggleWorkflow.isPending}
            >
              {workflow.status === 'active' ? (
                <>
                  <Pause className="h-4 w-4 mr-1" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-1" />
                  Activate
                </>
              )}
            </Button>

            <Button variant="outline" size="sm">
              <FileText className="h-4 w-4 mr-1" />
              View Logs
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Workflow</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this workflow? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleDelete(workflow.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </Card>
      ))}
    </div>
  )
}
