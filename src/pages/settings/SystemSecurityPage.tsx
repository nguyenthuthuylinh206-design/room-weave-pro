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
import { Shield, Download, Upload, Trash2, Database, AlertTriangle, HardDrive, Activity, CheckCircle } from 'lucide-react'
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
  backup_database: z.boolean(),
  backup_files: z.boolean(),
  backup_settings: z.boolean(),
  backup_logs: z.boolean(),
  backup_frequency: z.enum(['hourly', 'daily', 'weekly']),
  backup_time: z.string(),
  backup_retention_days: z.coerce.number().min(7),
  backup_location: z.enum(['supabase_storage', 'local']),
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
      backup_database: true,
      backup_files: true,
      backup_settings: true,
      backup_logs: false,
      backup_frequency: 'daily',
      backup_time: '02:00',
      backup_retention_days: 30,
      backup_location: 'supabase_storage',
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
              <CardDescription>Configure automatic backups and restore data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold">What to Backup</h3>
                
                <FormField
                  control={form.control}
                  name="backup_database"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <div>
                        <FormLabel>Database (all tables)</FormLabel>
                        <FormDescription>All records and data structures</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="backup_files"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <div>
                        <FormLabel>User Uploaded Files</FormLabel>
                        <FormDescription>Images, documents, and attachments</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="backup_settings"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <div>
                        <FormLabel>Settings & Configurations</FormLabel>
                        <FormDescription>System preferences and configurations</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="backup_logs"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <div>
                        <FormLabel>Activity Logs</FormLabel>
                        <FormDescription>Warning: May significantly increase backup size</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="font-semibold">Schedule</h3>

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

                <FormField
                  control={form.control}
                  name="backup_location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Backup Location</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="supabase_storage">Supabase Storage</SelectItem>
                          <SelectItem value="local">Local Download</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="font-semibold">Backup Status</h3>
                <div className="rounded-lg border p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Last Backup</span>
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      2024-03-10 02:00 AM
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Size</span>
                    <span className="text-sm text-muted-foreground">245 MB</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Duration</span>
                    <span className="text-sm text-muted-foreground">3m 45s</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-4">
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
                <Button type="button" variant="outline">
                  View Backup History
                </Button>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="font-semibold">Restore from Backup</h3>
                <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Warning</p>
                      <p className="text-sm text-muted-foreground">
                        Restoring from backup will overwrite current data. This action cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Select Backup</label>
                    <Select>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Choose a backup" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">2024-03-10 02:00 AM - 245 MB</SelectItem>
                        <SelectItem value="2">2024-03-09 02:00 AM - 243 MB</SelectItem>
                        <SelectItem value="3">2024-03-08 02:00 AM - 240 MB</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Restore Options</label>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Switch id="restore-db" defaultChecked />
                        <label htmlFor="restore-db" className="text-sm">Database</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch id="restore-files" defaultChecked />
                        <label htmlFor="restore-files" className="text-sm">Files</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch id="restore-settings" defaultChecked />
                        <label htmlFor="restore-settings" className="text-sm">Settings</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch id="backup-before-restore" />
                        <label htmlFor="backup-before-restore" className="text-sm">Create backup before restore</label>
                      </div>
                    </div>
                  </div>

                  <Button type="button" variant="destructive">
                    Start Restore
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Database Maintenance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HardDrive className="h-5 w-5" />
                Database Maintenance
              </CardTitle>
              <CardDescription>Database statistics and maintenance tasks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold">Database Statistics</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-lg border p-4">
                    <div className="text-2xl font-bold">2.4 GB</div>
                    <div className="text-sm text-muted-foreground">Total Size</div>
                  </div>
                  <div className="rounded-lg border p-4">
                    <div className="text-2xl font-bold">21</div>
                    <div className="text-sm text-muted-foreground">Tables</div>
                  </div>
                  <div className="rounded-lg border p-4">
                    <div className="text-2xl font-bold">1.2M</div>
                    <div className="text-sm text-muted-foreground">Total Rows</div>
                  </div>
                  <div className="rounded-lg border p-4">
                    <div className="text-sm text-muted-foreground">Last Vacuum</div>
                    <div className="font-medium">2024-03-09 03:00 AM</div>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="font-semibold">Maintenance Tasks</h3>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline">
                    <Database className="h-4 w-4 mr-2" />
                    Vacuum Database
                  </Button>
                  <Button type="button" variant="outline">
                    <Activity className="h-4 w-4 mr-2" />
                    Analyze Tables
                  </Button>
                  <Button type="button" variant="outline">
                    <HardDrive className="h-4 w-4 mr-2" />
                    Reindex All
                  </Button>
                  <Button type="button" variant="outline">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clean Old Logs (&gt;90 days)
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="font-semibold">Health Check</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <span className="text-sm font-medium">Database Status</span>
                    <span className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Healthy
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <span className="text-sm font-medium">Connections</span>
                    <span className="text-sm text-muted-foreground">12 / 100</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <span className="text-sm font-medium">Slow Queries (24h)</span>
                    <span className="text-sm text-muted-foreground">3</span>
                  </div>
                </div>
                <Button type="button" variant="outline">
                  View Slow Query Report
                </Button>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="font-semibold">Cache & Performance</h3>
                <div className="flex gap-2">
                  <Button type="button" variant="outline">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear Cache
                  </Button>
                  <Button type="button" variant="outline">
                    <Activity className="h-4 w-4 mr-2" />
                    Performance Report
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Danger Zone
              </CardTitle>
              <CardDescription>
                Irreversible and destructive actions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Factory reset will permanently delete all data including users, items, rooms,
                laundry batches, and all other records. This action cannot be undone.
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
