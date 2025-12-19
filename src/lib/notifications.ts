import { supabase } from '@/integrations/supabase/client'

interface SendNotificationByRoleParams {
  tenantId: string
  role: string
  title: string
  body: string
  type?: 'info' | 'success' | 'warning' | 'error'
  actionUrl?: string
  metadata?: Record<string, any>
}

interface SendNotificationToUserParams {
  tenantId: string
  userId: string
  title: string
  body: string
  type?: 'info' | 'success' | 'warning' | 'error'
  actionUrl?: string
  metadata?: Record<string, any>
}

/**
 * Send notification to all users with a specific role in the tenant
 */
export async function sendNotificationByRole({
  tenantId,
  role,
  title,
  body,
  type = 'info',
  actionUrl,
  metadata,
}: SendNotificationByRoleParams): Promise<void> {
  try {
    // Find all users with the specified role in this tenant
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('role', role)
      .eq('status', 'active')
    
    if (usersError) {
      console.error('Error fetching users for notification:', usersError)
      return
    }
    
    if (!users || users.length === 0) {
      console.log(`No active users found with role: ${role}`)
      return
    }
    
    // Create notifications for all matching users
    const notifications = users.map(user => ({
      tenant_id: tenantId,
      user_id: user.id,
      title,
      body,
      type,
      action_url: actionUrl,
      metadata: metadata || {},
      is_read: false,
    }))
    
    const { error: insertError } = await supabase
      .from('in_app_notifications')
      .insert(notifications)
    
    if (insertError) {
      console.error('Error inserting notifications:', insertError)
    }
  } catch (error) {
    console.error('Error sending notification by role:', error)
  }
}

/**
 * Send notification to a specific user
 */
export async function sendNotificationToUser({
  tenantId,
  userId,
  title,
  body,
  type = 'info',
  actionUrl,
  metadata,
}: SendNotificationToUserParams): Promise<void> {
  try {
    const { error } = await supabase
      .from('in_app_notifications')
      .insert({
        tenant_id: tenantId,
        user_id: userId,
        title,
        body,
        type,
        action_url: actionUrl,
        metadata: metadata || {},
        is_read: false,
      })
    
    if (error) {
      console.error('Error inserting notification:', error)
    }
  } catch (error) {
    console.error('Error sending notification to user:', error)
  }
}
