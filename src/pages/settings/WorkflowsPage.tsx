import { useState } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { useWorkflows } from '@/hooks/useWorkflows'
import { WorkflowsList } from '@/components/settings/workflows/WorkflowsList'
import { CreateWorkflowDialog } from '@/components/settings/workflows/CreateWorkflowDialog'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

export default function WorkflowsPage() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const { data: workflows, isLoading } = useWorkflows()

  const activeWorkflows = workflows?.filter(w => w.status === 'active') || []
  const inactiveWorkflows = workflows?.filter(w => w.status === 'inactive') || []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workflow Automation"
        description="Automate repetitive tasks with custom workflows"
      >
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Workflow
        </Button>
      </PageHeader>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <div className="space-y-6">
          {activeWorkflows.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">
                Active Workflows ({activeWorkflows.length})
              </h3>
              <WorkflowsList workflows={activeWorkflows} />
            </div>
          )}

          {inactiveWorkflows.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">
                Inactive Workflows ({inactiveWorkflows.length})
              </h3>
              <WorkflowsList workflows={inactiveWorkflows} />
            </div>
          )}

          {workflows && workflows.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg mb-4">No workflows yet</p>
              <p className="text-sm mb-6">
                Create your first workflow to automate repetitive tasks
              </p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Workflow
              </Button>
            </div>
          )}
        </div>
      )}

      <CreateWorkflowDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </div>
  )
}
