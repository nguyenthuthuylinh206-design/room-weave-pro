import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';
import { 
  getNotificationRecipients, 
  getUserById, 
  getUserReportsTo,
  RecipientRole 
} from '@/utils/notificationRecipients';

export type NotificationType = 
  | 'low_stock'
  | 'critical_stock'
  | 'laundry_completed'
  | 'maintenance_new'
  | 'maintenance_completed'
  | 'maintenance_overdue'
  | 'po_approved'
  | 'po_pending_approval'
  | 'task_assigned'
  | 'room_check_completed'
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

// Create a single in-app notification
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

// Create notifications for multiple recipients
export async function createMultipleNotifications({
  recipientIds,
  tenantId,
  title,
  body,
  type = 'info',
  actionUrl,
  icon,
  metadata,
}: {
  recipientIds: string[];
  tenantId: string;
  title: string;
  body: string;
  type?: NotificationType;
  actionUrl?: string;
  icon?: string;
  metadata?: Json;
}): Promise<number> {
  if (recipientIds.length === 0) return 0;

  try {
    const notifications = recipientIds.map(userId => ({
      user_id: userId,
      tenant_id: tenantId,
      title,
      body,
      type,
      action_url: actionUrl,
      icon,
      metadata: metadata ?? null,
    }));

    const { data, error } = await supabase
      .from('in_app_notifications')
      .insert(notifications)
      .select('id');

    if (error) throw error;
    return data?.length || 0;
  } catch (error) {
    console.error('Error creating multiple notifications:', error);
    return 0;
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

// Send push notifications to multiple users
export async function sendMultiplePushNotifications({
  recipientIds,
  tenantId,
  title,
  body,
  actionUrl,
  tag,
}: {
  recipientIds: string[];
  tenantId: string;
  title: string;
  body: string;
  actionUrl?: string;
  tag?: string;
}): Promise<number> {
  let successCount = 0;
  
  for (const userId of recipientIds) {
    const success = await sendPushNotification({
      userId,
      tenantId,
      title,
      body,
      actionUrl,
      tag,
    });
    if (success) successCount++;
  }
  
  return successCount;
}

// ==================== ROLE-BASED TRIGGERS ====================

// Trigger for low stock alert - sends to managers and owner
export async function triggerLowStockAlert({
  tenantId,
  hotelId,
  itemName,
  currentStock,
  minimumStock,
  itemId,
  triggeredByUserId,
}: {
  tenantId: string;
  hotelId: string;
  itemName: string;
  currentStock: number;
  minimumStock: number;
  itemId: string;
  triggeredByUserId?: string;
}) {
  const title = 'Cảnh báo tồn kho thấp';
  const body = `${itemName} chỉ còn ${currentStock}/${minimumStock} đơn vị`;
  const actionUrl = `/items/${itemId}`;
  const type: NotificationType = currentStock <= 5 ? 'critical_stock' : 'low_stock';

  // Get managers and owner
  const recipients = await getNotificationRecipients({
    tenantId,
    hotelId,
    targetRoles: ['manager', 'owner'],
    excludeUserId: triggeredByUserId,
  });

  const recipientIds = recipients.map(r => r.id);

  await createMultipleNotifications({
    recipientIds,
    tenantId,
    title,
    body,
    type,
    actionUrl,
    icon: 'alert-triangle',
    metadata: { itemId, currentStock, minimumStock, hotelId } as Json,
  });

  await sendMultiplePushNotifications({
    recipientIds,
    tenantId,
    title,
    body,
    actionUrl,
    tag: `low-stock-${itemId}`,
  });
}

// Trigger for new maintenance request - sends to managers
export async function triggerMaintenanceNewNotification({
  tenantId,
  hotelId,
  requestCode,
  title,
  location,
  requestId,
  createdByUserId,
}: {
  tenantId: string;
  hotelId: string;
  requestCode: string;
  title: string;
  location: string;
  requestId: string;
  createdByUserId: string;
}) {
  const notifTitle = 'Yêu cầu bảo trì mới';
  const body = `${requestCode}: ${title} tại ${location}`;
  const actionUrl = `/maintenance/${requestId}`;

  // Get managers of the hotel
  const recipients = await getNotificationRecipients({
    tenantId,
    hotelId,
    targetRoles: ['manager', 'owner'],
    excludeUserId: createdByUserId,
  });

  const recipientIds = recipients.map(r => r.id);

  await createMultipleNotifications({
    recipientIds,
    tenantId,
    title: notifTitle,
    body,
    type: 'maintenance_new',
    actionUrl,
    icon: 'wrench',
    metadata: { requestId, requestCode, hotelId, createdBy: createdByUserId } as Json,
  });

  await sendMultiplePushNotifications({
    recipientIds,
    tenantId,
    title: notifTitle,
    body,
    actionUrl,
    tag: `maintenance-${requestId}`,
  });
}

// Trigger for maintenance completed - sends to original reporter
export async function triggerMaintenanceCompletedNotification({
  tenantId,
  requestCode,
  title,
  requestId,
  reportedByUserId,
  completedByUserId,
}: {
  tenantId: string;
  requestCode: string;
  title: string;
  requestId: string;
  reportedByUserId: string;
  completedByUserId: string;
}) {
  if (reportedByUserId === completedByUserId) return; // Don't notify yourself

  const notifTitle = 'Yêu cầu bảo trì đã hoàn thành';
  const body = `${requestCode}: ${title} đã được xử lý xong`;
  const actionUrl = `/maintenance/${requestId}`;

  await createInAppNotification({
    userId: reportedByUserId,
    tenantId,
    title: notifTitle,
    body,
    type: 'maintenance_completed',
    actionUrl,
    icon: 'check-circle',
    metadata: { requestId, requestCode, completedBy: completedByUserId } as Json,
  });

  await sendPushNotification({
    userId: reportedByUserId,
    tenantId,
    title: notifTitle,
    body,
    actionUrl,
    tag: `maintenance-complete-${requestId}`,
  });
}

// Trigger for laundry batch completed - sends to hotel staff
export async function triggerLaundryCompletedNotification({
  tenantId,
  hotelId,
  batchCode,
  totalItems,
  batchId,
  completedByUserId,
}: {
  tenantId: string;
  hotelId: string;
  batchCode: string;
  totalItems: number;
  batchId: string;
  completedByUserId?: string;
}) {
  const title = 'Đồ giặt đã hoàn thành';
  const body = `Lô ${batchCode} với ${totalItems} món đã sẵn sàng nhận`;
  const actionUrl = `/laundry/${batchId}`;

  // Notify managers and housekeeping staff
  const recipients = await getNotificationRecipients({
    tenantId,
    hotelId,
    targetRoles: ['manager'],
    excludeUserId: completedByUserId,
  });

  const recipientIds = recipients.map(r => r.id);

  await createMultipleNotifications({
    recipientIds,
    tenantId,
    title,
    body,
    type: 'laundry_completed',
    actionUrl,
    icon: 'shirt',
    metadata: { batchId, batchCode, totalItems, hotelId } as Json,
  });

  await sendMultiplePushNotifications({
    recipientIds,
    tenantId,
    title,
    body,
    actionUrl,
    tag: `laundry-${batchId}`,
  });
}

// Trigger for PO pending approval - sends to approvers (managers/owner)
export async function triggerPOPendingApprovalNotification({
  tenantId,
  hotelId,
  poCode,
  poId,
  createdByUserId,
}: {
  tenantId: string;
  hotelId?: string;
  poCode: string;
  poId: string;
  createdByUserId: string;
}) {
  const title = 'Đơn đặt hàng chờ duyệt';
  const body = `Đơn hàng ${poCode} cần được phê duyệt`;
  const actionUrl = `/purchase-orders/${poId}`;

  const recipients = await getNotificationRecipients({
    tenantId,
    hotelId,
    targetRoles: ['manager', 'owner'],
    excludeUserId: createdByUserId,
  });

  const recipientIds = recipients.map(r => r.id);

  await createMultipleNotifications({
    recipientIds,
    tenantId,
    title,
    body,
    type: 'po_pending_approval',
    actionUrl,
    icon: 'file-text',
    metadata: { poId, poCode, createdBy: createdByUserId } as Json,
  });

  await sendMultiplePushNotifications({
    recipientIds,
    tenantId,
    title,
    body,
    actionUrl,
    tag: `po-pending-${poId}`,
  });
}

// Trigger for PO approved - sends to creator
export async function triggerPOApprovedNotification({
  tenantId,
  poCode,
  poId,
  createdByUserId,
  approvedByUserId,
}: {
  tenantId: string;
  poCode: string;
  poId: string;
  createdByUserId: string;
  approvedByUserId: string;
}) {
  if (createdByUserId === approvedByUserId) return;

  const title = 'Đơn đặt hàng được duyệt';
  const body = `Đơn hàng ${poCode} đã được phê duyệt`;
  const actionUrl = `/purchase-orders/${poId}`;

  await createInAppNotification({
    userId: createdByUserId,
    tenantId,
    title,
    body,
    type: 'po_approved',
    actionUrl,
    icon: 'check-circle',
    metadata: { poId, poCode, approvedBy: approvedByUserId } as Json,
  });

  await sendPushNotification({
    userId: createdByUserId,
    tenantId,
    title,
    body,
    actionUrl,
    tag: `po-${poId}`,
  });
}

// Trigger for task assigned - sends to assigned user
export async function triggerTaskAssignedNotification({
  tenantId,
  assignedToUserId,
  assignedByUserId,
  taskType,
  taskTitle,
  taskId,
  actionUrl,
}: {
  tenantId: string;
  assignedToUserId: string;
  assignedByUserId: string;
  taskType: 'maintenance' | 'room_check' | 'laundry' | 'distribution';
  taskTitle: string;
  taskId: string;
  actionUrl: string;
}) {
  if (assignedToUserId === assignedByUserId) return;

  const assigner = await getUserById(assignedByUserId);
  const taskTypeLabels: Record<string, string> = {
    maintenance: 'Bảo trì',
    room_check: 'Kiểm tra phòng',
    laundry: 'Giặt là',
    distribution: 'Phân phối',
  };

  const title = 'Bạn được phân công công việc mới';
  const body = `${taskTypeLabels[taskType]}: ${taskTitle} - Phân công bởi ${assigner?.full_name || 'Quản lý'}`;

  await createInAppNotification({
    userId: assignedToUserId,
    tenantId,
    title,
    body,
    type: 'task_assigned',
    actionUrl,
    icon: 'user-check',
    metadata: { taskId, taskType, assignedBy: assignedByUserId } as Json,
  });

  await sendPushNotification({
    userId: assignedToUserId,
    tenantId,
    title,
    body,
    actionUrl,
    tag: `task-${taskType}-${taskId}`,
  });
}

// Trigger for room check completed - sends to managers
export async function triggerRoomCheckCompletedNotification({
  tenantId,
  hotelId,
  roomNumber,
  checkId,
  completedByUserId,
  hasIssues,
}: {
  tenantId: string;
  hotelId: string;
  roomNumber: string;
  checkId: string;
  completedByUserId: string;
  hasIssues: boolean;
}) {
  const checker = await getUserById(completedByUserId);
  const title = hasIssues ? 'Kiểm tra phòng có vấn đề' : 'Kiểm tra phòng hoàn thành';
  const body = `Phòng ${roomNumber} đã được kiểm tra bởi ${checker?.full_name || 'Nhân viên'}${hasIssues ? ' - Có vấn đề cần xử lý' : ''}`;
  const actionUrl = `/room-checks/${checkId}`;

  const recipients = await getNotificationRecipients({
    tenantId,
    hotelId,
    targetRoles: ['manager'],
    excludeUserId: completedByUserId,
  });

  const recipientIds = recipients.map(r => r.id);

  await createMultipleNotifications({
    recipientIds,
    tenantId,
    title,
    body,
    type: 'room_check_completed',
    actionUrl,
    icon: hasIssues ? 'alert-circle' : 'check-circle',
    metadata: { checkId, roomNumber, hotelId, completedBy: completedByUserId, hasIssues } as Json,
  });

  await sendMultiplePushNotifications({
    recipientIds,
    tenantId,
    title,
    body,
    actionUrl,
    tag: `room-check-${checkId}`,
  });
}

// Generic notification trigger (legacy support)
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

// ==================== LEGACY FUNCTIONS (for backward compatibility) ====================

export async function triggerLowStockAlertLegacy(
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

  await sendPushNotification({
    userId,
    tenantId,
    title,
    body,
    actionUrl,
    tag: `low-stock-${itemId}`,
  });
}

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

export async function triggerLaundryCompletedNotificationLegacy(
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

export async function triggerPOApprovedNotificationLegacy(
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
