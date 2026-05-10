# API Routes (frontend)

142 routes trong `src/App.tsx`.

| Path | Element | Guard | Permission |
|---|---|---|---|
| `/landing` | `<LandingPage>` | – |  |
| `/auth/login` | `<Login>` | – |  |
| `/auth/register` | `<Register>` | – |  |
| `/auth/forgot-password` | `<ForgotPassword>` | – |  |
| `/auth/change-password` | `<AuthGuard>` | – |  |
| `/auth/callback` | `<AuthCallback>` | – |  |
| `/unauthorized` | `<Unauthorized>` | – |  |
| `/payment-qr/:paymentId` | `<PaymentQRPage>` | – |  |
| `/scan-document/:sessionId` | `<ScanDocumentPage>` | – |  |
| `/onboarding` | `<AuthGuard>` | – |  |
| `/docs` | `<DocsLayout>` | RoleGuard | allowedRoles={['super_admin']} |
| `*` | `<DocsViewer>` | – |  |
| `/super-admin` | `<SuperAdminErrorBoundary>` | – |  |
| `tenants` | `<TenantsPage>` | – |  |
| `approval` | `<TenantApprovalPage>` | – |  |
| `promo-codes` | `<PromoCodesPage>` | – |  |
| `campaigns` | `<MarketingCampaignsPage>` | – |  |
| `reminders` | `<RenewalRemindersPage>` | – |  |
| `pricing` | `<PricingPlansPage>` | – |  |
| `analytics` | `<AnalyticsPage>` | – |  |
| `settings` | `<SuperAdminSettingsPage>` | – |  |
| `/` | `<AuthGuard>` | – |  |
| `more` | `<MorePage>` | – |  |
| `admin/dashboard` | `<SuperAdminDashboard>` | RoleGuard | allowedRoles={['super_admin']} |
| `admin/tenants` | `<TenantsPage>` | RoleGuard | allowedRoles={['super_admin']} |
| `admin/promo-codes` | `<PromoCodesPage>` | RoleGuard | allowedRoles={['super_admin']} |
| `admin/campaigns` | `<MarketingCampaignsPage>` | RoleGuard | allowedRoles={['super_admin']} |
| `admin/reminders` | `<RenewalRemindersPage>` | RoleGuard | allowedRoles={['super_admin']} |
| `admin/payments` | `<PaymentSettingsPage>` | RoleGuard | allowedRoles={['super_admin']} |
| `admin/pricing` | `<PricingPlansPage>` | RoleGuard | allowedRoles={['super_admin']} |
| `inventory` | `<InventoryDashboardPage>` | PermissionRoute | module="inventory" |
| `inventory/transactions` | `<TransactionListPage>` | PermissionRoute | module="inventory" |
| `inventory/inbound` | `<Navigate>` | – |  |
| `inventory/inbound/new` | `<InboundPage>` | PermissionRoute | module="inventory" action="create" |
| `inventory/outbound` | `<Navigate>` | – |  |
| `inventory/outbound/new` | `<OutboundPage>` | PermissionRoute | module="inventory" action="create" |
| `inventory/adjustments` | `<AdjustmentListPage>` | PermissionRoute | module="inventory" |
| `inventory/adjustments/new` | `<CreateAdjustmentPage>` | PermissionRoute | module="inventory" action="create" |
| `inventory/adjustments/:id` | `<AdjustmentDetailPage>` | PermissionRoute | module="inventory" |
| `inventory/adjustments/:id/check` | `<CheckAdjustmentPage>` | PermissionRoute | module="inventory" action="update" |
| `inventory/distributions` | `<DistributionOrdersPage>` | PermissionRoute | module="inventory" |
| `inventory/transfer/new` | `<TransferPage>` | PermissionRoute | module="inventory" action="create" |
| `inventory/distributions/new` | `<CreateDistributionPage>` | PermissionRoute | module="inventory" action="create" |
| `inventory/distributions/from-supplements` | `<CreateFromSupplementsPage>` | PermissionRoute | module="inventory" action="create" |
| `inventory/distributions/:id` | `<DistributionOrderDetailPage>` | PermissionRoute | module="inventory" |
| `inventory/reorder` | `<ReorderSuggestionsPage>` | PermissionRoute | module="inventory" |
| `inventory/dead-stock` | `<DeadStockPage>` | PermissionRoute | module="inventory" |
| `inventory/analytics` | `<InventoryAnalyticsPage>` | PermissionRoute | module="inventory" |
| `items` | `<ItemsPage>` | PermissionRoute | module="items" |
| `items/:id` | `<ItemDetailPage>` | PermissionRoute | module="items" |
| `items/new` | `<ItemFormPage>` | PermissionRoute | module="items" action="create" |
| `items/:id/edit` | `<ItemFormPage>` | PermissionRoute | module="items" action="update" |
| `items/categories` | `<CategoriesPage>` | PermissionRoute | module="items" |
| `rooms` | `<RoomsPage>` | PermissionRoute | module="rooms" |
| `rooms/new` | `<RoomFormPage>` | PermissionRoute | module="rooms" action="create" |
| `rooms/:id` | `<RoomDetailPage>` | PermissionRoute | module="rooms" action="update" |
| `rooms/:id/edit` | `<RoomFormPage>` | PermissionRoute | module="rooms" action="update" |
| `rooms/:id/check` | `<RoomCheckRouter>` | PermissionRoute | module="rooms" action="update" |
| `rooms/:id/check-lean` | `<RoomCheckOverviewPage>` | PermissionRoute | module="rooms" action="update" |
| `rooms/:id/check-lean/inspection` | `<LeanInspectionPage>` | PermissionRoute | module="rooms" action="update" |
| `rooms/:id/check-lean/review` | `<LeanReviewPage>` | PermissionRoute | module="rooms" action="update" |
| `rooms/:id/check-lean/success` | `<LeanSuccessPage>` | PermissionRoute | module="rooms" action="update" |
| `rooms/standards` | `<RoomStandardsPage>` | PermissionRoute | module="rooms" |
| `supplements` | `<SupplementsPage>` | PermissionRoute | module="inventory" |
| `bookings` | `<BookingsPage>` | PermissionRoute | module="bookings" |
| `bookings/:id` | `<BookingDetailPage>` | PermissionRoute | module="bookings" |
| `guests` | `<GuestsPage>` | PermissionRoute | module="bookings" |
| `guests/:id` | `<GuestDetailPage>` | PermissionRoute | module="bookings" |
| `lost-found` | `<LostFoundPage>` | PermissionRoute | module="rooms" |
| `guest-invoices` | `<GuestInvoicesPage>` | PermissionRoute | module="bookings" |
| `reception/pending-charges` | `<PendingChargesPage>` | PermissionRoute | module="bookings" |
| `laundry` | `<LaundryDashboardPage>` | PermissionRoute | module="laundry" |
| `laundry/batches` | `<LaundryBatchesPage>` | PermissionRoute | module="laundry" |
| `laundry/batches/new` | `<CreateBatchPage>` | PermissionRoute | module="laundry" action="create" |
| `laundry/batches/:id` | `<BatchDetailPage>` | PermissionRoute | module="laundry" |
| `laundry/batches/:id/receive` | `<ReceiveBatchPage>` | PermissionRoute | module="laundry" action="update" |
| `laundry/vendors` | `<VendorListPage>` | PermissionRoute | module="laundry" |
| `laundry/vendors/new` | `<VendorFormPage>` | PermissionRoute | module="laundry" action="create" |
| `laundry/vendors/:id` | `<VendorDetailPage>` | PermissionRoute | module="laundry" |
| `laundry/vendors/:id/edit` | `<VendorFormPage>` | PermissionRoute | module="laundry" action="update" |
| `laundry/compensation` | `<LaundryCompensationPage>` | PermissionRoute | module="laundry" |
| `laundry/linen-batches/new` | `<NewLinenBatchPage>` | PermissionRoute | module="laundry" action="create" |
| `settings` | `<Navigate>` | – |  |
| `settings/general` | `<GeneralSettingsPage>` | PermissionRoute | module="settings" |
| `settings/hotels` | `<HotelsManagementPage>` | PermissionRoute | module="hotels" |
| `settings/categories` | `<CategoryManagementPage>` | PermissionRoute | module="settings" |
| `settings/users` | `<UsersPage>` | PermissionRoute | module="users" |
| `settings/change-password` | `<ChangePasswordPage>` | – |  |
| `staff` | `<StaffManagementPage>` | PermissionRoute | module="users" |
| `my-tasks` | `<MyTasksPage>` | – |  |
| `staff/housekeeping` | `<HousekeepingStaffDashboard>` | – |  |
| `housekeeping/review` | `<TasksPendingReviewPage>` | PermissionRoute | module="rooms" |
| `housekeeping/qc` | `<QcDashboardPage>` | PermissionRoute | module="rooms" |
| `housekeeping/issues-review` | `<IssuesReviewPage>` | RoleGuard | allowedRoles={['super_admin', 'owner', 'hotel_manager', 'dep |
| `settings/warehouses` | `<WarehouseListPage>` | PermissionRoute | module="inventory" |
| `settings/subscription` | `<SubscriptionPage>` | RoleGuard | allowedRoles={['super_admin', 'owner']} |
| `settings/subscription/pay/:invoiceId` | `<SubscriptionPaymentPage>` | RoleGuard | allowedRoles={['super_admin', 'owner']} |
| `settings/usage` | `<UsageDashboardPage>` | RoleGuard | allowedRoles={['super_admin', 'owner']} |
| `settings/notifications` | `<NotificationSettingsPage>` | PermissionRoute | module="settings" |
| `settings/notifications/devices` | `<PushDevicesPage>` | PermissionRoute | module="settings" |
| `settings/telegram` | `<TelegramSettingsPage>` | PermissionRoute | module="settings" |
| `settings/business` | `<BusinessConfigurationPage>` | PermissionRoute | module="settings" |
| `settings/room-check` | `<RoomCheckSettingsPage>` | PermissionRoute | module="settings" |
| `settings/workflows` | `<WorkflowsPage>` | PermissionRoute | module="settings" action="manage" |
| `settings/pricing-rules` | `<PricingRulesPage>` | PermissionRoute | module="settings" |
| `settings/ai` | `<AISettingsPage>` | RoleGuard | allowedRoles={['super_admin', 'owner']} |
| `settings/audit-log` | `<AuditLogPage>` | RoleGuard | allowedRoles={['super_admin', 'owner', 'hotel_manager', 'dep |
| `settings/asset-group-migration` | `<AssetGroupMigrationPage>` | RoleGuard | allowedRoles={['super_admin', 'owner', 'hotel_manager']} |
| `settings/hotel-policy` | `<HotelPolicyPage>` | RoleGuard | allowedRoles={['super_admin', 'owner', 'hotel_manager']} |
| `profile` | `<ProfilePage>` | – |  |
| `settings/profile` | `<ProfilePage>` | – |  |
| `notifications` | `<NotificationHistoryPage>` | – |  |
| `help` | `<HelpPage>` | – |  |
| `reports` | `<ReportsDashboardPage>` | PermissionRoute | module="reports" |
| `reports/inventory` | `<InventoryReportPage>` | PermissionRoute | module="reports" |
| `reports/financial` | `<FinancialReportPage>` | PermissionRoute | module="reports" |
| `reports/laundry` | `<LaundryReportPage>` | PermissionRoute | module="reports" |
| `reports/stock-audit` | `<StockAuditReportPage>` | PermissionRoute | module="reports" |
| `reports/operations` | `<OperationsReportPage>` | PermissionRoute | module="reports" |
| `reports/rooms` | `<RoomsReportPage>` | PermissionRoute | module="reports" |
| `reports/maintenance` | `<MaintenanceReportPage>` | PermissionRoute | module="reports" |
| `reports/outbound` | `<OutboundReportPage>` | PermissionRoute | module="reports" |
| `reports/revenue` | `<RevenueReportPage>` | PermissionRoute | module="reports" |
| `reports/damages` | `<DamagesReportPage>` | PermissionRoute | module="reports" |
| `vendors` | `<VendorManagementListPage>` | PermissionRoute | module="vendors" |
| `vendors/new` | `<VendorManagementFormPage>` | PermissionRoute | module="vendors" action="create" |
| `vendors/:id` | `<VendorManagementDetailPage>` | PermissionRoute | module="vendors" |
| `vendors/:id/edit` | `<VendorManagementFormPage>` | PermissionRoute | module="vendors" action="update" |
| `vendors/compare` | `<VendorComparisonPage>` | PermissionRoute | module="vendors" |
| `maintenance` | `<MaintenanceDashboard>` | PermissionRoute | module="maintenance" |
| `maintenance/requests` | `<MaintenanceRequestList>` | PermissionRoute | module="maintenance" |
| `maintenance/requests/new` | `<MaintenanceRequestForm>` | PermissionRoute | module="maintenance" action="create" |
| `maintenance/requests/:id` | `<MaintenanceRequestDetail>` | PermissionRoute | module="maintenance" |
| `maintenance/requests/edit/:id` | `<MaintenanceRequestForm>` | PermissionRoute | module="maintenance" action="update" |
| `maintenance/recurring-issues` | `<RecurringIssuesPage>` | PermissionRoute | module="maintenance" |
| `purchase-orders` | `<POListPage>` | PermissionRoute | module="purchase_orders" |
| `purchase-orders/new` | `<POFormPage>` | PermissionRoute | module="purchase_orders" action="create" |
| `purchase-orders/:id` | `<PODetailPage>` | PermissionRoute | module="purchase_orders" |
| `hotels` | `<HotelsPage>` | PermissionRoute | module="hotels" |
| `hotels/performance` | `<HotelPerformancePage>` | PermissionRoute | module="hotels" |
| `users` | `<UsersPage>` | PermissionRoute | module="users" |
| `*` | `<NotFound>` | – |  |

## Thống kê

- Có guard: **109/142**
- PermissionRoute với module: **93**
- Public (không guard): **33**

## Routes public (không có guard)

- `/landing` → `LandingPage`
- `/auth/login` → `Login`
- `/auth/register` → `Register`
- `/auth/forgot-password` → `ForgotPassword`
- `/auth/change-password` → `AuthGuard`
- `/auth/callback` → `AuthCallback`
- `/unauthorized` → `Unauthorized`
- `/payment-qr/:paymentId` → `PaymentQRPage`
- `/scan-document/:sessionId` → `ScanDocumentPage`
- `/onboarding` → `AuthGuard`
- `*` → `DocsViewer`
- `/super-admin` → `SuperAdminErrorBoundary`
- `tenants` → `TenantsPage`
- `approval` → `TenantApprovalPage`
- `promo-codes` → `PromoCodesPage`
- `campaigns` → `MarketingCampaignsPage`
- `reminders` → `RenewalRemindersPage`
- `pricing` → `PricingPlansPage`
- `analytics` → `AnalyticsPage`
- `settings` → `SuperAdminSettingsPage`
- `/` → `AuthGuard`
- `more` → `MorePage`
- `inventory/inbound` → `Navigate`
- `inventory/outbound` → `Navigate`
- `settings` → `Navigate`
- `settings/change-password` → `ChangePasswordPage`
- `my-tasks` → `MyTasksPage`
- `staff/housekeeping` → `HousekeepingStaffDashboard`
- `profile` → `ProfilePage`
- `settings/profile` → `ProfilePage`
- `notifications` → `NotificationHistoryPage`
- `help` → `HelpPage`
- `*` → `NotFound`
