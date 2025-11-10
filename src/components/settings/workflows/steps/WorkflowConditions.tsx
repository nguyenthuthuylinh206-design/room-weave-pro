import { Button } from '@/components/ui/button'
import { Plus, X } from 'lucide-react'
import { WorkflowCondition } from '@/hooks/useWorkflows'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

interface WorkflowConditionsProps {
  conditions: WorkflowCondition[]
  onChange: (conditions: WorkflowCondition[]) => void
  triggerType: string
  triggerEvent?: string
}

const OPERATORS = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not Equals' },
  { value: 'greater_than', label: 'Greater Than' },
  { value: 'less_than', label: 'Less Than' },
  { value: 'contains', label: 'Contains' },
  { value: 'in', label: 'In' },
]

export const WorkflowConditions = ({ 
  conditions, 
  onChange,
  triggerType,
  triggerEvent
}: WorkflowConditionsProps) => {
  const addCondition = () => {
    onChange([
      ...conditions,
      { field: '', operator: 'equals', value: '' }
    ])
  }

  const removeCondition = (index: number) => {
    onChange(conditions.filter((_, i) => i !== index))
  }

  const updateCondition = (index: number, updates: Partial<WorkflowCondition>) => {
    onChange(
      conditions.map((condition, i) =>
        i === index ? { ...condition, ...updates } : condition
      )
    )
  }

  const getAvailableFields = () => {
    if (triggerEvent?.startsWith('inventory.')) {
      return [
        { value: 'category', label: 'Category' },
        { value: 'quantity', label: 'Quantity' },
        { value: 'min_stock', label: 'Minimum Stock' },
        { value: 'hotel_id', label: 'Hotel' },
      ]
    }
    return []
  }

  const fields = getAvailableFields()

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Add conditions (optional)</h3>
        <p className="text-sm text-muted-foreground">
          Run this workflow only when these conditions are met
        </p>
      </div>

      <div className="space-y-4">
        {conditions.map((condition, index) => (
          <div key={index} className="border rounded-lg p-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Field</Label>
                <Select
                  value={condition.field}
                  onValueChange={(value) => updateCondition(index, { field: value })}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select field" />
                  </SelectTrigger>
                  <SelectContent>
                    {fields.map((field) => (
                      <SelectItem key={field.value} value={field.value}>
                        {field.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Operator</Label>
                <Select
                  value={condition.operator}
                  onValueChange={(value: any) => updateCondition(index, { operator: value })}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OPERATORS.map((op) => (
                      <SelectItem key={op.value} value={op.value}>
                        {op.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Value</Label>
                <div className="flex gap-2 mt-1.5">
                  <Input
                    value={condition.value}
                    onChange={(e) => updateCondition(index, { value: e.target.value })}
                    placeholder="Value"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeCondition(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}

        <Button variant="outline" onClick={addCondition}>
          <Plus className="h-4 w-4 mr-2" />
          Add Condition
        </Button>

        {conditions.length > 1 && (
          <div className="mt-4">
            <Label>Match</Label>
            <RadioGroup defaultValue="all" className="flex gap-4 mt-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="match-all" />
                <Label htmlFor="match-all" className="font-normal">
                  All conditions
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="any" id="match-any" />
                <Label htmlFor="match-any" className="font-normal">
                  Any condition
                </Label>
              </div>
            </RadioGroup>
          </div>
        )}
      </div>
    </div>
  )
}
