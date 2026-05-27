import { Suspense, lazy } from "react";
import { ChunkErrorBoundary } from "@/components/ChunkErrorBoundary";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/contexts/AuthContext";

import { AuthGuard } from "@/components/auth/AuthGuard";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { PermissionRoute } from "@/components/auth/PermissionRoute";
import { OnboardingGuard } from "@/components/auth/OnboardingGuard";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";

// Helper: lazy-load named export as default
const lazyNamed = <T extends Record<string, any>>(
  loader: () => Promise<T>,
  name: keyof T
) => lazy(() => loader().then((m) => ({ default: m[name] })));

// Heavy layout shells — lazy-loaded so anonymous landing/auth/payment-QR
// pages don't pull in HotelProvider, PWA prompts, banners, sidebars, etc.
const MainLayout = lazyNamed(() => import("@/components/layout/MainLayout"), "MainLayout");
const SuperAdminLayout = lazyNamed(() => import('./components/super-admin/SuperAdminLayout'), "SuperAdminLayout");
const SuperAdminErrorBoundary = lazyNamed(() => import('./components/super-admin/ErrorBoundary'), "SuperAdminErrorBoundary");
// CacheBuster runs in requestIdleCallback so it's safe (and cheaper) to lazy-load.
const CacheBuster = lazy(() =>
  import("@/components/pwa/CacheBuster").then((m) => ({ default: m.CacheBuster }))
);

// === Lazy routes — code-split per page ===
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ChatPage = lazy(() => import("./pages/ChatPage"));
const LandingPage = lazy(() => import("./pages/LandingPage"));
const RootRoute = lazy(() => import("./components/layout/RootRoute"));
const DocsLayout = lazy(() => import("./pages/docs/DocsLayout"));
const DocsIndex = lazy(() => import("./pages/docs/DocsIndex"));
const DocsViewer = lazy(() => import("./pages/docs/DocsViewer"));

// Inventory
const InventoryDashboardPage = lazyNamed(() => import("./pages/inventory/InventoryDashboardPage"), "InventoryDashboardPage");
const SupplementsPage = lazyNamed(() => import("./pages/supplements/SupplementsPage"), "SupplementsPage");
const TransactionListPage = lazyNamed(() => import("./pages/inventory/TransactionListPage"), "TransactionListPage");
const InboundPage = lazyNamed(() => import("./pages/inventory/InboundPage"), "InboundPage");
const OutboundPage = lazyNamed(() => import("./pages/inventory/OutboundPage"), "OutboundPage");
const AdjustmentListPage = lazyNamed(() => import("./pages/inventory/AdjustmentListPage"), "AdjustmentListPage");
const CreateAdjustmentPage = lazyNamed(() => import("./pages/inventory/CreateAdjustmentPage"), "CreateAdjustmentPage");
const CheckAdjustmentPage = lazyNamed(() => import("./pages/inventory/CheckAdjustmentPage"), "CheckAdjustmentPage");
const AdjustmentDetailPage = lazyNamed(() => import("./pages/inventory/AdjustmentDetailPage"), "AdjustmentDetailPage");
const DistributionOrdersPage = lazy(() => import("./pages/inventory/DistributionOrdersPage"));
const DistributionOrderDetailPage = lazy(() => import("./pages/inventory/DistributionOrderDetailPage"));
const CreateDistributionPage = lazy(() => import("./pages/inventory/CreateDistributionPage"));
const CreateFromSupplementsPage = lazy(() => import("./pages/inventory/CreateFromSupplementsPage"));
const TransferPage = lazy(() => import("./pages/inventory/TransferPage"));
const ReorderSuggestionsPage = lazy(() => import("./pages/inventory/ReorderSuggestionsPage"));
const DeadStockPage = lazy(() => import("./pages/inventory/DeadStockPage"));
const InventoryAnalyticsPage = lazy(() => import("./pages/inventory/InventoryAnalyticsPage"));

// Items
const ItemsPage = lazyNamed(() => import("./pages/items/ItemsPage"), "ItemsPage");
const ItemDetailPage = lazy(() => import("./pages/items/ItemDetailPage"));
const ItemFormPage = lazyNamed(() => import("./pages/items/ItemFormPage"), "ItemFormPage");
const CategoriesPage = lazyNamed(() => import("./pages/items/CategoriesPage"), "CategoriesPage");

