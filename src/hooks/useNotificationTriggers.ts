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

// Create a single in-app notification using RPC to bypass RLS
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
    // Use RPC function to bypass RLS while maintaining tenant security
    const { data, error } = await supabase.rpc('create_notification_for_user', {
      p_user_id: userId,
      p_tenant_id: tenantId,
      p_title: title,
      p_body: body,
      p_type: type,
      p_action_url: actionUrl ?? null,
      p_icon: icon ?? null,
      p_metadata: metadata ?? null,
    });

    if (error) throw error;
    return data as string;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
}

// Create notifications for multiple recipients using RPC
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

  let successCount = 0;
  
  // Create notifications one by one using RPC function
  for (const userId of recipientIds) {
    try {
      const { error } = await supabase.rpc('create_notification_for_user', {
        p_user_id: userId,
        p_tenant_id: tenantId,
        p_title: title,
        p_body: body,
        p_type: type,
        p_action_url: actionUrl ?? null,
        p_icon: icon ?? null,
        p_metadata: metadata ?? null,
      });

      if (!error) successCount++;
    } catch (error) {
      console.error(`Error creating notification for user ${userId}:`, error);
    }
  }

  return successCount;
}

export async function sendPushNotification({
  userId,
  tenantId,
  title,
  body,
  actionUrl,
  tag,
  notificationType,
  icon,
  image,
}: {
  userId: string;
  tenantId: string;
  title: string;
  body: string;
  actionUrl?: string;
  tag?: string;
  notificationType?: NotificationType;
  icon?: string;
  image?: string;
}): Promise<boolean> {
  try {
    const { error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        user_id: userId,
        tenant_id: tenantId,
        title,
        body,
        icon,
        image,
        notification_type: notificationType,
        data: { url: actionUrl || '/', type: notificationType },
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
  notificationType,
  icon,
  image,
}: {
  recipientIds: string[];
  tenantId: string;
  title: string;
  body: string;
  actionUrl?: string;
  tag?: string;
  notificationType?: NotificationType;
  icon?: string;
  image?: string;
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
      notificationType,
      icon,
      image,
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
    notificationType: type,
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
    notificationType: 'maintenance_new',
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
    notificationType: 'maintenance_completed',
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
    notificationType: 'laundry_completed',
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
    notificationType: 'po_pending_approval',
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
    notificationType: 'po_approved',
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
    notificationType: 'task_assigned',
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
    notificationType: 'room_check_completed',
  });
}

// ==================== DISTRIBUTION ORDER TRIGGERS ====================

// Trigger when distribution order is created - notify assigned staff
export async function triggerDistributionOrderCreated({
  tenantId,
  hotelId,
  orderId,
  orderCode,
  assignedToUserId,
  createdByUserId,
  totalRooms,
  totalItems,
}: {
  tenantId: string;
  hotelId: string;
  orderId: string;
  orderCode: string;
  assignedToUserId: string | null;
  createdByUserId: string;
  totalRooms: number;
  totalItems: number;
}) {
  if (!assignedToUserId || assignedToUserId === createdByUserId) return;

  const creator = await getUserById(createdByUserId);
  const title = 'Phiếu giao hàng mới';
  const body = `${orderCode}: ${totalRooms} phòng, ${totalItems} sản phẩm - Phân công bởi ${creator?.full_name || 'Quản lý'}`;
  const actionUrl = `/inventory/distribution/${orderId}`;

  await createInAppNotification({
    userId: assignedToUserId,
    tenantId,
    title,
    body,
    type: 'task_assigned',
    actionUrl,
    icon: 'truck',
    metadata: { orderId, orderCode, totalRooms, totalItems, createdBy: createdByUserId } as Json,
  });

  await sendPushNotification({
    userId: assignedToUserId,
    tenantId,
    title,
    body,
    actionUrl,
    tag: `distribution-${orderId}`,
    notificationType: 'task_assigned',
  });
}

