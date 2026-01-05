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
import { MainLayout } from "@/components/layout/MainLayout";
import Dashboard from "./pages/Dashboard";
import { InventoryDashboardPage } from "./pages/inventory/InventoryDashboardPage";
import { TransactionListPage } from "./pages/inventory/TransactionListPage";
import { InboundPage } from "./pages/inventory/InboundPage";
import { OutboundPage } from "./pages/inventory/OutboundPage";
import { AdjustmentListPage } from "./pages/inventory/AdjustmentListPage";
import { CreateAdjustmentPage } from "./pages/inventory/CreateAdjustmentPage";
import { CheckAdjustmentPage } from "./pages/inventory/CheckAdjustmentPage";
import { AdjustmentDetailPage } from "./pages/inventory/AdjustmentDetailPage";
import DistributionOrdersPage from "./pages/inventory/DistributionOrdersPage";
import DistributionOrderDetailPage from "./pages/inventory/DistributionOrderDetailPage";
import CreateDistributionPage from "./pages/inventory/CreateDistributionPage";
import { ItemsPage } from "./pages/items/ItemsPage";
import ItemDetailPage from "./pages/items/ItemDetailPage";
import { ItemFormPage } from "./pages/items/ItemFormPage";
import { CategoriesPage } from "./pages/items/CategoriesPage";
import { RoomsPage } from "./pages/rooms/RoomsPage";
import { RoomDetailPage } from "./pages/rooms/RoomDetailPage";
import { RoomFormPage } from "./pages/rooms/RoomFormPage";
import { RoomStandardsPage } from "./pages/rooms/RoomStandardsPage";
import { RoomCheckPage } from "./pages/rooms/RoomCheckPage";
import { BookingsPage } from "./pages/bookings/BookingsPage";
import { BookingDetailPage } from "./pages/bookings/BookingDetailPage";
import { LaundryDashboardPage } from "./pages/laundry/LaundryDashboardPage";
import { LaundryBatchesPage } from "./pages/laundry/LaundryBatchesPage";
import { CreateBatchPage } from "./pages/laundry/CreateBatchPage";
import { BatchDetailPage } from "./pages/laundry/BatchDetailPage";
import { ReceiveBatchPage } from "./pages/laundry/ReceiveBatchPage";
import { VendorListPage } from "./pages/laundry/VendorListPage";
import { VendorDetailPage } from "./pages/laundry/VendorDetailPage";
import { VendorFormPage } from "./pages/laundry/VendorFormPage";
import { SettingsPage } from "./pages/settings/SettingsPage";
import { SettingsLayout } from "./components/settings/SettingsLayout";
import { GeneralSettingsPage } from "./pages/settings/GeneralSettingsPage";
import HotelsManagementPage from "./pages/settings/HotelsManagementPage";
import { SuperAdminLayout } from './components/super-admin/SuperAdminLayout';
import { SuperAdminErrorBoundary } from './components/super-admin/ErrorBoundary';
import SubscriptionPage from "./pages/settings/SubscriptionPage";
import SubscriptionPaymentPage from "./pages/settings/SubscriptionPaymentPage";
import UsageDashboardPage from "./pages/settings/UsageDashboardPage";
import SystemSecurityPage from "./pages/settings/SystemSecurityPage";
import { NotificationSettingsPage } from "./pages/settings/NotificationSettingsPage";
import PushDevicesPage from "./pages/settings/PushDevicesPage";
import TelegramSettingsPage from "./pages/settings/TelegramSettingsPage";
import { BusinessConfigurationPage } from "./pages/settings/BusinessConfigurationPage";
import CategoryManagementPage from "./pages/settings/CategoryManagementPage";
import WorkflowsPage from "./pages/settings/WorkflowsPage";
import { SystemTestPage } from "./pages/settings/SystemTestPage";
import ChangePasswordPage from "./pages/settings/ChangePasswordPage";
import { ReportsPage } from "./pages/reports/ReportsPage";
import { ReportsDashboardPage } from "./pages/reports/ReportsDashboardPage";
import { InventoryReportPage } from "./pages/reports/InventoryReportPage";
import { FinancialReportPage } from "./pages/reports/FinancialReportPage";
import { LaundryReportPage } from "./pages/reports/LaundryReportPage";
import { OperationsReportPage } from "./pages/reports/OperationsReportPage";
import { RoomsReportPage } from "./pages/reports/RoomsReportPage";
import { MaintenanceReportPage } from "./pages/reports/MaintenanceReportPage";
import { OutboundReportPage } from "./pages/reports/OutboundReportPage";
import { RevenueReportPage } from "./pages/reports/RevenueReportPage";
import { DamagesReportPage } from "./pages/reports/DamagesReportPage";
import { HotelsPage } from "./pages/hotels/HotelsPage";
import HotelPerformancePage from "./pages/hotels/HotelPerformancePage";
import { VendorListPage as VendorManagementListPage } from "./pages/vendors/VendorListPage";
import { VendorDetailPage as VendorManagementDetailPage } from "./pages/vendors/VendorDetailPage";
import VendorManagementFormPage from "./pages/vendors/VendorFormPage";
import VendorComparisonPage from "./pages/vendors/VendorComparisonPage";
import { MorePage } from "./pages/mobile/MorePage";
import MaintenanceDashboard from "./pages/maintenance/MaintenanceDashboard";
import MaintenanceRequestList from "./pages/maintenance/MaintenanceRequestList";
import MaintenanceRequestForm from "./pages/maintenance/MaintenanceRequestForm";
import MaintenanceRequestDetail from "./pages/maintenance/MaintenanceRequestDetail";
import RecurringIssuesPage from "./pages/maintenance/RecurringIssuesPage";
import POListPage from "./pages/purchase-orders/POListPage";
import PODetailPage from "./pages/purchase-orders/PODetailPage";
import POFormPage from "./pages/purchase-orders/POFormPage";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import AuthCallback from "./pages/auth/AuthCallback";
import Onboarding from "./pages/auth/Onboarding";
import Unauthorized from "./pages/Unauthorized";
import NotFound from "./pages/NotFound";
import UsersPage from "./pages/users/UsersPage";
import ProfilePage from "./pages/profile/ProfilePage";
import IntegrationsPage from "./pages/settings/IntegrationsPage";
import { SuperAdminDashboard } from "./pages/admin/SuperAdminDashboard";
import { TenantsPage } from "./pages/admin/TenantsPage";
import { PromoCodesPage } from "./pages/admin/PromoCodesPage";
import { MarketingCampaignsPage } from "./pages/admin/MarketingCampaignsPage";
import { RenewalRemindersPage } from "./pages/admin/RenewalRemindersPage";
import { PricingPlansPage } from "./pages/admin/PricingPlansPage";
import { PaymentSettingsPage } from "./pages/admin/PaymentSettingsPage";
import NotificationHistoryPage from "./pages/NotificationHistoryPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const router = createBrowserRouter([
  // Public routes
  { path: "/auth/login", element: <Login /> },
  { path: "/auth/register", element: <Register /> },
  { path: "/auth/forgot-password", element: <ForgotPassword /> },
  { path: "/auth/reset-password", element: <ResetPassword /> },
  { path: "/auth/callback", element: <AuthCallback /> },
  { path: "/unauthorized", element: <Unauthorized /> },
  
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
      { path: "promo-codes", element: <PromoCodesPage /> },
      { path: "campaigns", element: <MarketingCampaignsPage /> },
      { path: "reminders", element: <RenewalRemindersPage /> },
      { path: "pricing", element: <PricingPlansPage /> },
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
      { 
        path: "inventory", 
        element: (
          <PermissionRoute module="inventory">
            <InventoryDashboardPage />
          </PermissionRoute>
        )
      },
      { 
        path: "inventory/transactions", 
        element: (
          <PermissionRoute module="inventory">
            <TransactionListPage />
          </PermissionRoute>
        )
      },
      { path: "inventory/inbound", element: <Navigate to="/inventory/transactions" replace /> },
      { 
        path: "inventory/inbound/new", 
        element: (
          <PermissionRoute module="inventory" action="create">
            <InboundPage />
          </PermissionRoute>
        )
      },
      { path: "inventory/outbound", element: <Navigate to="/inventory/transactions" replace /> },
      { 
        path: "inventory/outbound/new", 
        element: (
          <PermissionRoute module="inventory" action="create">
            <OutboundPage />
          </PermissionRoute>
        )
      },
      { 
        path: "inventory/adjustments", 
        element: (
          <PermissionRoute module="inventory">
            <AdjustmentListPage />
          </PermissionRoute>
        )
      },
      { 
        path: "inventory/adjustments/new", 
        element: (
          <PermissionRoute module="inventory" action="create">
            <CreateAdjustmentPage />
          </PermissionRoute>
        )
      },
      { 
        path: "inventory/adjustments/:id", 
        element: (
          <PermissionRoute module="inventory">
            <AdjustmentDetailPage />
          </PermissionRoute>
        )
      },
      { 
        path: "inventory/adjustments/:id/check", 
        element: (
          <PermissionRoute module="inventory" action="update">
            <CheckAdjustmentPage />
          </PermissionRoute>
        )
      },
      { 
        path: "inventory/distributions", 
        element: (
          <PermissionRoute module="inventory">
            <DistributionOrdersPage />
          </PermissionRoute>
        )
      },
      { 
        path: "inventory/distributions/new", 
        element: (
          <PermissionRoute module="inventory" action="create">
            <CreateDistributionPage />
          </PermissionRoute>
        )
      },
      { 
        path: "inventory/distributions/:id", 
        element: (
          <PermissionRoute module="inventory">
            <DistributionOrderDetailPage />
          </PermissionRoute>
        )
      },

      // Items - Permission Based
      { 
        path: "items", 
        element: (
          <PermissionRoute module="items">
            <ItemsPage />
          </PermissionRoute>
        )
      },
      { 
        path: "items/:id", 
        element: (
          <PermissionRoute module="items">
            <ItemDetailPage />
          </PermissionRoute>
        )
      },
      { 
        path: "items/new", 
        element: (
          <PermissionRoute module="items" action="create">
            <ItemFormPage />
          </PermissionRoute>
        )
      },
      { 
        path: "items/:id/edit", 
        element: (
          <PermissionRoute module="items" action="update">
            <ItemFormPage />
          </PermissionRoute>
        )
      },
      { 
        path: "items/categories", 
        element: (
          <PermissionRoute module="items">
            <CategoriesPage />
          </PermissionRoute>
        )
      },

      // Rooms - Permission Based
      { 
        path: "rooms", 
        element: (
          <PermissionRoute module="rooms">
            <RoomsPage />
          </PermissionRoute>
        )
      },
      { 
        path: "rooms/new", 
        element: (
          <PermissionRoute module="rooms" action="create">
            <RoomFormPage />
          </PermissionRoute>
        )
      },
      { 
        path: "rooms/:id", 
        element: (
          <PermissionRoute module="rooms" action="update">
            <RoomDetailPage />
          </PermissionRoute>
        )
      },
      { 
        path: "rooms/:id/edit", 
        element: (
          <PermissionRoute module="rooms" action="update">
            <RoomFormPage />
          </PermissionRoute>
        )
      },
      { 
        path: "rooms/:id/check", 
        element: (
          <PermissionRoute module="rooms" action="update">
            <RoomCheckPage />
          </PermissionRoute>
        )
      },
      { 
        path: "rooms/standards", 
        element: (
          <PermissionRoute module="rooms">
            <RoomStandardsPage />
          </PermissionRoute>
        )
      },

      // Bookings - Permission Based
      { 
        path: "bookings", 
        element: (
          <PermissionRoute module="rooms">
            <BookingsPage />
          </PermissionRoute>
        )
      },
      { 
        path: "bookings/:id", 
        element: (
          <PermissionRoute module="rooms">
            <BookingDetailPage />
          </PermissionRoute>
        )
      },

      { 
        path: "laundry", 
        element: (
          <PermissionRoute module="laundry">
            <LaundryDashboardPage />
          </PermissionRoute>
        )
      },
      { 
        path: "laundry/batches", 
        element: (
          <PermissionRoute module="laundry">
            <LaundryBatchesPage />
          </PermissionRoute>
        )
      },
      { 
        path: "laundry/batches/new", 
        element: (
          <PermissionRoute module="laundry" action="create">
            <CreateBatchPage />
          </PermissionRoute>
        )
      },
      { 
        path: "laundry/batches/:id", 
        element: (
          <PermissionRoute module="laundry">
            <BatchDetailPage />
          </PermissionRoute>
        )
      },
      { 
        path: "laundry/batches/:id/receive", 
        element: (
          <PermissionRoute module="laundry" action="update">
            <ReceiveBatchPage />
          </PermissionRoute>
        )
      },
      { 
        path: "laundry/vendors", 
        element: (
          <PermissionRoute module="laundry">
            <VendorListPage />
          </PermissionRoute>
        )
      },
      { 
        path: "laundry/vendors/new", 
        element: (
          <PermissionRoute module="laundry" action="create">
            <VendorFormPage />
          </PermissionRoute>
        )
      },
      { 
        path: "laundry/vendors/:id", 
        element: (
          <PermissionRoute module="laundry">
            <VendorDetailPage />
          </PermissionRoute>
        )
      },
      { 
        path: "laundry/vendors/:id/edit", 
        element: (
          <PermissionRoute module="laundry" action="update">
            <VendorFormPage />
          </PermissionRoute>
        )
      },

      // Settings - Permission Based
      {
        path: "settings",
        element: <SettingsLayout />,
        children: [
          { index: true, element: <Navigate to="/settings/general" replace /> },
          { 
            path: "general", 
            element: (
              <PermissionRoute module="settings">
                <GeneralSettingsPage />
              </PermissionRoute>
            )
          },
          { 
            path: "hotels", 
            element: (
              <PermissionRoute module="hotels">
                <HotelsManagementPage />
              </PermissionRoute>
            )
          },
          { 
            path: "categories", 
            element: (
              <PermissionRoute module="settings">
                <CategoryManagementPage />
              </PermissionRoute>
            )
          },
          { 
            path: "users", 
            element: (
              <PermissionRoute module="users">
                <UsersPage />
              </PermissionRoute>
            )
          },
          { path: "change-password", element: <ChangePasswordPage /> },
          { path: "subscription", element: <SubscriptionPage /> },
          { path: "subscription/pay/:invoiceId", element: <SubscriptionPaymentPage /> },
          { path: "usage", element: <UsageDashboardPage /> },
          { 
            path: "notifications", 
            element: (
              <PermissionRoute module="settings">
                <NotificationSettingsPage />
              </PermissionRoute>
            )
          },
{ 
            path: "notifications/devices", 
            element: (
              <PermissionRoute module="settings">
                <PushDevicesPage />
              </PermissionRoute>
            )
          },
          { 
            path: "telegram", 
            element: (
              <PermissionRoute module="settings">
                <TelegramSettingsPage />
              </PermissionRoute>
            )
          },
          { 
            path: "business",
            element: (
              <PermissionRoute module="settings">
                <BusinessConfigurationPage />
              </PermissionRoute>
            )
          },
          {
            path: "workflows",
            element: (
              <PermissionRoute module="settings" action="manage">
                <WorkflowsPage />
              </PermissionRoute>
            ),
          },
          { 
            path: "integrations", 
            element: (
              <PermissionRoute module="settings" action="manage">
                <IntegrationsPage />
              </PermissionRoute>
            )
          },
          { 
            path: "security", 
            element: (
              <PermissionRoute module="settings">
                <SystemSecurityPage />
              </PermissionRoute>
            )
          },
          { path: "system-test", element: <SystemTestPage /> },
        ],
      },

      // Profile - Always accessible
      { path: "profile", element: <ProfilePage /> },
      
      // Notifications History
      { path: "notifications", element: <NotificationHistoryPage /> },

      // Reports - Permission Based
      {
        path: "reports",
        element: (
          <PermissionRoute module="reports">
            <ReportsDashboardPage />
          </PermissionRoute>
        ),
      },
      {
        path: "reports/inventory",
        element: (
          <PermissionRoute module="reports">
            <InventoryReportPage />
          </PermissionRoute>
        ),
      },
      {
        path: "reports/financial",
        element: (
          <PermissionRoute module="reports">
            <FinancialReportPage />
          </PermissionRoute>
        ),
      },
      {
        path: "reports/laundry",
        element: (
          <PermissionRoute module="reports">
            <LaundryReportPage />
          </PermissionRoute>
        ),
      },
      {
        path: "reports/operations",
        element: (
          <PermissionRoute module="reports">
            <OperationsReportPage />
          </PermissionRoute>
        ),
      },
      {
        path: "reports/rooms",
        element: (
          <PermissionRoute module="reports">
            <RoomsReportPage />
          </PermissionRoute>
        ),
      },
      {
        path: "reports/maintenance",
        element: (
          <PermissionRoute module="reports">
            <MaintenanceReportPage />
          </PermissionRoute>
        ),
      },
      {
        path: "reports/outbound",
        element: (
          <PermissionRoute module="reports">
            <OutboundReportPage />
          </PermissionRoute>
        ),
      },
      {
        path: "reports/revenue",
        element: (
          <PermissionRoute module="reports">
            <RevenueReportPage />
          </PermissionRoute>
        ),
      },
      {
        path: "reports/damages",
        element: (
          <PermissionRoute module="reports">
            <DamagesReportPage />
          </PermissionRoute>
        ),
      },

      {
        path: "vendors",
        element: (
          <PermissionRoute module="vendors">
            <VendorManagementListPage />
          </PermissionRoute>
        ),
      },
      {
        path: "vendors/new",
        element: (
          <PermissionRoute module="vendors" action="create">
            <VendorManagementFormPage />
          </PermissionRoute>
        ),
      },
      {
        path: "vendors/:id",
        element: (
          <PermissionRoute module="vendors">
            <VendorManagementDetailPage />
          </PermissionRoute>
        ),
      },
      {
        path: "vendors/:id/edit",
        element: (
          <PermissionRoute module="vendors" action="update">
            <VendorManagementFormPage />
          </PermissionRoute>
        ),
      },
      {
        path: "vendors/compare",
        element: (
          <PermissionRoute module="vendors">
            <VendorComparisonPage />
          </PermissionRoute>
        ),
      },

      // Maintenance - Permission Based
      { 
        path: "maintenance", 
        element: (
          <PermissionRoute module="maintenance">
            <MaintenanceDashboard />
          </PermissionRoute>
        )
      },
      { 
        path: "maintenance/requests", 
        element: (
          <PermissionRoute module="maintenance">
            <MaintenanceRequestList />
          </PermissionRoute>
        )
      },
      { 
        path: "maintenance/requests/new", 
        element: (
          <PermissionRoute module="maintenance" action="create">
            <MaintenanceRequestForm />
          </PermissionRoute>
        )
      },
      { 
        path: "maintenance/requests/:id", 
        element: (
          <PermissionRoute module="maintenance">
            <MaintenanceRequestDetail />
          </PermissionRoute>
        )
      },
      { 
        path: "maintenance/requests/edit/:id", 
        element: (
          <PermissionRoute module="maintenance" action="update">
            <MaintenanceRequestForm />
          </PermissionRoute>
        )
      },
      { 
        path: "maintenance/recurring-issues", 
        element: (
          <PermissionRoute module="maintenance">
            <RecurringIssuesPage />
          </PermissionRoute>
        )
      },

      // Purchase Orders - Permission Based
      {
        path: "purchase-orders",
        element: (
          <PermissionRoute module="purchase_orders">
            <POListPage />
          </PermissionRoute>
        ),
      },
      {
        path: "purchase-orders/new",
        element: (
          <PermissionRoute module="purchase_orders" action="create">
            <POFormPage />
          </PermissionRoute>
        ),
      },
      {
        path: "purchase-orders/:id",
        element: (
          <PermissionRoute module="purchase_orders">
            <PODetailPage />
          </PermissionRoute>
        ),
      },

      // Hotels - Permission Based
      {
        path: "hotels",
        element: (
          <PermissionRoute module="hotels">
            <HotelsPage />
          </PermissionRoute>
        ),
      },
      {
        path: "hotels/performance",
        element: (
          <PermissionRoute module="hotels">
            <HotelPerformancePage />
          </PermissionRoute>
        ),
      },

      // User Management - Permission Based
      {
        path: "users",
        element: (
          <PermissionRoute module="users">
            <UsersPage />
          </PermissionRoute>
        ),
      },
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
          <Toaster />
          <Sonner />
          <RouterProvider router={router} />
        </TooltipProvider>
      </ThemeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
