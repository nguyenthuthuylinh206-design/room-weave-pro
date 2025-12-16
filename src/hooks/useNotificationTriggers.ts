import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';

export type NotificationType = 
  | 'low_stock'
  | 'critical_stock'
  | 'laundry_completed'
  | 'maintenance_new'
  | 'maintenance_overdue'
  | 'po_approved'
  | 'task_assigned'
  | 'approval_request'
  | 'info'
  | 'warning'
  | 'success'
  | 'error';

interface CreateNotificationParams {
  userId: string;
  tenantId: string;
  title: string;
  body: string;
  type?: NotificationType;
  actionUrl?: string;
  icon?: string;
  metadata?: Json;
}

export async function createInAppNotification({
  userId,
  tenantId,
  title,
  body,
  type = 'info',
  actionUrl,
  icon,
  metadata,
}: CreateNotificationParams): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('in_app_notifications')
      .insert([{
        user_id: userId,
        tenant_id: tenantId,
        title,
        body,
        type,
        action_url: actionUrl,
        icon,
        metadata: metadata ?? null,
      }])
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
}

export async function sendPushNotification({
  userId,
  tenantId,
  title,
  body,
  actionUrl,
  tag,
}: {
  userId: string;
  tenantId: string;
  title: string;
  body: string;
  actionUrl?: string;
  tag?: string;
}): Promise<boolean> {
  try {
    const { error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        user_id: userId,
        tenant_id: tenantId,
        title,
        body,
        data: { url: actionUrl || '/' },
        tag,
      },
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error sending push notification:', error);
    return false;
  }
}

// Trigger for low stock alert
export async function triggerLowStockAlert(
  userId: string,
  tenantId: string,
  itemName: string,
  currentStock: number,
  minimumStock: number,
  itemId: string
) {
  const title = 'Cảnh báo tồn kho thấp';
  const body = `${itemName} chỉ còn ${currentStock}/${minimumStock} đơn vị`;
  const actionUrl = `/items/${itemId}`;
  
  // Create in-app notification
  await createInAppNotification({
    userId,
    tenantId,
    title,
    body,
    type: currentStock <= 5 ? 'critical_stock' : 'low_stock',
    actionUrl,
    icon: 'alert-triangle',
    metadata: { itemId, currentStock, minimumStock } as Json,
  });

  // Send push notification
  await sendPushNotification({
    userId,
    tenantId,
    title,
    body,
    actionUrl,
    tag: `low-stock-${itemId}`,
  });
}

// Trigger for maintenance request
export async function triggerMaintenanceNotification(
  userId: string,
  tenantId: string,
  requestCode: string,
  title: string,
  location: string,
  requestId: string
) {
  const notifTitle = 'Yêu cầu bảo trì mới';
  const body = `${requestCode}: ${title} tại ${location}`;
  const actionUrl = `/maintenance/${requestId}`;
  
  await createInAppNotification({
    userId,
    tenantId,
    title: notifTitle,
    body,
    type: 'maintenance_new',
    actionUrl,
    icon: 'wrench',
    metadata: { requestId, requestCode } as Json,
  });

  await sendPushNotification({
    userId,
    tenantId,
    title: notifTitle,
    body,
    actionUrl,
    tag: `maintenance-${requestId}`,
  });
}

// Trigger for laundry batch completed
export async function triggerLaundryCompletedNotification(
  userId: string,
  tenantId: string,
  batchCode: string,
  totalItems: number,
  batchId: string
) {
  const title = 'Đồ giặt đã hoàn thành';
  const body = `Lô ${batchCode} với ${totalItems} món đã sẵn sàng nhận`;
  const actionUrl = `/laundry/${batchId}`;
  
  await createInAppNotification({
    userId,
    tenantId,
    title,
    body,
    type: 'laundry_completed',
    actionUrl,
    icon: 'shirt',
    metadata: { batchId, batchCode, totalItems } as Json,
  });

  await sendPushNotification({
    userId,
    tenantId,
    title,
    body,
    actionUrl,
    tag: `laundry-${batchId}`,
  });
}

// Trigger for PO approved
export async function triggerPOApprovedNotification(
  userId: string,
  tenantId: string,
  poCode: string,
  poId: string
) {
  const title = 'Đơn đặt hàng được duyệt';
  const body = `Đơn hàng ${poCode} đã được phê duyệt`;
  const actionUrl = `/purchase-orders/${poId}`;
  
  await createInAppNotification({
    userId,
    tenantId,
    title,
    body,
    type: 'po_approved',
    actionUrl,
    icon: 'check-circle',
    metadata: { poId, poCode } as Json,
  });

  await sendPushNotification({
    userId,
    tenantId,
    title,
    body,
    actionUrl,
    tag: `po-${poId}`,
  });
}

// Generic notification trigger
export async function triggerNotification(
  userId: string,
  tenantId: string,
  title: string,
  body: string,
  type: NotificationType = 'info',
  actionUrl?: string,
  sendPush: boolean = true
) {
  await createInAppNotification({
    userId,
    tenantId,
    title,
    body,
    type,
    actionUrl,
  });

  if (sendPush) {
    await sendPushNotification({
      userId,
      tenantId,
      title,
      body,
      actionUrl,
    });
  }
}