// Trigger when delivery is confirmed - notify order creator
export async function triggerDistributionDeliveryConfirmed({
  tenantId,
  orderId,
  orderCode,
  roomNumber,
  createdByUserId,
  confirmedByUserId,
  allCompleted,
}: {
  tenantId: string;
  orderId: string;
  orderCode: string;
  roomNumber: string;
  createdByUserId: string;
  confirmedByUserId: string;
  allCompleted: boolean;
}) {
  if (createdByUserId === confirmedByUserId) return;

  const confirmer = await getUserById(confirmedByUserId);
  const title = allCompleted ? 'Phiếu giao hàng hoàn thành' : 'Xác nhận giao hàng';
  const body = allCompleted 
    ? `${orderCode}: Tất cả các phòng đã xác nhận nhận hàng`
    : `${orderCode}: Phòng ${roomNumber} đã xác nhận nhận hàng - bởi ${confirmer?.full_name || 'Nhân viên'}`;
  const actionUrl = `/inventory/distribution/${orderId}`;

  await createInAppNotification({
    userId: createdByUserId,
    tenantId,
    title,
    body,
    type: allCompleted ? 'success' : 'info',
    actionUrl,
    icon: allCompleted ? 'check-circle' : 'truck',
    metadata: { orderId, orderCode, roomNumber, confirmedBy: confirmedByUserId, allCompleted } as Json,
  });

  await sendPushNotification({
    userId: createdByUserId,
    tenantId,
    title,
    body,
    actionUrl,
    tag: `distribution-confirm-${orderId}`,
    notificationType: allCompleted ? 'success' : 'info',
  });
}

// Trigger when delivery is rejected - notify creator and assigned staff
export async function triggerDistributionDeliveryRejected({
  tenantId,
  hotelId,
  orderId,
  orderCode,
  roomNumber,
  createdByUserId,
  assignedToUserId,
  rejectedByUserId,
  rejectionReason,
}: {
  tenantId: string;
  hotelId: string;
  orderId: string;
  orderCode: string;
  roomNumber: string;
  createdByUserId: string;
  assignedToUserId: string | null;
  rejectedByUserId: string;
  rejectionReason: string;
}) {
  const rejecter = await getUserById(rejectedByUserId);
  const title = 'Giao hàng bị từ chối';
  const body = `${orderCode}: Phòng ${roomNumber} từ chối nhận hàng - ${rejectionReason}`;
  const actionUrl = `/inventory/distribution/${orderId}`;

  // Notify creator
  if (createdByUserId !== rejectedByUserId) {
    await createInAppNotification({
      userId: createdByUserId,
      tenantId,
      title,
      body,
      type: 'warning',
      actionUrl,
      icon: 'alert-triangle',
      metadata: { orderId, orderCode, roomNumber, rejectedBy: rejectedByUserId, reason: rejectionReason } as Json,
    });

    await sendPushNotification({
      userId: createdByUserId,
      tenantId,
      title,
      body,
      actionUrl,
      tag: `distribution-reject-${orderId}`,
      notificationType: 'warning',
    });
  }

  // Notify assigned staff
  if (assignedToUserId && assignedToUserId !== rejectedByUserId && assignedToUserId !== createdByUserId) {
    await createInAppNotification({
      userId: assignedToUserId,
      tenantId,
      title,
      body,
      type: 'warning',
      actionUrl,
      icon: 'alert-triangle',
      metadata: { orderId, orderCode, roomNumber, rejectedBy: rejectedByUserId, reason: rejectionReason } as Json,
    });

    await sendPushNotification({
      userId: assignedToUserId,
      tenantId,
      title,
      body,
      actionUrl,
      tag: `distribution-reject-${orderId}`,
      notificationType: 'warning',
    });
  }
}

// Trigger when distribution order is cancelled - notify assigned staff
export async function triggerDistributionOrderCancelled({
  tenantId,
  orderId,
  orderCode,
  assignedToUserId,
  cancelledByUserId,
}: {
  tenantId: string;
  orderId: string;
  orderCode: string;
  assignedToUserId: string | null;
  cancelledByUserId: string;
}) {
  if (!assignedToUserId || assignedToUserId === cancelledByUserId) return;

  const canceller = await getUserById(cancelledByUserId);
  const title = 'Phiếu giao hàng đã hủy';
  const body = `${orderCode} đã bị hủy bởi ${canceller?.full_name || 'Quản lý'}`;
  const actionUrl = `/inventory/distribution`;

  await createInAppNotification({
    userId: assignedToUserId,
    tenantId,
    title,
    body,
    type: 'warning',
    actionUrl,
    icon: 'x-circle',
    metadata: { orderId, orderCode, cancelledBy: cancelledByUserId } as Json,
  });

  await sendPushNotification({
    userId: assignedToUserId,
    tenantId,
    title,
    body,
    actionUrl,
    tag: `distribution-cancel-${orderId}`,
    notificationType: 'warning',
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
      notificationType: type,
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
    notificationType: currentStock <= 5 ? 'critical_stock' : 'low_stock',
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
    notificationType: 'maintenance_new',
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
    notificationType: 'laundry_completed',
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
    notificationType: 'po_approved',
  });
}
