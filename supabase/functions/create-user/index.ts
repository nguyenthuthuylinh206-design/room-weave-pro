import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Generate random password
function generatePassword(length: number = 12): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const numbers = '0123456789'
  const symbols = '!@#$%^&*'
  const allChars = uppercase + lowercase + numbers + symbols
  
  let password = ''
  // Ensure at least one of each type
  password += uppercase[Math.floor(Math.random() * uppercase.length)]
  password += lowercase[Math.floor(Math.random() * lowercase.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  password += symbols[Math.floor(Math.random() * symbols.length)]
  
  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)]
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('')
}

interface CreateUserRequest {
  email: string
  fullName: string
  password: string
  tenantId: string
  userLevelCode: 'tenant_owner' | 'manager' | 'staff'
  hotelId?: string
  positionId?: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    // Create Supabase admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Verify the user making the request
    const token = authHeader.replace('Bearer ', '')
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !requestingUser) {
      console.error('Auth error:', authError)
      throw new Error('Unauthorized')
    }

    // Parse request body
    const requestData: CreateUserRequest = await req.json()
    const { email, fullName, password, tenantId, userLevelCode, hotelId, positionId } = requestData

    // Validate required fields
    if (!email || !fullName || !password || !tenantId || !userLevelCode) {
      throw new Error('Missing required fields: email, fullName, password, tenantId, userLevelCode')
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      throw new Error('Email không hợp lệ')
    }

    // Check for duplicate email in the same tenant
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('tenant_id', tenantId)
      .eq('email', email.toLowerCase())
      .maybeSingle()

    if (checkError) {
      console.error('Error checking existing user:', checkError)
      throw new Error('Không thể kiểm tra email trùng lặp')
    }

    if (existingUser) {
      throw new Error('Email này đã được sử dụng trong hệ thống')
    }

    // Check if email exists in auth.users (orphaned user)
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers()
    const orphanedAuthUser = authUsers.users.find(u => u.email?.toLowerCase() === email.toLowerCase())
    
    if (orphanedAuthUser) {
      console.log('Found orphaned auth user, deleting:', orphanedAuthUser.id)
      await supabaseAdmin.auth.admin.deleteUser(orphanedAuthUser.id)
    }

    console.log('Requesting user:', requestingUser.id)
    console.log('Creating user with level:', userLevelCode)

    // Check if requesting user has permission to create this level of user
    const { data: canCreate, error: permError } = await supabaseAdmin
      .rpc('can_create_user', {
        p_creator_id: requestingUser.id,
        p_new_user_level: userLevelCode,
        p_tenant_id: tenantId
      })

    if (permError) {
      console.error('Permission check error:', permError)
      throw new Error('Không thể kiểm tra quyền tạo người dùng')
    }

    if (!canCreate) {
      if (userLevelCode === 'tenant_owner') {
        throw new Error('Không thể tạo thêm Chủ sở hữu. Mỗi doanh nghiệp chỉ có một Chủ sở hữu.')
      } else if (userLevelCode === 'manager') {
        throw new Error('Bạn không có quyền tạo Quản lý. Chỉ Chủ sở hữu mới có quyền này.')
      } else {
        throw new Error('Bạn không có quyền tạo người dùng này')
      }
    }

    // Validate manager must have hotel_id
    if (userLevelCode === 'manager' && !hotelId) {
      throw new Error('Quản lý phải được gán cho một khách sạn cụ thể')
    }

    // Validate hotel exists if provided
    if (hotelId) {
      const { data: hotel, error: hotelError } = await supabaseAdmin
        .from('hotels')
        .select('id')
        .eq('id', hotelId)
        .eq('tenant_id', tenantId)
        .maybeSingle()

      if (hotelError || !hotel) {
        throw new Error('Khách sạn không tồn tại hoặc không thuộc doanh nghiệp này')
      }
    }

    // Use password from request instead of generating
    console.log('Creating auth user...')
    
    // Create auth user
    const { data: authUser, error: authUserError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase(),
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
      }
    })

    if (authUserError) {
      console.error('Auth user creation error:', authUserError)
      throw new Error(`Không thể tạo tài khoản xác thực: ${authUserError.message}`)
    }

    console.log('Auth user created:', authUser.user.id)
    console.log('Creating user profile...')

    // Determine if this is primary owner
    let isPrimaryOwner = false
    if (userLevelCode === 'tenant_owner') {
      const { count } = await supabaseAdmin
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('user_level_code', 'tenant_owner')
        .eq('is_primary_owner', true)
      
      isPrimaryOwner = (count === 0)
    }

    // Create user profile
    const userProfile = {
      id: authUser.user.id,
      email: email.toLowerCase(),
      full_name: fullName,
      tenant_id: tenantId,
      user_level_code: userLevelCode,
      is_super_admin: false,
      is_primary_owner: isPrimaryOwner,
      status: 'active',
      created_by: userLevelCode === 'tenant_owner' ? null : requestingUser.id,
      must_change_password: true,
      login_count: 0,
      account_locked: false
    }

    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .insert(userProfile)
      .select()
      .single()

    if (userError) {
      console.error('User profile creation error:', userError)
      // Cleanup auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
      throw new Error(`Không thể tạo hồ sơ người dùng: ${userError.message}`)
    }

    console.log('User profile created:', user.id)

    // Create hotel assignment if hotel_id provided
    if (hotelId) {
      const { error: hotelAssignmentError } = await supabaseAdmin
        .from('user_hotels')
        .insert({
          user_id: user.id,
          hotel_id: hotelId,
          departments: [],
          is_default: true,
          is_active: true,
          assigned_by: requestingUser.id,
          can_create_managers: userLevelCode === 'manager',
          can_create_staff: userLevelCode === 'manager',
          can_view_reports: userLevelCode === 'manager',
          can_export_data: userLevelCode === 'manager',
          can_approve_requests: userLevelCode === 'manager'
        })

      if (hotelAssignmentError) {
        console.error('Hotel assignment error:', hotelAssignmentError)
      }
    }

    // Log activity
    const { error: logError } = await supabaseAdmin
      .from('activity_logs')
      .insert({
        tenant_id: tenantId,
        user_id: requestingUser.id,
        user_name: fullName,
        entity_type: 'user',
        entity_id: user.id,
        entity_name: fullName,
        action: 'create',
        description: `Tạo người dùng mới: ${fullName} (${userLevelCode})`,
        new_values: { email, user_level_code: userLevelCode }
      })

    if (logError) {
      console.error('Activity log error:', logError)
    }

    console.log('User creation completed successfully')

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          user_level_code: user.user_level_code,
          is_primary_owner: user.is_primary_owner
        },
        message: `Đã tạo tài khoản ${userLevelCode === 'manager' ? 'Quản lý' : 'Nhân viên'} thành công.`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Create user error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Không thể tạo người dùng'
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})