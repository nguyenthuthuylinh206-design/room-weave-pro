import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Shield, Download, Upload, Trash2, Database, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
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
import { useState } from 'react'
import { useTenant } from '@/hooks/useTenant'
import { supabase } from '@/integrations/supabase/client'

const securitySchema = z.object({
  // Password Policy
  password_min_length: z.coerce.number().min(6).max(32),
  password_require_uppercase: z.boolean(),
  password_require_lowercase: z.boolean(),
  password_require_numbers: z.boolean(),
  password_require_special: z.boolean(),
  password_expiry_days: z.coerce.number().min(0),
  
  // Session
  session_timeout_minutes: z.coerce.number().min(5).max(480),
  force_logout_on_password_change: z.boolean(),
  
  // 2FA
  require_2fa_for_admins: z.boolean(),
  allow_2fa_for_all: z.boolean(),
  
  // Compliance
  enable_data_retention: z.boolean(),
  data_retention_days: z.coerce.number().min(30),
  enable_right_to_be_forgotten: z.boolean(),
  enable_user_data_export: z.boolean(),
  log_data_access: z.boolean(),
  log_data_modifications: z.boolean(),
  audit_retention_days: z.coerce.number().min(365),
  
  // Backup
  backup_frequency: z.enum(['hourly', 'daily', 'weekly']),
  backup_time: z.string(),
  backup_retention_days: z.coerce.number().min(7),
})

type SecuritySettings = z.infer<typeof securitySchema>

