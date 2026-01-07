import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface VerifyOTPRequest {
  email: string
  otp: string
}

// Same hash function as send-password-reset
async function hashOTP(otp: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(otp + Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// Generate a temporary token for password reset
function generateTempToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { email, otp }: VerifyOTPRequest = await req.json()

    if (!email || !otp) {
      return new Response(
        JSON.stringify({ error: 'Email và mã OTP là bắt buộc' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()
    const normalizedOTP = otp.trim()

    console.log('Verifying OTP for:', normalizedEmail)

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

    // Get the OTP record
    const { data: otpRecord, error: fetchError } = await supabaseAdmin
      .from('password_reset_otps')
      .select('*')
      .eq('email', normalizedEmail)
      .eq('used', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (fetchError) {
      console.error('Error fetching OTP:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Đã xảy ra lỗi. Vui lòng thử lại.' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    if (!otpRecord) {
      console.log('No OTP found for email:', normalizedEmail)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Mã xác nhận không tồn tại hoặc đã hết hạn',
          code: 'OTP_NOT_FOUND'
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    // Check if OTP is expired
    if (new Date(otpRecord.expires_at) < new Date()) {
      console.log('OTP expired for email:', normalizedEmail)
      // Delete expired OTP
      await supabaseAdmin
        .from('password_reset_otps')
        .delete()
        .eq('id', otpRecord.id)
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Mã xác nhận đã hết hạn. Vui lòng yêu cầu mã mới.',
          code: 'OTP_EXPIRED'
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    // Check max attempts (5)
    if (otpRecord.attempts >= 5) {
      console.log('Too many attempts for email:', normalizedEmail)
      // Delete the OTP
      await supabaseAdmin
        .from('password_reset_otps')
        .delete()
        .eq('id', otpRecord.id)
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Quá nhiều lần thử sai. Vui lòng yêu cầu mã mới.',
          code: 'TOO_MANY_ATTEMPTS'
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    // Hash the provided OTP and compare
    const providedHash = await hashOTP(normalizedOTP)
    
    if (providedHash !== otpRecord.otp_hash) {
      console.log('Invalid OTP for email:', normalizedEmail)
      // Increment attempts
      await supabaseAdmin
        .from('password_reset_otps')
        .update({ attempts: otpRecord.attempts + 1 })
        .eq('id', otpRecord.id)
      
      const remainingAttempts = 4 - otpRecord.attempts
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Mã xác nhận không đúng. Còn ${remainingAttempts} lần thử.`,
          code: 'INVALID_OTP',
          remaining_attempts: remainingAttempts
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    // OTP is valid! Generate a temporary token
    const tempToken = generateTempToken()
    const tokenExpiry = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // Mark OTP as used and store temp token
    await supabaseAdmin
      .from('password_reset_otps')
      .update({ 
        used: true,
        otp_hash: tempToken, // Reuse this field for temp token
        expires_at: tokenExpiry.toISOString()
      })
      .eq('id', otpRecord.id)

    console.log('OTP verified successfully for:', normalizedEmail)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Mã xác nhận hợp lệ',
        temp_token: tempToken,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  } catch (error: any) {
    console.error('Error in verify-otp:', error)

    return new Response(
      JSON.stringify({ error: 'Đã xảy ra lỗi. Vui lòng thử lại sau.' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  }
})
