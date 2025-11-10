import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'

interface SendNotificationActionProps {
  config: any
  onChange: (config: any) => void
  type: 'notification' | 'email'
}

export const SendNotificationAction = ({ config, onChange, type }: SendNotificationActionProps) => {
  const [localConfig, setLocalConfig] = useState({
    notification_type: config.notification_type || 'both',
    subject: config.subject || 'Low Stock Alert: {{item_name}}',
    body: config.body || 'Dear {{recipient_name}},\n\nItem {{item_name}} is running low.\nCurrent quantity: {{current_qty}}\nPlease restock soon.',
    recipient_mode: config.recipient_mode || 'role',
    recipient_users: config.recipient_users || [],
    recipient_roles: config.recipient_roles || ['manager'],
    include_link: config.include_link ?? true,
    mark_urgent: config.mark_urgent ?? false,
  })

  const handleChange = (field: string, value: any) => {
    const newConfig = { ...localConfig, [field]: value }
    setLocalConfig(newConfig)
    onChange(newConfig)
  }

  return (
    <div className="space-y-6">
      <div>
        <Label>Notification Type *</Label>
        <RadioGroup
          value={localConfig.notification_type}
          onValueChange={(value) => handleChange('notification_type', value)}
          className="mt-2 space-y-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="notification" id="notif-app" />
            <Label htmlFor="notif-app" className="font-normal">
              In-App Notification
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="email" id="notif-email" />
            <Label htmlFor="notif-email" className="font-normal">
              Email
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="both" id="notif-both" />
            <Label htmlFor="notif-both" className="font-normal">
              Both
            </Label>
          </div>
        </RadioGroup>
      </div>

      {(localConfig.notification_type === 'email' || localConfig.notification_type === 'both') && (
        <>
          <div>
            <Label htmlFor="subject">Subject *</Label>
            <Input
              id="subject"
              value={localConfig.subject}
              onChange={(e) => handleChange('subject', e.target.value)}
              placeholder="Low Stock Alert: {{item_name}}"
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="body">Body *</Label>
            <Textarea
              id="body"
              value={localConfig.body}
              onChange={(e) => handleChange('body', e.target.value)}
              rows={6}
              className="mt-1.5"
            />
          </div>
        </>
      )}

      <div>
        <Label>Recipients *</Label>
        <RadioGroup
          value={localConfig.recipient_mode}
          onValueChange={(value) => handleChange('recipient_mode', value)}
          className="mt-2 space-y-3"
        >
          <div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="role" id="recip-role" />
              <Label htmlFor="recip-role" className="font-normal">
                By role
              </Label>
            </div>
            {localConfig.recipient_mode === 'role' && (
              <div className="ml-6 mt-3 space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox id="role-manager" defaultChecked />
                  <Label htmlFor="role-manager" className="font-normal">
                    Managers
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="role-inventory" />
                  <Label htmlFor="role-inventory" className="font-normal">
                    Inventory Staff
                  </Label>
                </div>
              </div>
            )}
          </div>
        </RadioGroup>
      </div>

      <div className="space-y-3">
        <Label>Additional Options</Label>
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="include-link"
              checked={localConfig.include_link}
              onCheckedChange={(checked) => handleChange('include_link', checked)}
            />
            <Label htmlFor="include-link" className="font-normal">
              Include direct link to item
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="mark-urgent"
              checked={localConfig.mark_urgent}
              onCheckedChange={(checked) => handleChange('mark_urgent', checked)}
            />
            <Label htmlFor="mark-urgent" className="font-normal">
              Mark as urgent
            </Label>
          </div>
        </div>
      </div>
    </div>
  )
}