// Rooms
const RoomsPage = lazyNamed(() => import("./pages/rooms/RoomsPage"), "RoomsPage");
const RoomDetailPage = lazyNamed(() => import("./pages/rooms/RoomDetailPage"), "RoomDetailPage");
const RoomFormPage = lazyNamed(() => import("./pages/rooms/RoomFormPage"), "RoomFormPage");
const RoomStandardsPage = lazyNamed(() => import("./pages/rooms/RoomStandardsPage"), "RoomStandardsPage");
const RoomCheckPage = lazyNamed(() => import("./pages/rooms/RoomCheckPage"), "RoomCheckPage");
const RoomCheckRouter = lazy(() => import("./pages/rooms/RoomCheckRouter"));
const RoomCheckOverviewPage = lazy(() => import("./pages/rooms/RoomCheckOverviewPage"));
const LeanInspectionPage = lazy(() => import("./pages/rooms/LeanInspectionPage"));
const LeanReviewPage = lazy(() => import("./pages/rooms/LeanReviewPage"));
const LeanSuccessPage = lazy(() => import("./pages/rooms/LeanSuccessPage"));

// Bookings & Guests
const BookingsPage = lazyNamed(() => import("./pages/bookings/BookingsPage"), "BookingsPage");
const BookingDetailPage = lazyNamed(() => import("./pages/bookings/BookingDetailPage"), "BookingDetailPage");
const GuestsPage = lazy(() => import("./pages/guests/GuestsPage"));
const GuestDetailPage = lazy(() => import("./pages/guests/GuestDetailPage"));
const LostFoundPage = lazy(() => import("./pages/lost-found/LostFoundPage"));
const GuestInvoicesPage = lazy(() => import("./pages/invoices/GuestInvoicesPage"));
const PendingChargesPage = lazy(() => import("./pages/reception/PendingChargesPage"));
const ReconciliationPage = lazy(() => import("./pages/finance/ReconciliationPage"));
const ShiftHandoverPage = lazy(() => import("./pages/staff/ShiftHandoverPage"));

// Laundry
const LaundryDashboardPage = lazyNamed(() => import("./pages/laundry/LaundryDashboardPage"), "LaundryDashboardPage");
const LaundryBatchesPage = lazyNamed(() => import("./pages/laundry/LaundryBatchesPage"), "LaundryBatchesPage");
const CreateBatchPage = lazyNamed(() => import("./pages/laundry/CreateBatchPage"), "CreateBatchPage");
const BatchDetailPage = lazyNamed(() => import("./pages/laundry/BatchDetailPage"), "BatchDetailPage");
const ReceiveBatchPage = lazyNamed(() => import("./pages/laundry/ReceiveBatchPage"), "ReceiveBatchPage");
const VendorListPage = lazyNamed(() => import("./pages/laundry/VendorListPage"), "VendorListPage");
const VendorDetailPage = lazyNamed(() => import("./pages/laundry/VendorDetailPage"), "VendorDetailPage");
const VendorFormPage = lazyNamed(() => import("./pages/laundry/VendorFormPage"), "VendorFormPage");
const LaundryCompensationPage = lazy(() => import("./pages/laundry/LaundryCompensationPage"));
const NewLinenBatchPage = lazy(() => import("./pages/laundry/NewLinenBatchPage"));

// Settings
const GeneralSettingsPage = lazyNamed(() => import("./pages/settings/GeneralSettingsPage"), "GeneralSettingsPage");
const RoomCheckSettingsPage = lazy(() => import("./pages/settings/RoomCheckSettingsPage"));
const HotelsManagementPage = lazy(() => import("./pages/settings/HotelsManagementPage"));
const SubscriptionPage = lazy(() => import("./pages/settings/SubscriptionPage"));
const SubscriptionPaymentPage = lazy(() => import("./pages/settings/SubscriptionPaymentPage"));
const UsageDashboardPage = lazy(() => import("./pages/settings/UsageDashboardPage"));
const NotificationSettingsPage = lazyNamed(() => import("./pages/settings/NotificationSettingsPage"), "NotificationSettingsPage");
const PushDevicesPage = lazy(() => import("./pages/settings/PushDevicesPage"));
const TelegramSettingsPage = lazy(() => import("./pages/settings/TelegramSettingsPage"));
const BusinessConfigurationPage = lazyNamed(() => import("./pages/settings/BusinessConfigurationPage"), "BusinessConfigurationPage");
const CategoryManagementPage = lazy(() => import("./pages/settings/CategoryManagementPage"));
const WorkflowsPage = lazy(() => import("./pages/settings/WorkflowsPage"));
const WarehouseListPage = lazy(() => import("./pages/settings/WarehouseListPage"));
const ChangePasswordPage = lazy(() => import("./pages/settings/ChangePasswordPage"));
const PricingRulesPage = lazy(() => import("./pages/settings/PricingRulesPage"));
const AISettingsPage = lazy(() => import("./pages/settings/AISettingsPage"));
const AuditLogPage = lazy(() => import("./pages/settings/AuditLogPage"));
const AssetGroupMigrationPage = lazy(() => import("./pages/settings/AssetGroupMigrationPage"));
const HotelPolicyPage = lazy(() => import("./pages/settings/HotelPolicyPage"));

