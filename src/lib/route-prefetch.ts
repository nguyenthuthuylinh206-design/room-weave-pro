/**
 * Route prefetch — kích hoạt khi user hover/focus link trong sidebar.
 * Mỗi route chỉ prefetch 1 lần, browser tự dedupe network nếu trùng chunk.
 *
 * Cách dùng:
 *   <Link onMouseEnter={() => prefetchRoute('/inventory')} ... />
 *
 * Lợi ích: Khi user click, chunk thường đã ở cache → chuyển trang gần như tức thì.
 */

// Map từ pathname prefix → loader (giống lazy() trong App.tsx).
// Dùng prefix match: '/rooms/123' khớp '/rooms'.
const loaders: Record<string, () => Promise<unknown>> = {
  // Dashboard
  '/': () => import('@/pages/Dashboard'),

  // Inventory
  '/inventory/transactions': () => import('@/pages/inventory/TransactionListPage'),
  '/inventory/inbound': () => import('@/pages/inventory/InboundPage'),
  '/inventory/outbound': () => import('@/pages/inventory/OutboundPage'),
  '/inventory/transfer': () => import('@/pages/inventory/TransferPage'),
  '/inventory/adjustments': () => import('@/pages/inventory/AdjustmentListPage'),
  '/inventory/distributions': () => import('@/pages/inventory/DistributionOrdersPage'),
  '/inventory/reorder': () => import('@/pages/inventory/ReorderSuggestionsPage'),
  '/inventory/dead-stock': () => import('@/pages/inventory/DeadStockPage'),
  '/inventory/analytics': () => import('@/pages/inventory/InventoryAnalyticsPage'),
  '/inventory': () => import('@/pages/inventory/InventoryDashboardPage'),

  // Items
  '/items/categories': () => import('@/pages/items/CategoriesPage'),
  '/items/new': () => import('@/pages/items/ItemFormPage'),
  '/items': () => import('@/pages/items/ItemsPage'),

  // Supplements
  '/supplements': () => import('@/pages/supplements/SupplementsPage'),

  // Rooms
  '/rooms/standards': () => import('@/pages/rooms/RoomStandardsPage'),
  '/rooms/new': () => import('@/pages/rooms/RoomFormPage'),
  '/rooms': () => import('@/pages/rooms/RoomsPage'),

  // Bookings & Guests
  '/bookings': () => import('@/pages/bookings/BookingsPage'),
  '/guests': () => import('@/pages/guests/GuestsPage'),
  '/guest-invoices': () => import('@/pages/invoices/GuestInvoicesPage'),
  '/lost-found': () => import('@/pages/lost-found/LostFoundPage'),

  // Laundry
  '/laundry/batches/new': () => import('@/pages/laundry/CreateBatchPage'),
  '/laundry/batches': () => import('@/pages/laundry/LaundryBatchesPage'),
  '/laundry/compensation': () => import('@/pages/laundry/LaundryCompensationPage'),
  '/laundry/linen-batches/new': () => import('@/pages/laundry/NewLinenBatchPage'),
  '/laundry/vendors/new': () => import('@/pages/laundry/VendorFormPage'),
  '/laundry/vendors': () => import('@/pages/laundry/VendorListPage'),
  '/laundry': () => import('@/pages/laundry/LaundryDashboardPage'),

  // Vendors
  '/vendors/compare': () => import('@/pages/vendors/VendorComparisonPage'),
  '/vendors/new': () => import('@/pages/vendors/VendorFormPage'),
  '/vendors': () => import('@/pages/vendors/VendorListPage'),
  '/purchase-orders/new': () => import('@/pages/purchase-orders/POFormPage'),
  '/purchase-orders': () => import('@/pages/purchase-orders/POListPage'),

  // Maintenance
  '/maintenance/requests': () => import('@/pages/maintenance/MaintenanceRequestList'),
  '/maintenance/recurring-issues': () => import('@/pages/maintenance/RecurringIssuesPage'),
  '/maintenance': () => import('@/pages/maintenance/MaintenanceDashboard'),

  // Staff
  '/staff/shift-handover': () => import('@/pages/staff/ShiftHandoverPage'),
  '/staff': () => import('@/pages/staff/StaffManagementPage'),

  // Reports
  '/reports/inventory': () => import('@/pages/reports/InventoryReportPage'),
  '/reports/rooms': () => import('@/pages/reports/RoomsReportPage'),
  '/reports/laundry': () => import('@/pages/reports/LaundryReportPage'),
  '/reports/maintenance': () => import('@/pages/reports/MaintenanceReportPage'),
  '/reports/operations': () => import('@/pages/reports/OperationsReportPage'),
  '/reports': () => import('@/pages/reports/ReportsDashboardPage'),

  // Settings
  '/settings/general': () => import('@/pages/settings/GeneralSettingsPage'),
  '/settings/hotels': () => import('@/pages/settings/HotelsManagementPage'),
  '/settings/users': () => import('@/pages/users/UsersPage'),
  '/settings/change-password': () => import('@/pages/settings/ChangePasswordPage'),
  '/settings/subscription': () => import('@/pages/settings/SubscriptionPage'),
  '/settings/usage': () => import('@/pages/settings/UsageDashboardPage'),
  '/settings/notifications': () => import('@/pages/settings/NotificationSettingsPage'),
  '/settings/telegram': () => import('@/pages/settings/TelegramSettingsPage'),
  '/settings/business': () => import('@/pages/settings/BusinessConfigurationPage'),
  '/settings/room-check': () => import('@/pages/settings/RoomCheckSettingsPage'),
  '/settings/pricing-rules': () => import('@/pages/settings/PricingRulesPage'),
  '/settings/workflows': () => import('@/pages/settings/WorkflowsPage'),
  '/settings/ai': () => import('@/pages/settings/AISettingsPage'),
  '/settings/audit-log': () => import('@/pages/settings/AuditLogPage'),
  '/settings/asset-group-migration': () => import('@/pages/settings/AssetGroupMigrationPage'),
  '/settings/hotel-policy': () => import('@/pages/settings/HotelPolicyPage'),
  '/settings/warehouses': () => import('@/pages/settings/WarehouseListPage'),
  '/settings/profile': () => import('@/pages/profile/ProfilePage'),

  // Help
  '/help': () => import('@/pages/HelpPage'),

  // Super Admin
  '/admin/dashboard': () => import('@/pages/admin/SuperAdminDashboard'),
  '/admin/tenants': () => import('@/pages/admin/TenantsPage'),
  '/admin/promo-codes': () => import('@/pages/admin/PromoCodesPage'),
  '/admin/campaigns': () => import('@/pages/admin/MarketingCampaignsPage'),
  '/admin/reminders': () => import('@/pages/admin/RenewalRemindersPage'),
  '/admin/pricing': () => import('@/pages/admin/PricingPlansPage'),
}

