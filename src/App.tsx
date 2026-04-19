import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { CacheBuster } from "@/components/pwa/CacheBuster";

import { AuthGuard } from "@/components/auth/AuthGuard";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { PermissionRoute } from "@/components/auth/PermissionRoute";
import { OnboardingGuard } from "@/components/auth/OnboardingGuard";
import { MainLayout } from "@/components/layout/MainLayout";
import { SuperAdminLayout } from './components/super-admin/SuperAdminLayout';
import { SuperAdminErrorBoundary } from './components/super-admin/ErrorBoundary';

// Helper: lazy-load named export as default
const lazyNamed = <T extends Record<string, any>>(
  loader: () => Promise<T>,
  name: keyof T
) => lazy(() => loader().then((m) => ({ default: m[name] })));

// === Lazy routes — code-split per page ===
const Dashboard = lazy(() => import("./pages/Dashboard"));
const LandingPage = lazy(() => import("./pages/LandingPage"));

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

// Bookings & Guests
const BookingsPage = lazyNamed(() => import("./pages/bookings/BookingsPage"), "BookingsPage");
const BookingDetailPage = lazyNamed(() => import("./pages/bookings/BookingDetailPage"), "BookingDetailPage");
const GuestsPage = lazy(() => import("./pages/guests/GuestsPage"));
const GuestDetailPage = lazy(() => import("./pages/guests/GuestDetailPage"));
const LostFoundPage = lazy(() => import("./pages/lost-found/LostFoundPage"));
const GuestInvoicesPage = lazy(() => import("./pages/invoices/GuestInvoicesPage"));

// Laundry
const LaundryDashboardPage = lazyNamed(() => import("./pages/laundry/LaundryDashboardPage"), "LaundryDashboardPage");
const LaundryBatchesPage = lazyNamed(() => import("./pages/laundry/LaundryBatchesPage"), "LaundryBatchesPage");
const CreateBatchPage = lazyNamed(() => import("./pages/laundry/CreateBatchPage"), "CreateBatchPage");
const BatchDetailPage = lazyNamed(() => import("./pages/laundry/BatchDetailPage"), "BatchDetailPage");
const ReceiveBatchPage = lazyNamed(() => import("./pages/laundry/ReceiveBatchPage"), "ReceiveBatchPage");
const VendorListPage = lazyNamed(() => import("./pages/laundry/VendorListPage"), "VendorListPage");
const VendorDetailPage = lazyNamed(() => import("./pages/laundry/VendorDetailPage"), "VendorDetailPage");
const VendorFormPage = lazyNamed(() => import("./pages/laundry/VendorFormPage"), "VendorFormPage");

// Settings
const GeneralSettingsPage = lazyNamed(() => import("./pages/settings/GeneralSettingsPage"), "GeneralSettingsPage");
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

// Reports
const ReportsDashboardPage = lazyNamed(() => import("./pages/reports/ReportsDashboardPage"), "ReportsDashboardPage");
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
const TenantApprovalPage = lazy(() => import("./pages/admin/TenantApprovalPage"));

