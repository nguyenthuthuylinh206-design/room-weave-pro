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
    // Query from user_roles table with join to users for tenant and status check
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select(`
        user_id,
        users!inner(id, tenant_id, status)
      `)
      .eq('role', role as any)
    
    if (rolesError) {
      console.error('Error fetching users for notification:', rolesError)
      return
    }
    
    // Filter by tenant and active status
    const activeUsers = userRoles?.filter(ur => {
      const user = ur.users as any
      return user?.tenant_id === tenantId && user?.status === 'active'
    }) || []
    
    if (activeUsers.length === 0) {
      console.log(`No active users found with role: ${role} in tenant ${tenantId}`)
      return
    }
    
    // Create notifications for all matching users
    const notifications = activeUsers.map(ur => ({
      tenant_id: tenantId,
      user_id: ur.user_id,
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
    } else {
      console.log(`Successfully sent ${notifications.length} notifications to ${role}`)
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
