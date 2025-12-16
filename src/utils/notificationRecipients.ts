import { supabase } from '@/integrations/supabase/client';

export type RecipientRole = 'owner' | 'manager' | 'staff' | 'all_hotel_staff';

interface User {
  id: string;
  full_name: string;
  email: string;
}

// Get managers of a specific hotel
export async function getManagersOfHotel(hotelId: string): Promise<User[]> {
  const { data, error } = await supabase
    .from('user_hotels')
    .select(`
      user_id,
      users!inner(id, full_name, email)
    `)
    .eq('hotel_id', hotelId)
    .eq('users.user_level_code', 'manager');

  if (error) {
    console.error('Error fetching hotel managers:', error);
    return [];
  }

  return data?.map(item => ({
    id: (item.users as any).id,
    full_name: (item.users as any).full_name,
    email: (item.users as any).email,
  })) || [];
}

// Get owner of a tenant
export async function getOwnerOfTenant(tenantId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, email')
    .eq('tenant_id', tenantId)
    .eq('user_level_code', 'owner')
    .eq('is_primary_owner', true)
    .single();

  if (error) {
    console.error('Error fetching tenant owner:', error);
    return null;
  }

  return data;
}

// Get users by role within a tenant
export async function getUsersByRole(
  tenantId: string, 
  roles: string[]
): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, email')
    .eq('tenant_id', tenantId)
    .in('user_level_code', roles);

  if (error) {
    console.error('Error fetching users by role:', error);
    return [];
  }

  return data || [];
}

// Get the manager that a user reports to
export async function getUserReportsTo(userId: string): Promise<User | null> {
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('reports_to')
    .eq('id', userId)
    .single();

  if (userError || !userData?.reports_to) {
    return null;
  }

  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, email')
    .eq('id', userData.reports_to)
    .single();

  if (error) {
    console.error('Error fetching reports_to user:', error);
    return null;
  }

  return data;
}

// Get all staff assigned to a hotel
export async function getHotelStaff(hotelId: string): Promise<User[]> {
  const { data, error } = await supabase
    .from('user_hotels')
    .select(`
      user_id,
      users!inner(id, full_name, email)
    `)
    .eq('hotel_id', hotelId);

  if (error) {
    console.error('Error fetching hotel staff:', error);
    return [];
  }

  return data?.map(item => ({
    id: (item.users as any).id,
    full_name: (item.users as any).full_name,
    email: (item.users as any).email,
  })) || [];
}

// Get notification recipients based on roles and context
export async function getNotificationRecipients({
  tenantId,
  hotelId,
  targetRoles,
  excludeUserId,
}: {
  tenantId: string;
  hotelId?: string;
  targetRoles: RecipientRole[];
  excludeUserId?: string;
}): Promise<User[]> {
  const recipients: User[] = [];
  const addedIds = new Set<string>();

  for (const role of targetRoles) {
    let users: User[] = [];

    switch (role) {
      case 'owner':
        const owner = await getOwnerOfTenant(tenantId);
        if (owner) users = [owner];
        break;

      case 'manager':
        if (hotelId) {
          users = await getManagersOfHotel(hotelId);
        } else {
          users = await getUsersByRole(tenantId, ['manager']);
        }
        break;

      case 'staff':
        if (hotelId) {
          users = await getHotelStaff(hotelId);
        }
        break;

      case 'all_hotel_staff':
        if (hotelId) {
          users = await getHotelStaff(hotelId);
        }
        break;
    }

    for (const user of users) {
      if (!addedIds.has(user.id) && user.id !== excludeUserId) {
        addedIds.add(user.id);
        recipients.push(user);
      }
    }
  }

  return recipients;
}

// Get a single user by ID
export async function getUserById(userId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, email')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching user:', error);
    return null;
  }

  return data;
}
