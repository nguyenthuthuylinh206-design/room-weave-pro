import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ResetPasswordRequest {
  email: string
  temp_token: string
  new_password: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { email, temp_token, new_password }: ResetPasswordRequest = await req.json()

    if (!email || !temp_token || !new_password) {
      return new Response(
        JSON.stringify({ error: 'Email, token và mật khẩu mới là bắt buộc' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    // Validate password strength
    if (new_password.length < 6) {
      return new Response(
        JSON.stringify({ error: 'Mật khẩu phải có ít nhất 6 ký tự' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()
    console.log('Resetting password for:', normalizedEmail)

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Verify the temp token
    const { data: otpRecord, error: fetchError } = await supabaseAdmin
      .from('password_reset_otps')
      .select('*')
      .eq('email', normalizedEmail)
      .eq('otp_hash', temp_token) // temp token is stored in otp_hash after verification
      .eq('used', true)
      .maybeSingle()

    if (fetchError) {
      console.error('Error fetching token:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Đã xảy ra lỗi. Vui lòng thử lại.' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    if (!otpRecord) {
      console.log('Invalid token for email:', normalizedEmail)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Token không hợp lệ hoặc đã hết hạn',
          code: 'INVALID_TOKEN'
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    // Check if token is expired
    if (new Date(otpRecord.expires_at) < new Date()) {
      console.log('Token expired for email:', normalizedEmail)
      await supabaseAdmin
        .from('password_reset_otps')
        .delete()
        .eq('id', otpRecord.id)
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Phiên đặt lại mật khẩu đã hết hạn. Vui lòng bắt đầu lại.',
          code: 'TOKEN_EXPIRED'
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    // Get user ID from auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (authError) {
      console.error('Error listing users:', authError)
      return new Response(
        JSON.stringify({ error: 'Đã xảy ra lỗi. Vui lòng thử lại.' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    const user = authUser.users.find(u => u.email?.toLowerCase() === normalizedEmail)
    
    if (!user) {
      console.log('User not found in auth:', normalizedEmail)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Không tìm thấy người dùng',
          code: 'USER_NOT_FOUND'
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    // Update the password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: new_password }
    )

    if (updateError) {
      console.error('Error updating password:', updateError)
      return new Response(
        JSON.stringify({ error: 'Không thể cập nhật mật khẩu. Vui lòng thử lại.' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    // Clean up all OTP records for this email
    await supabaseAdmin
      .from('password_reset_otps')
      .delete()
      .eq('email', normalizedEmail)

    console.log('Password reset successfully for:', normalizedEmail)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Mật khẩu đã được đặt lại thành công',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  } catch (error: any) {
    console.error('Error in reset-password-with-otp:', error)

    return new Response(
      JSON.stringify({ error: 'Đã xảy ra lỗi. Vui lòng thử lại sau.' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  }
})