// Reports
// ReportsDashboardPage đã loại bỏ — desktop landing redirect sang Finance Hub, mobile dùng MobileReportsDashboard riêng.
const InventoryReportPage = lazyNamed(() => import("./pages/reports/InventoryReportPage"), "InventoryReportPage");
const FinancialReportPage = lazyNamed(() => import("./pages/reports/FinancialReportPage"), "FinancialReportPage");
const LaundryReportPage = lazyNamed(() => import("./pages/reports/LaundryReportPage"), "LaundryReportPage");
const OperationsReportPage = lazyNamed(() => import("./pages/reports/OperationsReportPage"), "OperationsReportPage");
const RoomsReportPage = lazyNamed(() => import("./pages/reports/RoomsReportPage"), "RoomsReportPage");
const MaintenanceReportPage = lazyNamed(() => import("./pages/reports/MaintenanceReportPage"), "MaintenanceReportPage");
const OutboundReportPage = lazyNamed(() => import("./pages/reports/OutboundReportPage"), "OutboundReportPage");
const RevenueReportPage = lazyNamed(() => import("./pages/reports/RevenueReportPage"), "RevenueReportPage");
const DamagesReportPage = lazyNamed(() => import("./pages/reports/DamagesReportPage"), "DamagesReportPage");
const StockAuditReportPage = lazyNamed(() => import("./pages/reports/StockAuditReportPage"), "StockAuditReportPage");
const FinanceHubPage = lazyNamed(() => import("./pages/reports/hub/FinanceHubPage"), "FinanceHubPage");
const OperationsHubPage = lazyNamed(() => import("./pages/reports/hub/OperationsHubPage"), "OperationsHubPage");
const HousekeepingHubPage = lazyNamed(() => import("./pages/reports/hub/HousekeepingHubPage"), "HousekeepingHubPage");
const InventoryHubPage = lazyNamed(() => import("./pages/reports/hub/InventoryHubPage"), "InventoryHubPage");
const OverviewHubPage = lazyNamed(() => import("./pages/reports/hub/OverviewHubPage"), "OverviewHubPage");
const RoomRevenueReportPage = lazyNamed(() => import("./pages/reports/RoomRevenueReportPage"), "RoomRevenueReportPage");
const CashFlowReportPage = lazyNamed(() => import("./pages/reports/CashFlowReportPage"), "CashFlowReportPage");

// Hotels & Vendors
const HotelsPage = lazyNamed(() => import("./pages/hotels/HotelsPage"), "HotelsPage");
const HotelPerformancePage = lazy(() => import("./pages/hotels/HotelPerformancePage"));
const VendorManagementListPage = lazyNamed(() => import("./pages/vendors/VendorListPage"), "VendorListPage");
const VendorManagementDetailPage = lazyNamed(() => import("./pages/vendors/VendorDetailPage"), "VendorDetailPage");
const VendorManagementFormPage = lazy(() => import("./pages/vendors/VendorFormPage"));
const VendorComparisonPage = lazy(() => import("./pages/vendors/VendorComparisonPage"));

// Mobile / Misc
const MorePage = lazyNamed(() => import("./pages/mobile/MorePage"), "MorePage");

// Maintenance
const MaintenanceDashboard = lazy(() => import("./pages/maintenance/MaintenanceDashboard"));
const MaintenanceRequestList = lazy(() => import("./pages/maintenance/MaintenanceRequestList"));
const MaintenanceRequestForm = lazy(() => import("./pages/maintenance/MaintenanceRequestForm"));
const MaintenanceRequestDetail = lazy(() => import("./pages/maintenance/MaintenanceRequestDetail"));
const RecurringIssuesPage = lazy(() => import("./pages/maintenance/RecurringIssuesPage"));

// Purchase Orders
const POListPage = lazy(() => import("./pages/purchase-orders/POListPage"));
const PODetailPage = lazy(() => import("./pages/purchase-orders/PODetailPage"));
const POFormPage = lazy(() => import("./pages/purchase-orders/POFormPage"));

