import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { RoleGuard } from "@/components/auth/RoleGuard";
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
import { RoomsPage } from "./pages/rooms/RoomsPage";
import { RoomDetailPage } from "./pages/rooms/RoomDetailPage";
import { ItemFormPage } from "./pages/items/ItemFormPage";
import { CategoriesPage } from "./pages/items/CategoriesPage";
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
import { ReportsPage } from "./pages/reports/ReportsPage";
import { ReportsDashboardPage } from "./pages/reports/ReportsDashboardPage";
import { InventoryReportPage } from "./pages/reports/InventoryReportPage";
import { FinancialReportPage } from "./pages/reports/FinancialReportPage";
import { LaundryReportPage } from "./pages/reports/LaundryReportPage";
import { HotelsPage } from "./pages/hotels/HotelsPage";
import { VendorListPage as VendorManagementListPage } from "./pages/vendors/VendorListPage";
import { VendorDetailPage as VendorManagementDetailPage } from "./pages/vendors/VendorDetailPage";
import VendorManagementFormPage from "./pages/vendors/VendorFormPage";
import VendorComparisonPage from "./pages/vendors/VendorComparisonPage";
import POListPage from "./pages/purchase-orders/POListPage";
import PODetailPage from "./pages/purchase-orders/PODetailPage";
import POFormPage from "./pages/purchase-orders/POFormPage";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import Unauthorized from "./pages/Unauthorized";
import NotFound from "./pages/NotFound";
import UsersPage from "./pages/users/UsersPage";
import ProfilePage from "./pages/profile/ProfilePage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system" storageKey="hotel-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/auth/login" element={<Login />} />
            <Route path="/auth/register" element={<Register />} />
            <Route path="/auth/forgot-password" element={<ForgotPassword />} />
            <Route path="/auth/reset-password" element={<ResetPassword />} />
            <Route path="/unauthorized" element={<Unauthorized />} />

            {/* Protected routes */}
            <Route
              element={
                <AuthGuard>
                  <MainLayout />
                </AuthGuard>
              }
            >
              <Route path="/" element={<Dashboard />} />
              <Route path="/inventory" element={<InventoryDashboardPage />} />
              <Route path="/inventory/transactions" element={<TransactionListPage />} />
              <Route path="/inventory/inbound/new" element={<InboundPage />} />
              <Route path="/inventory/outbound/new" element={<OutboundPage />} />
              <Route path="/inventory/adjustments" element={<AdjustmentListPage />} />
              <Route path="/inventory/adjustments/new" element={<CreateAdjustmentPage />} />
              <Route path="/inventory/adjustments/:id" element={<AdjustmentDetailPage />} />
              <Route path="/inventory/adjustments/:id/check" element={<CheckAdjustmentPage />} />
              
              {/* Items */}
              <Route path="/items" element={<ItemsPage />} />
              <Route path="/items/new" element={<ItemFormPage />} />
              <Route path="/items/:id/edit" element={<ItemFormPage />} />
              <Route path="/items/categories" element={<CategoriesPage />} />
              
              {/* Rooms */}
              <Route path="/rooms" element={<RoomsPage />} />
              <Route path="/rooms/new" element={<RoomFormPage />} />
              <Route path="/rooms/:id" element={<RoomDetailPage />} />
              <Route path="/rooms/:id/edit" element={<RoomFormPage />} />
              <Route path="/rooms/standards" element={<RoomStandardsPage />} />
              
              {/* Laundry */}
              <Route path="/laundry" element={<LaundryDashboardPage />} />
              <Route path="/laundry/batches" element={<LaundryBatchesPage />} />
              <Route path="/laundry/batches/new" element={<CreateBatchPage />} />
              <Route path="/laundry/batches/:id" element={<BatchDetailPage />} />
              <Route path="/laundry/batches/:id/receive" element={<ReceiveBatchPage />} />
              <Route path="/laundry/vendors" element={<VendorListPage />} />
              <Route path="/laundry/vendors/new" element={<VendorFormPage />} />
              <Route path="/laundry/vendors/:id" element={<VendorDetailPage />} />
              <Route path="/laundry/vendors/:id/edit" element={<VendorFormPage />} />
              
              {/* Settings */}
              <Route path="/settings" element={<SettingsPage />} />
              
              {/* Profile */}
              <Route path="/profile" element={<ProfilePage />} />
              
              {/* Reports - Owner, Hotel Manager & Super Admin only */}
              <Route
                path="/reports"
                element={
                  <RoleGuard allowedRoles={['owner', 'hotel_manager', 'super_admin']}>
                    <ReportsDashboardPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/reports/inventory"
                element={
                  <RoleGuard allowedRoles={['owner', 'hotel_manager', 'super_admin']}>
                    <InventoryReportPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/reports/financial"
                element={
                  <RoleGuard allowedRoles={['owner', 'hotel_manager', 'super_admin']}>
                    <FinancialReportPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/reports/laundry"
                element={
                  <RoleGuard allowedRoles={['owner', 'hotel_manager', 'super_admin']}>
                    <LaundryReportPage />
                  </RoleGuard>
                }
              />
              
              {/* Vendor Management - Owner & Manager */}
              <Route
                path="/vendors"
                element={
                  <RoleGuard allowedRoles={['owner', 'hotel_manager', 'super_admin']}>
                    <VendorManagementListPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/vendors/new"
                element={
                  <RoleGuard allowedRoles={['owner', 'hotel_manager', 'super_admin']}>
                    <VendorManagementFormPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/vendors/:id"
                element={
                  <RoleGuard allowedRoles={['owner', 'hotel_manager', 'super_admin']}>
                    <VendorManagementDetailPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/vendors/:id/edit"
                element={
                  <RoleGuard allowedRoles={['owner', 'hotel_manager', 'super_admin']}>
                    <VendorManagementFormPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/vendors/compare"
                element={
                  <RoleGuard allowedRoles={['owner', 'hotel_manager', 'super_admin']}>
                    <VendorComparisonPage />
                  </RoleGuard>
                }
              />
              
              {/* Purchase Orders - Owner & Manager */}
              <Route
                path="/purchase-orders"
                element={
                  <RoleGuard allowedRoles={['owner', 'hotel_manager', 'super_admin']}>
                    <POListPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/purchase-orders/new"
                element={
                  <RoleGuard allowedRoles={['owner', 'hotel_manager', 'super_admin']}>
                    <POFormPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/purchase-orders/:id"
                element={
                  <RoleGuard allowedRoles={['owner', 'hotel_manager', 'super_admin']}>
                    <PODetailPage />
                  </RoleGuard>
                }
              />
              
              {/* Hotels - Owner & Super Admin only */}
              <Route
                path="/hotels"
                element={
                  <RoleGuard allowedRoles={['owner', 'super_admin']}>
                    <HotelsPage />
                  </RoleGuard>
                }
              />
              
              {/* User Management - Owner & Super Admin only */}
              <Route
                path="/users"
                element={
                  <RoleGuard allowedRoles={['owner', 'super_admin']}>
                    <UsersPage />
                  </RoleGuard>
                }
              />
            </Route>

            {/* Catch all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