const prefetched = new Set<string>()

/**
 * Tìm loader khớp longest-prefix với pathname.
 */
const findLoader = (path: string): (() => Promise<unknown>) | null => {
  // Strip query string & hash
  const clean = path.split('?')[0].split('#')[0]

  // Exact match trước
  if (loaders[clean]) return loaders[clean]

  // Sau đó longest-prefix (ưu tiên prefix dài hơn)
  const sorted = Object.keys(loaders).sort((a, b) => b.length - a.length)
  for (const key of sorted) {
    if (key === '/') continue
    if (clean === key || clean.startsWith(key + '/')) return loaders[key]
  }
  return null
}

/**
 * Prefetch chunk cho một route. An toàn để gọi nhiều lần.
 * Bỏ qua trên kết nối chậm (save-data hoặc 2g/slow-2g).
 */
export const prefetchRoute = (path: string) => {
  if (typeof window === 'undefined') return
  if (prefetched.has(path)) return

  // Skip nếu user bật Save-Data hoặc đang ở mạng chậm
  const conn = (navigator as any).connection
  if (conn?.saveData) return
  if (conn?.effectiveType && /(^|-)2g$/.test(conn.effectiveType)) return

  const loader = findLoader(path)
  if (!loader) return

  prefetched.add(path)
  // Fire-and-forget; lỗi mạng cũng không sao, lần click sau React.lazy sẽ retry
  loader().catch(() => prefetched.delete(path))
}