// Other
const NotificationHistoryPage = lazy(() => import("./pages/NotificationHistoryPage"));
const HelpPage = lazy(() => import("./pages/HelpPage"));
const StaffManagementPage = lazy(() => import("./pages/staff/StaffManagementPage"));
const MyTasksPage = lazy(() => import("./pages/MyTasksPage"));
const PaymentQRPage = lazy(() => import("./pages/payment/PaymentQRPage"));
const ScanDocumentPage = lazy(() => import("./pages/scan/ScanDocumentPage"));
const HousekeepingStaffDashboard = lazy(() => import("./pages/HousekeepingStaffDashboard"));

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

  // Super Admin Routes
  {
    path: "/super-admin",
    element: (
      <SuperAdminErrorBoundary>
        <SuperAdminLayout />
      </SuperAdminErrorBoundary>
    ),
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
    ],
  },

  // Protected routes
  {
    path: "/",
    element: (
      <AuthGuard>
        <OnboardingGuard>
          <MainLayout />
        </OnboardingGuard>
      </AuthGuard>
    ),
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
      { path: "rooms/:id/check", element: <PermissionRoute module="rooms" action="update"><RoomCheckPage /></PermissionRoute> },
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
      { path: "settings/warehouses", element: <PermissionRoute module="inventory"><WarehouseListPage /></PermissionRoute> },
      { path: "settings/subscription", element: <RoleGuard allowedRoles={['super_admin', 'owner']}><SubscriptionPage /></RoleGuard> },
      { path: "settings/subscription/pay/:invoiceId", element: <RoleGuard allowedRoles={['super_admin', 'owner']}><SubscriptionPaymentPage /></RoleGuard> },
      { path: "settings/usage", element: <RoleGuard allowedRoles={['super_admin', 'owner']}><UsageDashboardPage /></RoleGuard> },
      { path: "settings/notifications", element: <PermissionRoute module="settings"><NotificationSettingsPage /></PermissionRoute> },
      { path: "settings/notifications/devices", element: <PermissionRoute module="settings"><PushDevicesPage /></PermissionRoute> },
      { path: "settings/telegram", element: <PermissionRoute module="settings"><TelegramSettingsPage /></PermissionRoute> },
      { path: "settings/business", element: <PermissionRoute module="settings"><BusinessConfigurationPage /></PermissionRoute> },
      { path: "settings/workflows", element: <PermissionRoute module="settings" action="manage"><WorkflowsPage /></PermissionRoute> },
      { path: "settings/pricing-rules", element: <PermissionRoute module="settings"><PricingRulesPage /></PermissionRoute> },
      { path: "settings/ai", element: <RoleGuard allowedRoles={['super_admin', 'owner']}><AISettingsPage /></RoleGuard> },

      // Profile
      { path: "profile", element: <ProfilePage /> },
      { path: "settings/profile", element: <ProfilePage /> },
      
      // Notifications History
      { path: "notifications", element: <NotificationHistoryPage /> },
      
      // Help
      { path: "help", element: <HelpPage /> },

      // Reports
      { path: "reports", element: <PermissionRoute module="reports"><ReportsDashboardPage /></PermissionRoute> },
      { path: "reports/inventory", element: <PermissionRoute module="reports"><InventoryReportPage /></PermissionRoute> },
      { path: "reports/financial", element: <PermissionRoute module="reports"><FinancialReportPage /></PermissionRoute> },
      { path: "reports/laundry", element: <PermissionRoute module="reports"><LaundryReportPage /></PermissionRoute> },
      { path: "reports/stock-audit", element: <PermissionRoute module="reports"><StockAuditReportPage /></PermissionRoute> },
      { path: "reports/operations", element: <PermissionRoute module="reports"><OperationsReportPage /></PermissionRoute> },
      { path: "reports/rooms", element: <PermissionRoute module="reports"><RoomsReportPage /></PermissionRoute> },
      { path: "reports/maintenance", element: <PermissionRoute module="reports"><MaintenanceReportPage /></PermissionRoute> },
      { path: "reports/outbound", element: <PermissionRoute module="reports"><OutboundReportPage /></PermissionRoute> },
      { path: "reports/revenue", element: <PermissionRoute module="reports"><RevenueReportPage /></PermissionRoute> },
      { path: "reports/damages", element: <PermissionRoute module="reports"><DamagesReportPage /></PermissionRoute> },

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
  { path: "*", element: <NotFound /> },
]);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ThemeProvider defaultTheme="system" storageKey="hotel-theme">
        <TooltipProvider>
          <CacheBuster />
          <Toaster />
          <Sonner />
          <Suspense fallback={<RouteFallback />}>
            <RouterProvider router={router} />
          </Suspense>
        </TooltipProvider>
      </ThemeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
