import { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { HotelProvider } from "@/contexts/HotelContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import "@/i18n/config";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { RoleGuard } from "@/components/auth/RoleGuard";
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
import { ItemsPage } from "./pages/items/ItemsPage";
import ItemDetailPage from "./pages/items/ItemDetailPage";
import { ItemFormPage } from "./pages/items/ItemFormPage";
import { CategoriesPage } from "./pages/items/CategoriesPage";
import { RoomsPage } from "./pages/rooms/RoomsPage";
import { RoomDetailPage } from "./pages/rooms/RoomDetailPage";
import { RoomFormPage } from "./pages/rooms/RoomFormPage";
import { RoomStandardsPage } from "./pages/rooms/RoomStandardsPage";
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
import UsageDashboardPage from "./pages/settings/UsageDashboardPage";
import SystemSecurityPage from "./pages/settings/SystemSecurityPage";
import { NotificationSettingsPage } from "./pages/settings/NotificationSettingsPage";
import { BusinessConfigurationPage } from "./pages/settings/BusinessConfigurationPage";
import CategoryManagementPage from "./pages/settings/CategoryManagementPage";
import WorkflowsPage from "./pages/settings/WorkflowsPage";
import { SystemTestPage } from "./pages/settings/SystemTestPage";
import { ReportsPage } from "./pages/reports/ReportsPage";
import { ReportsDashboardPage } from "./pages/reports/ReportsDashboardPage";
import { InventoryReportPage } from "./pages/reports/InventoryReportPage";
import { FinancialReportPage } from "./pages/reports/FinancialReportPage";
import { LaundryReportPage } from "./pages/reports/LaundryReportPage";
import { HotelsPage } from "./pages/hotels/HotelsPage";
import HotelPerformancePage from "./pages/hotels/HotelPerformancePage";
import { VendorListPage as VendorManagementListPage } from "./pages/vendors/VendorListPage";
import { VendorDetailPage as VendorManagementDetailPage } from "./pages/vendors/VendorDetailPage";
import VendorManagementFormPage from "./pages/vendors/VendorFormPage";
import VendorComparisonPage from "./pages/vendors/VendorComparisonPage";
import MaintenanceDashboard from "./pages/maintenance/MaintenanceDashboard";
import MaintenanceRequestList from "./pages/maintenance/MaintenanceRequestList";
import MaintenanceRequestForm from "./pages/maintenance/MaintenanceRequestForm";
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
import RolesManagementPage from "./pages/settings/RolesManagementPage";
import PermissionManagementPage from "./pages/settings/PermissionManagementPage";
import IntegrationsPage from "./pages/settings/IntegrationsPage";
import { SuperAdminDashboard } from "./pages/admin/SuperAdminDashboard";
import { TenantsPage } from "./pages/admin/TenantsPage";
import { PromoCodesPage } from "./pages/admin/PromoCodesPage";
import { MarketingCampaignsPage } from "./pages/admin/MarketingCampaignsPage";
import { RenewalRemindersPage } from "./pages/admin/RenewalRemindersPage";
import { PricingPlansPage } from "./pages/admin/PricingPlansPage";

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
      { index: true, element: <Dashboard /> },
      
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
        path: "admin/pricing",
        element: (
          <RoleGuard allowedRoles={['super_admin']}>
            <PricingPlansPage />
          </RoleGuard>
        ),
      },
      
      { path: "inventory", element: <InventoryDashboardPage /> },
      { path: "inventory/transactions", element: <TransactionListPage /> },
      { path: "inventory/inbound/new", element: <InboundPage /> },
      { path: "inventory/outbound/new", element: <OutboundPage /> },
      { path: "inventory/adjustments", element: <AdjustmentListPage /> },
      { path: "inventory/adjustments/new", element: <CreateAdjustmentPage /> },
      { path: "inventory/adjustments/:id", element: <AdjustmentDetailPage /> },
      { path: "inventory/adjustments/:id/check", element: <CheckAdjustmentPage /> },

      // Items
      { path: "items", element: <ItemsPage /> },
      { path: "items/:id", element: <ItemDetailPage /> },
      { path: "items/new", element: <ItemFormPage /> },
      { path: "items/:id/edit", element: <ItemFormPage /> },
      { path: "items/categories", element: <CategoriesPage /> },

      // Rooms
      { path: "rooms", element: <RoomsPage /> },
      { path: "rooms/new", element: <RoomFormPage /> },
      { path: "rooms/:id", element: <RoomDetailPage /> },
      { path: "rooms/:id/edit", element: <RoomFormPage /> },
      { path: "rooms/standards", element: <RoomStandardsPage /> },

      // Laundry
      { path: "laundry", element: <LaundryDashboardPage /> },
      { path: "laundry/batches", element: <LaundryBatchesPage /> },
      { path: "laundry/batches/new", element: <CreateBatchPage /> },
      { path: "laundry/batches/:id", element: <BatchDetailPage /> },
      { path: "laundry/batches/:id/receive", element: <ReceiveBatchPage /> },
      { path: "laundry/vendors", element: <VendorListPage /> },
      { path: "laundry/vendors/new", element: <VendorFormPage /> },
      { path: "laundry/vendors/:id", element: <VendorDetailPage /> },
      { path: "laundry/vendors/:id/edit", element: <VendorFormPage /> },

      // Settings
      {
        path: "settings",
        element: <SettingsLayout />,
        children: [
          { index: true, element: <Navigate to="/settings/general" replace /> },
          { path: "general", element: <GeneralSettingsPage /> },
          { path: "hotels", element: <HotelsManagementPage /> },
          { path: "categories", element: <CategoryManagementPage /> },
          { path: "users", element: <UsersPage /> },
          { path: "subscription", element: <SubscriptionPage /> },
          { path: "usage", element: <UsageDashboardPage /> },
          { path: "notifications", element: <NotificationSettingsPage /> },
          { 
            path: "roles", 
            element: (
              <RoleGuard allowedRoles={['owner', 'super_admin']}>
                <RolesManagementPage />
              </RoleGuard>
            )
          },
          { 
            path: "permissions", 
            element: (
              <RoleGuard allowedRoles={['owner', 'super_admin']}>
                <PermissionManagementPage />
              </RoleGuard>
            )
          },
          { path: "business", element: <BusinessConfigurationPage /> },
          {
            path: "workflows",
            element: (
              <RoleGuard allowedRoles={['owner', 'hotel_manager', 'super_admin']}>
                <WorkflowsPage />
              </RoleGuard>
            ),
          },
          { 
            path: "integrations", 
            element: (
              <RoleGuard allowedRoles={['owner', 'super_admin']}>
                <IntegrationsPage />
              </RoleGuard>
            )
          },
          { path: "security", element: <SystemSecurityPage /> },
          { path: "system-test", element: <SystemTestPage /> },
        ],
      },

      // Profile
      { path: "profile", element: <ProfilePage /> },

      // Reports - Owner, Hotel Manager & Super Admin only
      {
        path: "reports",
        element: (
          <RoleGuard allowedRoles={['owner', 'hotel_manager', 'super_admin']}>
            <ReportsDashboardPage />
          </RoleGuard>
        ),
      },
      {
        path: "reports/inventory",
        element: (
          <RoleGuard allowedRoles={['owner', 'hotel_manager', 'super_admin']}>
            <InventoryReportPage />
          </RoleGuard>
        ),
      },
      {
        path: "reports/financial",
        element: (
          <RoleGuard allowedRoles={['owner', 'hotel_manager', 'super_admin']}>
            <FinancialReportPage />
          </RoleGuard>
        ),
      },
      {
        path: "reports/laundry",
        element: (
          <RoleGuard allowedRoles={['owner', 'hotel_manager', 'super_admin']}>
            <LaundryReportPage />
          </RoleGuard>
        ),
      },

      // Vendor Management - Owner & Manager
      {
        path: "vendors",
        element: (
          <RoleGuard allowedRoles={['owner', 'hotel_manager', 'super_admin']}>
            <VendorManagementListPage />
          </RoleGuard>
        ),
      },
      {
        path: "vendors/new",
        element: (
          <RoleGuard allowedRoles={['owner', 'hotel_manager', 'super_admin']}>
            <VendorManagementFormPage />
          </RoleGuard>
        ),
      },
      {
        path: "vendors/:id",
        element: (
          <RoleGuard allowedRoles={['owner', 'hotel_manager', 'super_admin']}>
            <VendorManagementDetailPage />
          </RoleGuard>
        ),
      },
      {
        path: "vendors/:id/edit",
        element: (
          <RoleGuard allowedRoles={['owner', 'hotel_manager', 'super_admin']}>
            <VendorManagementFormPage />
          </RoleGuard>
        ),
      },
      {
        path: "vendors/compare",
        element: (
          <RoleGuard allowedRoles={['owner', 'hotel_manager', 'super_admin']}>
            <VendorComparisonPage />
          </RoleGuard>
        ),
      },

      // Maintenance
      { path: "maintenance", element: <MaintenanceDashboard /> },
      { path: "maintenance/requests", element: <MaintenanceRequestList /> },
      { path: "maintenance/requests/new", element: <MaintenanceRequestForm /> },
      { path: "maintenance/recurring-issues", element: <RecurringIssuesPage /> },

      // Purchase Orders - Owner & Manager
      {
        path: "purchase-orders",
        element: (
          <RoleGuard allowedRoles={['owner', 'hotel_manager', 'super_admin']}>
            <POListPage />
          </RoleGuard>
        ),
      },
      {
        path: "purchase-orders/new",
        element: (
          <RoleGuard allowedRoles={['owner', 'hotel_manager', 'super_admin']}>
            <POFormPage />
          </RoleGuard>
        ),
      },
      {
        path: "purchase-orders/:id",
        element: (
          <RoleGuard allowedRoles={['owner', 'hotel_manager', 'super_admin']}>
            <PODetailPage />
          </RoleGuard>
        ),
      },

      // Hotels - Owner & Super Admin only
      {
        path: "hotels",
        element: (
          <RoleGuard allowedRoles={['owner', 'super_admin']}>
            <HotelsPage />
          </RoleGuard>
        ),
      },
      {
        path: "hotels/performance",
        element: (
          <RoleGuard allowedRoles={['owner', 'super_admin']}>
            <HotelPerformancePage />
          </RoleGuard>
        ),
      },

      // User Management - Owner & Super Admin only
      {
        path: "users",
        element: (
          <RoleGuard allowedRoles={['owner', 'super_admin']}>
            <UsersPage />
          </RoleGuard>
        ),
      },
    ],
  },

  // Catch all
  { path: "*", element: <NotFound /> },
]);

function LoadingFallback() {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <LoadingSpinner size="lg" />
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <Suspense fallback={<LoadingFallback />}>
      <LanguageProvider>
        <ThemeProvider defaultTheme="system" storageKey="hotel-theme">
          <HotelProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <RouterProvider router={router} />
            </TooltipProvider>
          </HotelProvider>
        </ThemeProvider>
      </LanguageProvider>
    </Suspense>
  </QueryClientProvider>
);

export default App;
