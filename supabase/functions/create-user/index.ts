import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the service role key (has admin privileges)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get request body
    const { 
      email,
      fullName,
      phone,
      userLevelCode,
      hotelId,
      positionId,
      department,
      status,
      notes,
      tenantId
    } = await req.json()

    // Validate required fields
    if (!email || !fullName || !tenantId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, fullName, tenantId' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Generate a random password (user will reset via email)
    const tempPassword = crypto.randomUUID()

    // Create auth user (this will trigger handle_new_user which creates the profile)
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: fullName,
      }
    })

    if (authError) {
      console.error('Auth user creation error:', authError)
      return new Response(
        JSON.stringify({ error: authError.message }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get current authenticated user from request for created_by
    const authHeader = req.headers.get('authorization')
    let createdBy: string | null = null
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user: requestUser } } = await supabaseAdmin.auth.getUser(token)
      createdBy = requestUser?.id || null
    }

    // Wait for trigger to create basic profile
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Check if user profile was created by trigger
    const { data: existingProfile } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', authUser.user.id)
      .single()

    // If trigger didn't create profile, create it manually
    if (!existingProfile) {
      console.log('Trigger did not create profile, creating manually...')
      const { error: insertError } = await supabaseAdmin
        .from('users')
        .insert({
          id: authUser.user.id,
          tenant_id: tenantId,
          email: email,
          full_name: fullName,
          phone: phone || null,
          user_level_code: userLevelCode || 'staff',
          hotel_id: hotelId || null,
          position_id: positionId || null,
          department: department || null,
          status: status || 'active',
          notes: notes || null,
          created_by: createdBy,
        })

      if (insertError) {
        console.error('Profile creation error:', insertError)
        await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
        
        return new Response(
          JSON.stringify({ error: insertError.message }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
    } else {
      // Profile exists, just update it
      console.log('Profile exists, updating...')
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({
          tenant_id: tenantId,
          phone: phone || null,
          user_level_code: userLevelCode || 'staff',
          hotel_id: hotelId || null,
          position_id: positionId || null,
          department: department || null,
          status: status || 'active',
          notes: notes || null,
          created_by: createdBy,
        })
        .eq('id', authUser.user.id)

      if (updateError) {
        console.error('Profile update error:', updateError)
        await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
        
        return new Response(
          JSON.stringify({ error: updateError.message }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
    }

    // Fetch the complete user profile
    const { data: finalUser, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', authUser.user.id)
      .single()

    if (fetchError) {
      console.error('Failed to fetch created user:', fetchError)
      return new Response(
        JSON.stringify({ error: 'User created but failed to fetch profile' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Send password reset email so user can set their own password
    const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: `${req.headers.get('origin')}/auth/reset-password`,
      }
    )

    if (resetError) {
      console.warn('Password reset email error:', resetError)
      // Don't fail the request, just log the warning
    }

    return new Response(
      JSON.stringify({ 
        user: finalUser,
        message: 'User created successfully. Password reset email sent.'
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Unknown error occurred' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
