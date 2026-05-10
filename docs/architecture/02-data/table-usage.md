# Table Usage

92 bảng được FE sử dụng / 120 bảng trong DB.

| Table | RLS | #Cols | FE ops | #Files |
|---|---|---|---|---|
| `activity_logs` | ✓ | 15 | insert, select | 6 |
| `ai_settings` | ✓ | 7 | select, upsert | 1 |
| `audit_log` | ✓ | 13 | _(không dùng từ FE)_ | 0 |
| `avatars` | ? | 0 | update | 1 |
| `backup_logs` | ✓ | 12 | select | 1 |
| `bank_payment_settings` | ✓ | 12 | delete, insert, select, update | 1 |
| `batch_inventory` | ✓ | 13 | select | 1 |
| `booking_consumables` | ✓ | 13 | insert, select, update | 2 |
| `booking_payments` | ✓ | 14 | insert, select, update | 3 |
| `booking_service_charges` | ✓ | 11 | delete, insert, select, update | 2 |
| `campaign_engagement` | ✓ | 8 | select | 1 |
| `chargeable_consumptions` | ✓ | 26 | delete, insert, select, update | 4 |
| `checkout_inspection_requests` | ✓ | 14 | insert, select, update | 4 |
| `compensation_requests` | ✓ | 25 | insert | 1 |
| `consumption_snapshots` | ✓ | 12 | select | 1 |
| `custom_field_values` | ✓ | 5 | _(không dùng từ FE)_ | 0 |
| `custom_fields` | ✓ | 21 | _(không dùng từ FE)_ | 0 |
| `dashboard_activities` | ? | 8 | _(không dùng từ FE)_ | 0 |
| `dashboard_stats` | ? | 18 | _(không dùng từ FE)_ | 0 |
| `distribution_order_batches` | ✓ | 10 | select | 1 |
| `distribution_order_items` | ✓ | 10 | select | 3 |
| `distribution_order_rooms` | ✓ | 20 | select | 4 |
| `distribution_orders` | ✓ | 25 | select, update | 5 |
| `document_scan_sessions` | ✓ | 9 | insert, select | 1 |
| `email_logs` | ✓ | 17 | _(không dùng từ FE)_ | 0 |
| `email_notifications` | ✓ | 15 | select | 1 |
| `email_templates` | ✓ | 22 | _(không dùng từ FE)_ | 0 |
| `guest_invoices` | ✓ | 31 | insert, select, update | 2 |
| `guests` | ✓ | 19 | insert, select, update | 2 |
| `hotel_policy` | ✓ | 11 | _(không dùng từ FE)_ | 0 |
| `hotel_policy_history` | ✓ | 13 | _(không dùng từ FE)_ | 0 |
| `hotel_services` | ✓ | 14 | delete, insert, select, update | 1 |
| `hotels` | ✓ | 28 | delete, insert, select, update | 7 |
| `housekeeping_tasks` | ✓ | 32 | insert, select, update | 14 |
| `import_export_history` | ✓ | 20 | _(không dùng từ FE)_ | 0 |
| `in_app_notifications` | ✓ | 12 | delete, insert, select, update | 4 |
| `inventory_transactions` | ✓ | 30 | insert, select | 7 |
| `investigation_logs` | ✓ | 16 | insert | 1 |
| `invoices` | ✓ | 19 | insert, select, update | 6 |
| `item_categories` | ✓ | 26 | delete, insert, select, update | 8 |
| `item_images` | ✓ | 11 | delete, insert, select, update | 2 |
| `item_units` | ✓ | 11 | insert, select | 1 |
| `items` | ✓ | 43 | delete, insert, select, update | 22 |
| `laundry_batch_audit` | ✓ | 10 | _(không dùng từ FE)_ | 0 |
| `laundry_batch_items` | ✓ | 11 | update | 1 |
| `laundry_batches` | ✓ | 32 | insert, select, update | 7 |
| `laundry_categories` | ✓ | 16 | insert, select | 1 |
| `laundry_requests` | ✓ | 15 | insert, select, update | 3 |
| `laundry_vendors` | ✓ | 17 | insert, select, update | 2 |
| `lost_found_items` | ✓ | 20 | insert, select, update | 1 |
| `maintenance_categories` | ✓ | 17 | insert, select, update | 1 |
| `maintenance_requests` | ✓ | 31 | insert, select, update | 6 |
| `marketing_campaigns` | ✓ | 22 | insert, select, update | 1 |
| `notification_preferences` | ✓ | 29 | insert, select, update | 1 |
| `notifications` | ✓ | 16 | insert | 2 |
| `password_reset_otps` | ✓ | 7 | _(không dùng từ FE)_ | 0 |
| `payment_methods` | ✓ | 16 | _(không dùng từ FE)_ | 0 |
| `payment_transactions` | ✓ | 17 | insert, select, update | 8 |
| `payment_webhook_logs` | ✓ | 9 | _(không dùng từ FE)_ | 0 |
| `pending_group_links` | ✓ | 12 | insert, update | 1 |
| `permissions` | ✓ | 8 | select | 2 |
| `pg_all_foreign_keys` | ? | 16 | _(không dùng từ FE)_ | 0 |
| `plan_price_history` | ✓ | 9 | insert, select | 1 |
| `platform_settings` | ✓ | 7 | select, update | 1 |
| `positions` | ✓ | 11 | delete, insert, select, update | 1 |
| `promo_code_usage` | ✓ | 8 | select | 2 |
| `promotional_codes` | ✓ | 16 | insert, select, update | 2 |
| `purchase_order_items` | ✓ | 9 | insert, select, update | 2 |
| `purchase_orders` | ✓ | 19 | delete, insert, select, update | 3 |
| `push_subscriptions` | ✓ | 13 | delete, select, update, upsert | 2 |
| `qc_floor_stats_30d` | ? | 7 | _(không dùng từ FE)_ | 0 |
| `qc_reviews` | ✓ | 12 | _(không dùng từ FE)_ | 0 |
| `qc_sla_settings` | ✓ | 10 | _(không dùng từ FE)_ | 0 |
| `qc_staff_stats_30d` | ? | 9 | _(không dùng từ FE)_ | 0 |
| `rate_limit_hits` | ✓ | 3 | _(không dùng từ FE)_ | 0 |
| `reminder_automation_rules` | ✓ | 10 | delete, insert, select, update | 1 |
| `reminder_email_templates` | ✓ | 9 | delete, insert, select, update | 1 |
| `renewal_reminders` | ✓ | 10 | delete, select, update | 1 |
| `reorder_suggestions` | ✓ | 18 | select | 2 |
| `role_permissions` | ✓ | 5 | delete, insert, select | 2 |
| `roles` | ✓ | 9 | delete, insert, select, update | 1 |
| `room_bookings` | ✓ | 70 | insert, select, update | 24 |
| `room_check_issue_outbox` | ✓ | 20 | _(không dùng từ FE)_ | 0 |
| `room_check_issue_reviews` | ✓ | 9 | _(không dùng từ FE)_ | 0 |
| `room_check_issues` | ✓ | 32 | select | 1 |
| `room_check_sessions` | ✓ | 7 | delete, insert, select, update | 1 |
| `room_check_staff_items_view` | ? | 13 | _(không dùng từ FE)_ | 0 |
| `room_checks` | ✓ | 30 | delete, insert, select, update | 15 |
| `room_items` | ✓ | 13 | insert, select, update, upsert | 8 |
| `room_pricing_rules` | ✓ | 17 | insert, select, update | 2 |
| `room_type_standards` | ✓ | 7 | delete, insert, select, update | 2 |
| `room_types` | ✓ | 21 | insert, select | 1 |
| `rooms` | ✓ | 31 | delete, insert, select, update | 21 |
| `shift_history` | ✓ | 9 | select | 1 |
| `shift_reminders` | ✓ | 8 | _(không dùng từ FE)_ | 0 |
| `staff_statistics` | ✓ | 11 | select | 1 |
| `staff_status` | ✓ | 12 | select, update, upsert | 4 |
| `stock_adjustment_items` | ✓ | 26 | insert, select, update | 2 |
| `stock_adjustments` | ✓ | 20 | insert, select, update | 6 |
| `subscription_plans` | ✓ | 19 | insert, select, update | 3 |
| `super_admin_activity_log` | ✓ | 10 | select | 1 |
| `supplement_requests` | ✓ | 20 | insert, select, update | 6 |
| `tap_funky` | ? | 13 | _(không dùng từ FE)_ | 0 |
| `telegram_connections` | ✓ | 12 | select, update | 3 |
| `telegram_groups` | ✓ | 12 | delete, insert, select, update | 3 |
| `tenant_usage` | ✓ | 12 | select | 2 |
| `tenants` | ✓ | 38 | delete, select, update | 15 |
| `user_hotels` | ✓ | 9 | delete, insert, select, update | 8 |
| `user_levels` | ✓ | 6 | _(không dùng từ FE)_ | 0 |
| `user_permissions` | ✓ | 9 | _(không dùng từ FE)_ | 0 |
| `user_preferences` | ✓ | 5 | select, upsert | 1 |
| `user_roles` | ✓ | 5 | delete, insert, select | 4 |
| `user_with_levels` | ? | 16 | _(không dùng từ FE)_ | 0 |
| `users` | ✓ | 30 | delete, insert, select, update | 14 |
| `v_user_effective_roles` | ? | 8 | _(không dùng từ FE)_ | 0 |
| `vendors` | ✓ | 27 | delete, insert, select, update | 3 |
| `warehouse_stock` | ✓ | 10 | delete, select | 2 |
| `warehouses` | ✓ | 13 | delete, insert, select, update | 1 |
| `workflow_actions` | ✓ | 10 | delete, insert | 1 |
| `workflow_executions` | ✓ | 12 | select | 1 |
| `workflows` | ✓ | 18 | delete, insert, select, update | 1 |

## Bảng không được gọi từ FE (29)

Có thể: (a) backend-only / trigger, (b) dead code, (c) gọi qua RPC.

- `audit_log`
- `custom_field_values`
- `custom_fields`
- `dashboard_activities`
- `dashboard_stats`
- `email_logs`
- `email_templates`
- `hotel_policy`
- `hotel_policy_history`
- `import_export_history`
- `laundry_batch_audit`
- `password_reset_otps`
- `payment_methods`
- `payment_webhook_logs`
- `pg_all_foreign_keys`
- `qc_floor_stats_30d`
- `qc_reviews`
- `qc_sla_settings`
- `qc_staff_stats_30d`
- `rate_limit_hits`
- `room_check_issue_outbox`
- `room_check_issue_reviews`
- `room_check_staff_items_view`
- `shift_reminders`
- `tap_funky`
- `user_levels`
- `user_permissions`
- `user_with_levels`
- `v_user_effective_roles`
