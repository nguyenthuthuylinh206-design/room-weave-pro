import { AppRole } from '@/types/database.types'

export const APP_NAME = 'Hotel Asset Manager'
export const APP_VERSION = '1.0.0'

// Role definitions
export const ROLES: Record<AppRole, { label: string; description: string }> = {
  super_admin: {
    label: 'Super Admin',
    description: 'Full system access across all tenants',
  },
  owner: {
    label: 'Owner',
    description: 'Full access to tenant and all hotels',
  },
  hotel_manager: {
    label: 'Hotel Manager',
    description: 'Manage specific hotel operations',
  },
  department_manager: {
    label: 'Department Manager',
    description: 'Manage specific department',
  },
  staff: {
    label: 'Staff',
    description: 'Basic operational access',
  },
}

// Department definitions
export const DEPARTMENTS = {
  housekeeping: 'Housekeeping',
  laundry: 'Laundry',
  inventory: 'Inventory',
  maintenance: 'Maintenance',
}

// Navigation items
export const NAV_ITEMS = [
  {
    title: 'Dashboard',
    href: '/',
    icon: 'LayoutDashboard',
    roles: ['super_admin', 'owner', 'hotel_manager', 'department_manager', 'staff'],
  },
  {
    title: 'Inventory',
    href: '/inventory',
    icon: 'Package',
    roles: ['super_admin', 'owner', 'hotel_manager', 'department_manager', 'staff'],
  },
  {
    title: 'Rooms',
    href: '/rooms',
    icon: 'Bed',
    roles: ['super_admin', 'owner', 'hotel_manager', 'department_manager'],
  },
  {
    title: 'Laundry',
    href: '/laundry',
    icon: 'Shirt',
    roles: ['super_admin', 'owner', 'hotel_manager', 'department_manager'],
  },
  {
    title: 'Maintenance',
    href: '/maintenance',
    icon: 'Wrench',
    roles: ['super_admin', 'owner', 'hotel_manager', 'department_manager'],
  },
  {
    title: 'Reports',
    href: '/reports',
    icon: 'BarChart3',
    roles: ['super_admin', 'owner', 'hotel_manager'],
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: 'Settings',
    roles: ['super_admin', 'owner', 'hotel_manager'],
  },
]

// Status badges
export const STATUS_STYLES = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  suspended: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
}
