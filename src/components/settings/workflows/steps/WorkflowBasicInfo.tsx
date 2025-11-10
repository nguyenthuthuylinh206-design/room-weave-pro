import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

interface WorkflowBasicInfoForm {
  name: string
  description: string
}

interface WorkflowBasicInfoProps {
  form: WorkflowBasicInfoForm
  onChange: (updates: Partial<WorkflowBasicInfoForm>) => void
}

export const WorkflowBasicInfo = ({ form, onChange }: WorkflowBasicInfoProps) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Give your workflow a clear name and description
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Auto-create Maintenance Request"
            className="mt-1.5"
          />
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={form.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="Automatically create maintenance requests for equipment below minimum stock"
            rows={3}
            className="mt-1.5"
          />
        </div>
      </div>
    </div>
  )
}
