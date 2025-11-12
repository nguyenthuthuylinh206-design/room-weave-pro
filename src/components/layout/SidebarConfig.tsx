import { TFunction } from 'i18next'
import {
  LayoutDashboard,
  Package,
  Hotel,
  Wind,
  Warehouse,
  FileText,
  Settings,
  Users,
  Building2,
  ChevronDown,
  ChevronRight,
  Plus,
  List,
  Grid,
  ArrowDownToLine,
  ArrowUpFromLine,
  ClipboardCheck,
  ShoppingCart,
  GitCompare,
  Building,
  DollarSign,
  Wrench,
  AlertCircle,
  TrendingUp,
  Shield,
  FolderTree,
  Bell,
  Briefcase,
  Zap,
  Plug,
  Lock,
  TestTube2,
  Tag,
} from 'lucide-react'
import { AppRole } from '@/types/database.types'

interface NavItem {
  title: string
  titleKey?: string
  href?: string
  icon: React.ElementType
  badge?: string
  roles?: AppRole[]
  children?: Omit<NavItem, 'children'>[]
}

export const getSidebarNavigation = (t: TFunction): NavItem[] => [
  {
    title: t('common:navigation.dashboard'),
    href: '/',
    icon: LayoutDashboard,
    roles: ['owner', 'hotel_manager', 'department_manager', 'staff'],
  },
  {
    title: 'Super Admin',
    icon: Shield,
    roles: ['super_admin'],
    children: [
      {
        title: t('common:navigation.dashboard'),
        href: '/admin/dashboard',
        icon: LayoutDashboard,
      },
      {
        title: 'Tenants',
        href: '/admin/tenants',
        icon: Users,
      },
      {
        title: t('sidebar.superAdmin.promoCodes'),
        href: '/admin/promo-codes',
        icon: Tag,
      },
      {
        title: t('sidebar.superAdmin.campaigns'),
        href: '/admin/campaigns',
        icon: TrendingUp,
      },
      {
        title: t('sidebar.superAdmin.reminders'),
        href: '/admin/reminders',
        icon: Bell,
      },
      {
        title: 'Pricing Plans',
        href: '/admin/pricing',
        icon: DollarSign,
      },
    ],
  },
  {
    title: t('common:navigation.items'),
    icon: Package,
    roles: ['owner', 'hotel_manager', 'department_manager', 'staff'],
    children: [
      {
        title: t('sidebar.items.list'),
        href: '/items',
        icon: List,
      },
      {
        title: t('sidebar.items.categories'),
        href: '/items/categories',
        icon: Grid,
      },
      {
        title: t('sidebar.items.addNew'),
        href: '/items/new',
        icon: Plus,
      },
    ],
  },
  {
    title: t('common:navigation.rooms'),
    icon: Hotel,
    roles: ['owner', 'hotel_manager', 'department_manager', 'staff'],
    children: [
      {
        title: t('sidebar.rooms.list'),
        href: '/rooms',
        icon: List,
      },
      {
        title: t('sidebar.rooms.standards'),
        href: '/rooms/standards',
        icon: Settings,
      },
      {
        title: t('sidebar.rooms.addNew'),
        href: '/rooms/new',
        icon: Plus,
      },
    ],
  },
  {
    title: t('common:navigation.laundry'),
    icon: Wind,
    roles: ['owner', 'hotel_manager', 'department_manager', 'staff'],
    children: [
      {
        title: t('sidebar.laundry.overview'),
        href: '/laundry',
        icon: LayoutDashboard,
      },
      {
        title: t('sidebar.laundry.batches'),
        href: '/laundry/batches',
        icon: Package,
      },
      {
        title: t('sidebar.laundry.createBatch'),
        href: '/laundry/batches/new',
        icon: Plus,
      },
      {
        title: t('sidebar.laundry.vendors'),
        href: '/laundry/vendors',
        icon: Building2,
      },
      {
        title: t('sidebar.laundry.addVendor'),
        href: '/laundry/vendors/new',
        icon: Plus,
      },
    ],
  },
  {
    title: t('common:navigation.inventory'),
    icon: Warehouse,
    roles: ['owner', 'hotel_manager', 'department_manager', 'staff'],
    children: [
      {
        title: t('sidebar.inventory.dashboard'),
        href: '/inventory',
        icon: LayoutDashboard,
      },
      {
        title: t('sidebar.inventory.transactions'),
        href: '/inventory/transactions',
        icon: List,
      },
      {
        title: t('sidebar.inventory.inbound'),
        href: '/inventory/inbound/new',
        icon: ArrowDownToLine,
      },
      {
        title: t('sidebar.inventory.outbound'),
        href: '/inventory/outbound/new',
        icon: ArrowUpFromLine,
      },
      {
        title: t('sidebar.inventory.adjustment'),
        href: '/inventory/adjustments',
        icon: ClipboardCheck,
      },
    ],
  },
  {
    title: t('common:navigation.vendors'),
    icon: Building,
    roles: ['owner', 'hotel_manager'],
    children: [
      {
        title: t('sidebar.vendors.list'),
        href: '/vendors',
        icon: List,
      },
      {
        title: t('sidebar.vendors.addNew'),
        href: '/vendors/new',
        icon: Plus,
      },
      {
        title: t('sidebar.vendors.compare'),
        href: '/vendors/compare',
        icon: GitCompare,
      },
      {
        title: t('common:navigation.purchaseOrders'),
        href: '/purchase-orders',
        icon: ShoppingCart,
      },
      {
        title: t('sidebar.vendors.createOrder'),
        href: '/purchase-orders/new',
        icon: Plus,
      },
    ],
  },
  {
    title: t('common:navigation.maintenance'),
    icon: Wrench,
    roles: ['owner', 'hotel_manager', 'department_manager', 'staff'],
    children: [
      {
        title: t('common:navigation.dashboard'),
        href: '/maintenance',
        icon: LayoutDashboard,
      },
      {
        title: t('sidebar.maintenance.requests'),
        href: '/maintenance/requests',
        icon: AlertCircle,
      },
      {
        title: t('sidebar.maintenance.recurringIssues'),
        href: '/maintenance/recurring-issues',
        icon: TrendingUp,
      },
    ],
  },
  {
    title: t('common:navigation.reports'),
    icon: FileText,
    roles: ['owner', 'hotel_manager'],
    children: [
      {
        title: t('common:navigation.dashboard'),
        href: '/reports',
        icon: LayoutDashboard,
      },
      {
        title: t('sidebar.reports.inventory'),
        href: '/reports/inventory',
        icon: Package,
      },
      {
        title: t('sidebar.reports.financial'),
        href: '/reports/financial',
        icon: DollarSign,
      },
      {
        title: t('sidebar.reports.laundry'),
        href: '/reports/laundry',
        icon: Wind,
      },
    ],
  },
  {
    title: t('common:navigation.users'),
    href: '/users',
    icon: Users,
    roles: ['owner'],
  },
  {
    title: t('common:navigation.hotels'),
    href: '/hotels',
    icon: Building2,
    roles: ['owner'],
  },
  {
    title: t('common:navigation.settings'),
    icon: Settings,
    roles: ['owner', 'hotel_manager', 'department_manager', 'staff'],
    children: [
      {
        title: t('sidebar.settings.general'),
        href: '/settings/general',
        icon: LayoutDashboard,
      },
      {
        title: t('sidebar.settings.hotels'),
        href: '/settings/hotels',
        icon: Building2,
        roles: ['owner'],
      },
      {
        title: t('sidebar.settings.categories'),
        href: '/settings/categories',
        icon: FolderTree,
      },
      {
        title: t('sidebar.settings.users'),
        href: '/settings/users',
        icon: Users,
        roles: ['owner'],
      },
      {
        title: t('sidebar.settings.rolesPermissions'),
        href: '/settings/roles',
        icon: Shield,
        roles: ['owner'],
      },
      {
        title: t('sidebar.settings.notifications'),
        href: '/settings/notifications',
        icon: Bell,
      },
      {
        title: t('sidebar.settings.business'),
        href: '/settings/business',
        icon: Briefcase,
      },
      {
        title: t('sidebar.settings.workflows'),
        href: '/settings/workflows',
        icon: Zap,
        roles: ['owner', 'hotel_manager'],
      },
      {
        title: t('sidebar.settings.integrations'),
        href: '/settings/integrations',
        icon: Plug,
        roles: ['owner'],
      },
      {
        title: t('sidebar.settings.security'),
        href: '/settings/security',
        icon: Lock,
        roles: ['owner'],
      },
      {
        title: t('sidebar.settings.systemTest'),
        href: '/settings/system-test',
        icon: TestTube2,
        roles: ['owner'],
      },
    ],
  },
]

export { ChevronDown, ChevronRight, Building2 }
