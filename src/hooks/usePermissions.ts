import { useUser } from './useUser'
import { AppRole } from '@/types/database.types'

interface Permissions {
  // Users
  canManageUsers: boolean
  canViewUsers: boolean
  
  // Hotels
  canManageHotels: boolean
  canViewHotels: boolean
  
  // Items
  canManageItems: boolean
  canViewItems: boolean
  canExportItems: boolean
  
  // Rooms
  canManageRooms: boolean
  canCheckRooms: boolean
  
  // Laundry
  canManageLaundry: boolean
  canReceiveLaundry: boolean
  
  // Inventory
  canManageInventory: boolean
  canAdjustInventory: boolean
  
  // Reports
  canViewReports: boolean
  canExportReports: boolean
  
  // Settings
  canManageSettings: boolean
}

const rolePermissions: Record<AppRole, Permissions> = {
  super_admin: {
    canManageUsers: true,
    canViewUsers: true,
    canManageHotels: true,
    canViewHotels: true,
    canManageItems: true,
    canViewItems: true,
    canExportItems: true,
    canManageRooms: true,
    canCheckRooms: true,
    canManageLaundry: true,
    canReceiveLaundry: true,
    canManageInventory: true,
    canAdjustInventory: true,
    canViewReports: true,
    canExportReports: true,
    canManageSettings: true,
  },
  owner: {
    canManageUsers: true,
    canViewUsers: true,
    canManageHotels: true,
    canViewHotels: true,
    canManageItems: true,
    canViewItems: true,
    canExportItems: true,
    canManageRooms: true,
    canCheckRooms: true,
    canManageLaundry: true,
    canReceiveLaundry: true,
    canManageInventory: true,
    canAdjustInventory: true,
    canViewReports: true,
    canExportReports: true,
    canManageSettings: true,
  },
  hotel_manager: {
    canManageUsers: false,
    canViewUsers: true,
    canManageHotels: false,
    canViewHotels: true,
    canManageItems: true,
    canViewItems: true,
    canExportItems: true,
    canManageRooms: true,
    canCheckRooms: true,
    canManageLaundry: true,
    canReceiveLaundry: true,
    canManageInventory: true,
    canAdjustInventory: true,
    canViewReports: true,
    canExportReports: true,
    canManageSettings: false,
  },
  department_manager: {
    canManageUsers: false,
    canViewUsers: true,
    canManageHotels: false,
    canViewHotels: true,
    canManageItems: true,
    canViewItems: true,
    canExportItems: false,
    canManageRooms: true,
    canCheckRooms: true,
    canManageLaundry: true,
    canReceiveLaundry: true,
    canManageInventory: true,
    canAdjustInventory: false,
    canViewReports: true,
    canExportReports: false,
    canManageSettings: false,
  },
  staff: {
    canManageUsers: false,
    canViewUsers: false,
    canManageHotels: false,
    canViewHotels: true,
    canManageItems: false,
    canViewItems: true,
    canExportItems: false,
    canManageRooms: false,
    canCheckRooms: true,
    canManageLaundry: false,
    canReceiveLaundry: false,
    canManageInventory: false,
    canAdjustInventory: false,
    canViewReports: false,
    canExportReports: false,
    canManageSettings: false,
  },
}

export const usePermissions = (): Permissions => {
  const { role } = useUser()
  
  if (!role) {
    // Default: no permissions
    return Object.keys(rolePermissions.staff).reduce((acc, key) => {
      acc[key as keyof Permissions] = false
      return acc
    }, {} as Permissions)
  }

  return rolePermissions[role] || rolePermissions.staff
}
