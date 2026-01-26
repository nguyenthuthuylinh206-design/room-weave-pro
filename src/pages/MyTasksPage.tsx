import { useSearchParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StaffTasksTab } from '@/components/housekeeping/StaffTasksTab'

/**
 * Page for staff to view their assigned tasks
 * Accessible without special permissions - any authenticated user can see their own tasks
 * Used when clicking on task assignment notifications
 */
export function MyTasksPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const taskId = searchParams.get('task')

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="flex items-center gap-3 p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Công việc của tôi</h1>
            <p className="text-sm text-muted-foreground">
              Danh sách công việc được giao
            </p>
          </div>
        </div>
      </div>

      {/* Task List */}
      <StaffTasksTab />
    </div>
  )
}

export default MyTasksPage
