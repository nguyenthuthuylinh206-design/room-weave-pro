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

    // Wait a bit for the trigger to complete
    await new Promise(resolve => setTimeout(resolve, 500))

    // Update the user profile with additional details
    const { data: updatedUser, error: updateError } = await supabaseAdmin
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
      })
      .eq('id', authUser.user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Profile update error:', updateError)
      // Try to clean up the auth user
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
      
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { 
          status: 400,
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
        user: updatedUser,
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