export default function SystemSecurityPage() {
  const { tenant } = useTenant()
  const [factoryResetDialog, setFactoryResetDialog] = useState(false)
  const [confirmText, setConfirmText] = useState('')

  const form = useForm<SecuritySettings>({
    resolver: zodResolver(securitySchema),
    defaultValues: {
      password_min_length: 8,
      password_require_uppercase: true,
      password_require_lowercase: true,
      password_require_numbers: true,
      password_require_special: true,
      password_expiry_days: 90,
      session_timeout_minutes: 60,
      force_logout_on_password_change: true,
      require_2fa_for_admins: false,
      allow_2fa_for_all: true,
      enable_data_retention: true,
      data_retention_days: 365,
      enable_right_to_be_forgotten: true,
      enable_user_data_export: true,
      log_data_access: true,
      log_data_modifications: true,
      audit_retention_days: 730,
      backup_frequency: 'daily',
      backup_time: '02:00',
      backup_retention_days: 30,
    },
  })

  const onSubmit = async (data: SecuritySettings) => {
    try {
      // Save to tenant settings
      const { error } = await supabase
        .from('tenants')
        .update({
          settings: {
            ...((tenant?.settings as Record<string, any>) || {}),
            security: data,
          },
        })
        .eq('id', tenant?.id)

      if (error) throw error
      toast.success('Security settings saved successfully')
    } catch (error) {
      toast.error('Failed to save settings')
    }
  }

  const handleBackupNow = async () => {
    toast.info('Backup process started...')
    // Implementation would trigger backup edge function
  }

  const handleFactoryReset = async () => {
    if (confirmText !== 'DELETE ALL DATA') {
      toast.error('Please type "DELETE ALL DATA" to confirm')
      return
    }
    
    toast.error('Factory reset is disabled in production')
    setFactoryResetDialog(false)
    setConfirmText('')
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">System & Security</h2>
        <p className="text-muted-foreground">
          Configure security policies, backups, and compliance settings
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Security Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Password Policy */}
              <div className="space-y-4">
                <h3 className="font-semibold">Password Policy</h3>
                
                <FormField
                  control={form.control}
                  name="password_min_length"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minimum Length</FormLabel>
                      <FormControl>
                        <Input type="number" min="6" max="32" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password_require_uppercase"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <FormLabel>Require Uppercase Letters</FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password_require_lowercase"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <FormLabel>Require Lowercase Letters</FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password_require_numbers"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <FormLabel>Require Numbers</FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password_require_special"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <FormLabel>Require Special Characters</FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password_expiry_days"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password Expiry (days)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormDescription>0 = never expires</FormDescription>
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              {/* Session Settings */}
              <div className="space-y-4">
                <h3 className="font-semibold">Session Settings</h3>
                
                <FormField
                  control={form.control}
                  name="session_timeout_minutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Session Timeout (minutes)</FormLabel>
                      <FormControl>
                        <Input type="number" min="5" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="force_logout_on_password_change"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <FormLabel>Force Logout on Password Change</FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              {/* Two-Factor Authentication */}
              <div className="space-y-4">
                <h3 className="font-semibold">Two-Factor Authentication</h3>
                
                <FormField
                  control={form.control}
                  name="require_2fa_for_admins"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <FormLabel>Require 2FA for Admins</FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="allow_2fa_for_all"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <FormLabel>Allow 2FA for All Users</FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Data Privacy & Compliance */}
          <Card>
            <CardHeader>
              <CardTitle>Data Privacy & Compliance</CardTitle>
              <CardDescription>GDPR compliance and data retention policies</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="enable_data_retention"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <FormLabel>Enable Data Retention Policy</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="data_retention_days"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Retention Period (days)</FormLabel>
                    <FormControl>
                      <Input type="number" min="30" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="enable_right_to_be_forgotten"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <FormLabel>Enable Right to Be Forgotten</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="enable_user_data_export"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <FormLabel>Enable Data Export for Users</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <Separator />

              <h3 className="font-semibold">Audit Trail</h3>

              <FormField
                control={form.control}
                name="log_data_access"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <FormLabel>Log All Data Access</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="log_data_modifications"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <FormLabel>Log All Modifications</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="audit_retention_days"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Audit Log Retention (days)</FormLabel>
                    <FormControl>
                      <Input type="number" min="365" {...field} />
                    </FormControl>
                    <FormDescription>Minimum 365 days (1 year)</FormDescription>
                  </FormItem>
                )}
              />

              <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline">
                  View Privacy Policy
                </Button>
                <Button type="button" variant="outline">
                  Export Audit Logs
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Backup & Restore */}
          <Card>
            <CardHeader>
              <CardTitle>Backup & Restore</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <h3 className="font-semibold">Automatic Backups</h3>

              <FormField
                control={form.control}
                name="backup_frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frequency</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="hourly">Hourly</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="backup_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Backup Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="backup_retention_days"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Retention (days)</FormLabel>
                    <FormControl>
                      <Input type="number" min="7" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline" onClick={handleBackupNow}>
                  <Download className="h-4 w-4 mr-2" />
                  Backup Now
                </Button>
                <Button type="button" variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Download Latest
                </Button>
                <Button type="button" variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Backup
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Data Management */}
          <Card>
            <CardHeader>
              <CardTitle>Data Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button type="button" variant="outline">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear Cache
                </Button>
                <Button type="button" variant="outline">
                  <Database className="h-4 w-4 mr-2" />
                  Database Statistics
                </Button>
              </div>

              <Separator />

              <div className="space-y-2">
                <h3 className="font-semibold text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Danger Zone
                </h3>
                <p className="text-sm text-muted-foreground">
                  Factory reset will permanently delete all data. This action cannot be undone.
                </p>
                <AlertDialog open={factoryResetDialog} onOpenChange={setFactoryResetDialog}>
                  <AlertDialogTrigger asChild>
                    <Button type="button" variant="destructive">
                      Factory Reset
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Factory Reset - Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription className="space-y-4">
                        <p>
                          This will permanently delete ALL data including users, items, rooms,
                          laundry batches, and all other records. This action cannot be undone.
                        </p>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">
                            Type "DELETE ALL DATA" to confirm:
                          </label>
                          <Input
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            placeholder="DELETE ALL DATA"
                          />
                        </div>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleFactoryReset}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        disabled={confirmText !== 'DELETE ALL DATA'}
                      >
                        Delete Everything
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline">
              Cancel
            </Button>
            <Button type="submit">Save Settings</Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