// Auth
const Login = lazy(() => import("./pages/auth/Login"));
const Register = lazy(() => import("./pages/auth/Register"));
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"));
const AuthChangePasswordPage = lazy(() => import("./pages/auth/ChangePasswordPage"));
const AuthCallback = lazy(() => import("./pages/auth/AuthCallback"));
const Onboarding = lazy(() => import("./pages/auth/Onboarding"));
const Unauthorized = lazy(() => import("./pages/Unauthorized"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Users / Profile
const UsersPage = lazy(() => import("./pages/users/UsersPage"));
const ProfilePage = lazy(() => import("./pages/profile/ProfilePage"));

// Super Admin
const SuperAdminDashboard = lazyNamed(() => import("./pages/admin/SuperAdminDashboard"), "SuperAdminDashboard");
const TenantsPage = lazyNamed(() => import("./pages/admin/TenantsPage"), "TenantsPage");
const AnalyticsPage = lazyNamed(() => import("./pages/admin/AnalyticsPage"), "AnalyticsPage");
const PromoCodesPage = lazyNamed(() => import("./pages/admin/PromoCodesPage"), "PromoCodesPage");
const MarketingCampaignsPage = lazyNamed(() => import("./pages/admin/MarketingCampaignsPage"), "MarketingCampaignsPage");
const RenewalRemindersPage = lazyNamed(() => import("./pages/admin/RenewalRemindersPage"), "RenewalRemindersPage");
const PricingPlansPage = lazyNamed(() => import("./pages/admin/PricingPlansPage"), "PricingPlansPage");
const PaymentSettingsPage = lazyNamed(() => import("./pages/admin/PaymentSettingsPage"), "PaymentSettingsPage");
const SuperAdminSettingsPage = lazyNamed(() => import("./pages/admin/SuperAdminSettingsPage"), "SuperAdminSettingsPage");
const AnnouncementsAdminPage = lazy(() => import("./pages/admin/AnnouncementsPage"));
const TenantApprovalPage = lazy(() => import("./pages/admin/TenantApprovalPage"));

// Other
const NotificationHistoryPage = lazy(() => import("./pages/NotificationHistoryPage"));
const HelpPage = lazy(() => import("./pages/HelpPage"));
const WhatsNewPage = lazy(() => import("./pages/WhatsNewPage"));
const StaffManagementPage = lazy(() => import("./pages/staff/StaffManagementPage"));
const MyTasksPage = lazy(() => import("./pages/MyTasksPage"));
const PaymentQRPage = lazy(() => import("./pages/payment/PaymentQRPage"));
const InvoiceVatClaimPage = lazy(() => import("./pages/public/InvoiceVatClaimPage"));
const ScanDocumentPage = lazy(() => import("./pages/scan/ScanDocumentPage"));
const HousekeepingStaffDashboard = lazy(() => import("./pages/HousekeepingStaffDashboard"));
const TasksPendingReviewPage = lazy(() => import("./pages/housekeeping/TasksPendingReviewPage"));
const QcDashboardPage = lazy(() => import("./pages/housekeeping/QcDashboardPage"));
const IssuesReviewPage = lazy(() => import("./pages/housekeeping/IssuesReviewPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes — keep cache longer to reduce refetches
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Lightweight loader shown while a route chunk is being fetched
const RouteFallback = () => (
  <div className="flex min-h-screen items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
  </div>
);

const router = createBrowserRouter([
  // Landing page - public
  { path: "/landing", element: <LandingPage /> },

  // Public routes
  { path: "/auth/login", element: <Login /> },
  { path: "/auth/register", element: <Register /> },
  { path: "/auth/forgot-password", element: <ForgotPassword /> },
  { 
    path: "/auth/change-password", 
    element: (
      <AuthGuard>
        <AuthChangePasswordPage />
      </AuthGuard>
    ) 
  },
  
  { path: "/auth/callback", element: <AuthCallback /> },
  { path: "/unauthorized", element: <Unauthorized /> },
  
  // Payment QR Page - Public route (no auth required)
  {
    path: "/payment-qr/:paymentId",
    element: <PaymentQRPage />,
  },

  // VAT e-invoice claim — public, khách quét QR trên bill nhiệt
  {
    path: "/i/:token",
    element: <InvoiceVatClaimPage />,
  },

  
  // Document Scan Page - Public route (mobile capture)
  {
    path: "/scan-document/:sessionId",
    element: <ScanDocumentPage />,
  },
  
  // Onboarding - requires authentication but not tenant setup
  {
    path: "/onboarding",
    element: (
      <AuthGuard>
        <Onboarding />
      </AuthGuard>
    ),
  },

  // Docs Viewer (Super Admin only) — đọc docs/architecture/*.md trực tiếp
  {
    path: "/docs",
    element: (
      <RoleGuard allowedRoles={['super_admin']}>
        <DocsLayout />
      </RoleGuard>
    ),
    children: [
      { index: true, element: <DocsIndex /> },
      { path: "*", element: <DocsViewer /> },
    ],
  },

  // Super Admin Routes
  {
    path: "/super-admin",
    element: (
      <SuperAdminErrorBoundary>
        <SuperAdminLayout />
      </SuperAdminErrorBoundary>
    ),
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: <SuperAdminDashboard /> },
      { path: "tenants", element: <TenantsPage /> },
      { path: "approval", element: <TenantApprovalPage /> },
      { path: "promo-codes", element: <PromoCodesPage /> },
      { path: "campaigns", element: <MarketingCampaignsPage /> },
      { path: "reminders", element: <RenewalRemindersPage /> },
      { path: "pricing", element: <PricingPlansPage /> },
      { path: "analytics", element: <AnalyticsPage /> },
      { path: "settings", element: <SuperAdminSettingsPage /> },
      { path: "announcements", element: <AnnouncementsAdminPage /> },
    ],
  },

  // Protected routes (RootRoute hiển thị Landing cho khách vãng lai tại "/")
  {
    path: "/",
    element: <RootRoute />,
    errorElement: <RouteErrorBoundary />,
    children: [
      { 
        index: true, 
        element: (
          <PermissionRoute module="dashboard" fallback={<Navigate to="/auth/callback" replace />}>
            <Dashboard />
          </PermissionRoute>
        )
      },
      { path: "more", element: <MorePage /> },
      { path: "chat", element: <ChatPage /> },
      { path: "chat/:conversationId", element: <ChatPage /> },
      
      // Super Admin Dashboard
      {
        path: "admin/dashboard",
        element: (
          <RoleGuard allowedRoles={['super_admin']}>
            <SuperAdminDashboard />
          </RoleGuard>
        ),
      },
      {
        path: "admin/tenants",
        element: (
          <RoleGuard allowedRoles={['super_admin']}>
            <TenantsPage />
          </RoleGuard>
        ),
      },
      {
        path: "admin/promo-codes",
        element: (
          <RoleGuard allowedRoles={['super_admin']}>
            <PromoCodesPage />
          </RoleGuard>
        ),
      },
      {
        path: "admin/campaigns",
        element: (
          <RoleGuard allowedRoles={['super_admin']}>
            <MarketingCampaignsPage />
          </RoleGuard>
        ),
      },
      {
        path: "admin/reminders",
        element: (
          <RoleGuard allowedRoles={['super_admin']}>
            <RenewalRemindersPage />
          </RoleGuard>
        ),
      },
      {
        path: "admin/payments",
        element: (
          <RoleGuard allowedRoles={['super_admin']}>
            <PaymentSettingsPage />
          </RoleGuard>
        ),
      },
      {
        path: "admin/pricing",
        element: (
          <RoleGuard allowedRoles={['super_admin']}>
            <PricingPlansPage />
          </RoleGuard>
        ),
      },
      
      // Inventory - Permission Based
      { path: "inventory", element: <PermissionRoute module="inventory"><InventoryDashboardPage /></PermissionRoute> },
      { path: "inventory/transactions", element: <PermissionRoute module="inventory"><TransactionListPage /></PermissionRoute> },
      { path: "inventory/inbound", element: <Navigate to="/inventory/transactions" replace /> },
      { path: "inventory/inbound/new", element: <PermissionRoute module="inventory" action="create"><InboundPage /></PermissionRoute> },
      { path: "inventory/outbound", element: <Navigate to="/inventory/transactions" replace /> },
      { path: "inventory/outbound/new", element: <PermissionRoute module="inventory" action="create"><OutboundPage /></PermissionRoute> },
      { path: "inventory/adjustments", element: <PermissionRoute module="inventory"><AdjustmentListPage /></PermissionRoute> },
      { path: "inventory/adjustments/new", element: <PermissionRoute module="inventory" action="create"><CreateAdjustmentPage /></PermissionRoute> },
      { path: "inventory/adjustments/:id", element: <PermissionRoute module="inventory"><AdjustmentDetailPage /></PermissionRoute> },
      { path: "inventory/adjustments/:id/check", element: <PermissionRoute module="inventory" action="update"><CheckAdjustmentPage /></PermissionRoute> },
      { path: "inventory/distributions", element: <PermissionRoute module="inventory"><DistributionOrdersPage /></PermissionRoute> },
      { path: "inventory/transfer/new", element: <PermissionRoute module="inventory" action="create"><TransferPage /></PermissionRoute> },
      { path: "inventory/distributions/new", element: <PermissionRoute module="inventory" action="create"><CreateDistributionPage /></PermissionRoute> },
      { path: "inventory/distributions/from-supplements", element: <PermissionRoute module="inventory" action="create"><CreateFromSupplementsPage /></PermissionRoute> },
      { path: "inventory/distributions/:id", element: <PermissionRoute module="inventory"><DistributionOrderDetailPage /></PermissionRoute> },
      { path: "inventory/reorder", element: <PermissionRoute module="inventory"><ReorderSuggestionsPage /></PermissionRoute> },
      { path: "inventory/dead-stock", element: <PermissionRoute module="inventory"><DeadStockPage /></PermissionRoute> },
      { path: "inventory/analytics", element: <PermissionRoute module="inventory"><InventoryAnalyticsPage /></PermissionRoute> },

      // Items
      { path: "items", element: <PermissionRoute module="items"><ItemsPage /></PermissionRoute> },
      { path: "items/:id", element: <PermissionRoute module="items"><ItemDetailPage /></PermissionRoute> },
      { path: "items/new", element: <PermissionRoute module="items" action="create"><ItemFormPage /></PermissionRoute> },
      { path: "items/:id/edit", element: <PermissionRoute module="items" action="update"><ItemFormPage /></PermissionRoute> },
      { path: "items/categories", element: <PermissionRoute module="items"><CategoriesPage /></PermissionRoute> },

      // Rooms
      { path: "rooms", element: <PermissionRoute module="rooms"><RoomsPage /></PermissionRoute> },
      { path: "rooms/new", element: <PermissionRoute module="rooms" action="create"><RoomFormPage /></PermissionRoute> },
      { path: "rooms/:id", element: <PermissionRoute module="rooms" action="update"><RoomDetailPage /></PermissionRoute> },
      { path: "rooms/:id/edit", element: <PermissionRoute module="rooms" action="update"><RoomFormPage /></PermissionRoute> },
      { path: "rooms/:id/check", element: <PermissionRoute module="rooms" action="update"><RoomCheckRouter /></PermissionRoute> },
      { path: "rooms/:id/check-lean", element: <PermissionRoute module="rooms" action="update"><RoomCheckOverviewPage /></PermissionRoute> },
      { path: "rooms/:id/check-lean/inspection", element: <PermissionRoute module="rooms" action="update"><LeanInspectionPage /></PermissionRoute> },
      { path: "rooms/:id/check-lean/review", element: <PermissionRoute module="rooms" action="update"><LeanReviewPage /></PermissionRoute> },
      { path: "rooms/:id/check-lean/success", element: <PermissionRoute module="rooms" action="update"><LeanSuccessPage /></PermissionRoute> },
      { path: "rooms/standards", element: <PermissionRoute module="rooms"><RoomStandardsPage /></PermissionRoute> },

      // Supplements
      { path: "supplements", element: <PermissionRoute module="inventory"><SupplementsPage /></PermissionRoute> },

      // Bookings
      { path: "bookings", element: <PermissionRoute module="bookings"><BookingsPage /></PermissionRoute> },
      { path: "bookings/:id", element: <PermissionRoute module="bookings"><BookingDetailPage /></PermissionRoute> },

      // Guests
      { path: "guests", element: <PermissionRoute module="bookings"><GuestsPage /></PermissionRoute> },
      { path: "guests/:id", element: <PermissionRoute module="bookings"><GuestDetailPage /></PermissionRoute> },

      // Lost & Found
      { path: "lost-found", element: <PermissionRoute module="rooms"><LostFoundPage /></PermissionRoute> },

      // Guest Invoices
      { path: "guest-invoices", element: <PermissionRoute module="bookings"><GuestInvoicesPage /></PermissionRoute> },

      // Finance — đối soát thanh toán
      { path: "finance/reconciliation", element: <RoleGuard allowedRoles={['super_admin', 'owner']}><ReconciliationPage /></RoleGuard> },
      { path: "staff/shift-handover", element: <ShiftHandoverPage /> },

      // Reception
      { path: "reception/pending-charges", element: <PermissionRoute module="bookings"><PendingChargesPage /></PermissionRoute> },

      // Laundry
      { path: "laundry", element: <PermissionRoute module="laundry"><LaundryDashboardPage /></PermissionRoute> },
      { path: "laundry/batches", element: <PermissionRoute module="laundry"><LaundryBatchesPage /></PermissionRoute> },
      { path: "laundry/batches/new", element: <PermissionRoute module="laundry" action="create"><CreateBatchPage /></PermissionRoute> },
      { path: "laundry/batches/:id", element: <PermissionRoute module="laundry"><BatchDetailPage /></PermissionRoute> },
      { path: "laundry/batches/:id/receive", element: <PermissionRoute module="laundry" action="update"><ReceiveBatchPage /></PermissionRoute> },
      { path: "laundry/vendors", element: <PermissionRoute module="laundry"><VendorListPage /></PermissionRoute> },
      { path: "laundry/vendors/new", element: <PermissionRoute module="laundry" action="create"><VendorFormPage /></PermissionRoute> },
      { path: "laundry/vendors/:id", element: <PermissionRoute module="laundry"><VendorDetailPage /></PermissionRoute> },
      { path: "laundry/vendors/:id/edit", element: <PermissionRoute module="laundry" action="update"><VendorFormPage /></PermissionRoute> },
      { path: "laundry/compensation", element: <PermissionRoute module="laundry"><LaundryCompensationPage /></PermissionRoute> },
      { path: "laundry/linen-batches/new", element: <PermissionRoute module="laundry" action="create"><NewLinenBatchPage /></PermissionRoute> },

      // Settings
      { path: "settings", element: <Navigate to="/settings/general" replace /> },
      { path: "settings/general", element: <PermissionRoute module="settings"><GeneralSettingsPage /></PermissionRoute> },
      { path: "settings/hotels", element: <PermissionRoute module="hotels"><HotelsManagementPage /></PermissionRoute> },
      { path: "settings/categories", element: <PermissionRoute module="settings"><CategoryManagementPage /></PermissionRoute> },
      { path: "settings/users", element: <PermissionRoute module="users"><UsersPage /></PermissionRoute> },
      { path: "settings/change-password", element: <ChangePasswordPage /> },
      { path: "staff", element: <PermissionRoute module="users"><StaffManagementPage /></PermissionRoute> },
      { path: "my-tasks", element: <MyTasksPage /> },
      { path: "staff/housekeeping", element: <HousekeepingStaffDashboard /> },
      { path: "housekeeping/review", element: <PermissionRoute module="rooms"><TasksPendingReviewPage /></PermissionRoute> },
      { path: "housekeeping/qc", element: <PermissionRoute module="rooms"><QcDashboardPage /></PermissionRoute> },
      { path: "housekeeping/issues-review", element: <RoleGuard allowedRoles={['super_admin', 'owner', 'hotel_manager', 'department_manager']}><IssuesReviewPage /></RoleGuard> },
      { path: "settings/warehouses", element: <PermissionRoute module="inventory"><WarehouseListPage /></PermissionRoute> },
      { path: "settings/subscription", element: <RoleGuard allowedRoles={['super_admin', 'owner']}><SubscriptionPage /></RoleGuard> },
      { path: "settings/subscription/pay/:invoiceId", element: <RoleGuard allowedRoles={['super_admin', 'owner']}><SubscriptionPaymentPage /></RoleGuard> },
      { path: "settings/usage", element: <RoleGuard allowedRoles={['super_admin', 'owner']}><UsageDashboardPage /></RoleGuard> },
      { path: "settings/notifications", element: <PermissionRoute module="settings"><NotificationSettingsPage /></PermissionRoute> },
      { path: "settings/notifications/devices", element: <PermissionRoute module="settings"><PushDevicesPage /></PermissionRoute> },
      { path: "settings/telegram", element: <PermissionRoute module="settings"><TelegramSettingsPage /></PermissionRoute> },
      { path: "settings/business", element: <PermissionRoute module="settings"><BusinessConfigurationPage /></PermissionRoute> },
      { path: "settings/room-check", element: <PermissionRoute module="settings"><RoomCheckSettingsPage /></PermissionRoute> },
      { path: "settings/workflows", element: <PermissionRoute module="settings" action="manage"><WorkflowsPage /></PermissionRoute> },
      { path: "settings/pricing-rules", element: <PermissionRoute module="settings"><PricingRulesPage /></PermissionRoute> },
      { path: "settings/ai", element: <RoleGuard allowedRoles={['super_admin', 'owner']}><AISettingsPage /></RoleGuard> },
      { path: "settings/audit-log", element: <RoleGuard allowedRoles={['super_admin', 'owner', 'hotel_manager', 'department_manager']}><AuditLogPage /></RoleGuard> },
      { path: "settings/asset-group-migration", element: <RoleGuard allowedRoles={['super_admin', 'owner', 'hotel_manager']}><AssetGroupMigrationPage /></RoleGuard> },
      { path: "settings/hotel-policy", element: <RoleGuard allowedRoles={['super_admin', 'owner', 'hotel_manager']}><HotelPolicyPage /></RoleGuard> },

      // Profile
      { path: "profile", element: <ProfilePage /> },
      { path: "settings/profile", element: <ProfilePage /> },
      
      // Notifications History
      { path: "notifications", element: <NotificationHistoryPage /> },
      
      // Help
      { path: "help", element: <HelpPage /> },
      { path: "whats-new", element: <WhatsNewPage /> },

      // Reports — consolidated hubs (4 trang chính + overview)
      { path: "reports", element: <PermissionRoute module="reports"><OverviewHubPage /></PermissionRoute> },
      { path: "reports/finance", element: <PermissionRoute module="reports"><FinanceHubPage /></PermissionRoute> },
      { path: "reports/operations", element: <PermissionRoute module="reports"><OperationsHubPage /></PermissionRoute> },
      { path: "reports/housekeeping", element: <PermissionRoute module="reports"><HousekeepingHubPage /></PermissionRoute> },
      { path: "reports/inventory", element: <PermissionRoute module="reports"><InventoryHubPage /></PermissionRoute> },

      // Legacy / standalone report URLs → redirect vào hub mới
      { path: "reports/legacy", element: <Navigate to="/reports" replace /> },
      { path: "reports/room-revenue", element: <Navigate to="/reports/finance?tab=room-revenue" replace /> },
      { path: "reports/cash-flow", element: <Navigate to="/reports/finance?tab=cash-flow" replace /> },
      { path: "reports/revenue", element: <Navigate to="/reports/finance?tab=room-revenue" replace /> },
      { path: "reports/financial", element: <Navigate to="/reports/finance?tab=costs" replace /> },
      { path: "reports/rooms", element: <Navigate to="/reports/operations?tab=rooms" replace /> },
      { path: "reports/damages", element: <Navigate to="/reports/inventory?tab=damages" replace /> },
      { path: "reports/laundry", element: <Navigate to="/reports/housekeeping?tab=laundry" replace /> },
      { path: "reports/outbound", element: <Navigate to="/reports/inventory?tab=outbound" replace /> },
      { path: "reports/stock-audit", element: <Navigate to="/reports/inventory?tab=audit" replace /> },
      { path: "reports/maintenance", element: <Navigate to="/reports/inventory?tab=maintenance" replace /> },

      // Vendors
      { path: "vendors", element: <PermissionRoute module="vendors"><VendorManagementListPage /></PermissionRoute> },
      { path: "vendors/new", element: <PermissionRoute module="vendors" action="create"><VendorManagementFormPage /></PermissionRoute> },
      { path: "vendors/:id", element: <PermissionRoute module="vendors"><VendorManagementDetailPage /></PermissionRoute> },
      { path: "vendors/:id/edit", element: <PermissionRoute module="vendors" action="update"><VendorManagementFormPage /></PermissionRoute> },
      { path: "vendors/compare", element: <PermissionRoute module="vendors"><VendorComparisonPage /></PermissionRoute> },

      // Maintenance
      { path: "maintenance", element: <PermissionRoute module="maintenance"><MaintenanceDashboard /></PermissionRoute> },
      { path: "maintenance/requests", element: <PermissionRoute module="maintenance"><MaintenanceRequestList /></PermissionRoute> },
      { path: "maintenance/requests/new", element: <PermissionRoute module="maintenance" action="create"><MaintenanceRequestForm /></PermissionRoute> },
      { path: "maintenance/requests/:id", element: <PermissionRoute module="maintenance"><MaintenanceRequestDetail /></PermissionRoute> },
      { path: "maintenance/requests/edit/:id", element: <PermissionRoute module="maintenance" action="update"><MaintenanceRequestForm /></PermissionRoute> },
      { path: "maintenance/recurring-issues", element: <PermissionRoute module="maintenance"><RecurringIssuesPage /></PermissionRoute> },

      // Purchase Orders
      { path: "purchase-orders", element: <PermissionRoute module="purchase_orders"><POListPage /></PermissionRoute> },
      { path: "purchase-orders/new", element: <PermissionRoute module="purchase_orders" action="create"><POFormPage /></PermissionRoute> },
      { path: "purchase-orders/:id", element: <PermissionRoute module="purchase_orders"><PODetailPage /></PermissionRoute> },

      // Hotels
      { path: "hotels", element: <PermissionRoute module="hotels"><HotelsPage /></PermissionRoute> },
      { path: "hotels/performance", element: <PermissionRoute module="hotels"><HotelPerformancePage /></PermissionRoute> },

      // User Management
      { path: "users", element: <PermissionRoute module="users"><UsersPage /></PermissionRoute> },
    ],
  },

  // Catch all
  { path: "/dashboard", element: <Navigate to="/" replace />, errorElement: <RouteErrorBoundary /> },
  { path: "*", element: <NotFound />, errorElement: <RouteErrorBoundary /> },
]);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ThemeProvider defaultTheme="system" storageKey="hotel-theme">
        <TooltipProvider>
          <CacheBuster />
          <Toaster />
          <Sonner />
          <ChunkErrorBoundary>
            <Suspense fallback={<RouteFallback />}>
              <RouterProvider router={router} />
            </Suspense>
          </ChunkErrorBoundary>
        </TooltipProvider>
      </ThemeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
