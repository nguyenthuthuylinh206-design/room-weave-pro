# Còn lại — Module stubs (sẽ mở rộng sau)

> File này gom các module nhỏ hơn để tránh tạo quá nhiều file rỗng. Mỗi section sẽ tách thành file riêng khi cần.

---

## Maintenance — `01-modules/maintenance.md`

**Routes**: `/maintenance`, `/maintenance/requests[/new|/:id|/edit/:id]`, `/maintenance/recurring-issues`.
**FSM**: `waiting → pending → in_progress → completed/cancelled`. Priority: `low|medium|high|urgent`. Issue types: `repair|replace|inspection|cleaning|other`.
**Bảng**: `maintenance_requests`, `maintenance_categories`. Recurring detection bằng query gom theo `room_id + category`.

## Guests CRM — `01-modules/guests-crm.md`

**Bảng**: `guests` (link by phone). Trigger update stats khi booking checkout. Memory: `guest-crm-spec`. Routes: `/guests`, `/guests/:id`. OCR CCCD via Gemini Flash → fill form (memory `guest-id-scanning-v1`).

## Reports — `01-modules/reports.md`

**Routes**: `/reports/{inventory|financial|laundry|stock-audit|operations|rooms|maintenance|outbound|revenue|damages}`.
**Source**: `staff_statistics`, `tenant_usage`, view aggregate. Real data only — không mock. Net revenue = total - discount - commission - vat passthrough.

## Notifications — `01-modules/notifications.md`

**Bảng**: `notifications`, `in_app_notifications`, `email_notifications`, `push_subscriptions`, `notification_preferences`, `telegram_connections`, `telegram_groups`.
**Edge fns**: `send-notification-email`, `send-push-notification`, `send-telegram-notification`, `send-welcome-email`, `send-invoice-email`, `telegram-webhook`.
**Welcome notification**: DB trigger khi tạo user (memory `automated-welcome-system-v1`).

## Workflows / Automation — `01-modules/workflows.md`

**Bảng**: `workflows`, `workflow_actions`, `workflow_executions`. Edge fn `execute-workflow`.
Trigger × Action engine — memory `automation-engine-spec`. UI: `/settings/workflows` (manager+).

## Super Admin — `01-modules/super-admin.md`

**Routes**: `/super-admin/*` (RoleGuard super_admin) + `/admin/*` (legacy alias).
**Bảng**: `super_admin_activity_log`, `platform_settings` (JSONB), `marketing_campaigns`, `campaign_engagement`, `renewal_reminders`.
**Pages**: Tenants, Approval, Promo Codes, Campaigns, Reminders, Pricing, Analytics, Settings.
Memory: `super-admin/dieu-huong-va-xac-thuc-auth-routing`, `settings-system-architecture`, `ui-and-functional-upgrades-spec`.

## Lost & Found — `01-modules/lost-found.md`

**Bảng**: `lost_found_items`. Code format `LF-YYYYMMDD-NNN`. Tạo từ Room Check Lean issue type.

## Hotel Services — gắn vào Bookings

**Bảng**: `hotel_services`, `booking_service_charges`. Memory: `extra-services-and-billing-v1`.

## Vendors / Purchase Orders

**Bảng**: `vendors`, `purchase_orders`, `purchase_order_items`, `supplement_requests`. Routes `/vendors/*`, `/purchase-orders/*`.

## Staff Management

**Bảng**: `shift_history`, `staff_status`, `staff_statistics`. Heartbeat 5 phút, offline 30 phút. `useOnShiftStaffList(All)` realtime cho mọi dialog giao việc. Memory: `shift-and-performance-monitoring-spec`, `quan-ly-cong-viec-va-nhan-su-v1`, `on-shift-list-realtime-v1`, `staff-presence-and-heartbeat-logic`.
