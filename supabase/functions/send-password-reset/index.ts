import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { Resend } from 'https://esm.sh/resend@4.0.1'

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PasswordResetRequest {
  email: string
}

// Generate a random 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Simple hash function for OTP (for storage)
async function hashOTP(otp: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(otp + Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

function generateOTPEmail(otp: string): { subject: string; html: string } {
  return {
    subject: '🔐 Mã xác nhận đặt lại mật khẩu',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Ubuntu, sans-serif; background-color: #f6f9fc; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 32px;">
              <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 32px;">🔐</span>
              </div>
              <h1 style="color: #1a1a1a; font-size: 24px; font-weight: bold; margin: 0;">Mã xác nhận của bạn</h1>
            </div>

            <!-- Content -->
            <p style="color: #4a5568; font-size: 16px; line-height: 26px; margin: 0 0 24px 0; text-align: center;">
              Sử dụng mã bên dưới để đặt lại mật khẩu của bạn:
            </p>

            <!-- OTP Code -->
            <div style="text-align: center; margin: 32px 0;">
              <div style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 4px; border-radius: 12px;">
                <div style="background: #ffffff; padding: 20px 40px; border-radius: 10px;">
                  <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1a1a1a; font-family: 'Courier New', monospace;">${otp}</span>
                </div>
              </div>
            </div>

            <!-- Warning -->
            <div style="background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 16px; margin: 24px 0;">
              <p style="color: #856404; font-size: 14px; margin: 0; display: flex; align-items: flex-start;">
                <span style="margin-right: 8px;">⏱️</span>
                <span>Mã này sẽ hết hạn sau <strong>5 phút</strong>. Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</span>
              </p>
            </div>

            <!-- Footer -->
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
            <p style="color: #a0aec0; font-size: 12px; text-align: center; margin: 0;">
              Email này được gửi tự động từ hệ thống. Vui lòng không trả lời email này.
            </p>
          </div>
        </body>
      </html>
    `,
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { email }: PasswordResetRequest = await req.json()

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email là bắt buộc' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Email không hợp lệ' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()
    console.log('Processing password reset for:', normalizedEmail)

    // Create Supabase admin client
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

    // Check if email exists in the system
    const { data: existingUser, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name')
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (userError) {
      console.error('Error checking user:', userError)
    }

    if (!existingUser) {
      console.log('Email not found in system:', normalizedEmail)
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Email này chưa được đăng ký trong hệ thống',
          email_not_found: true
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    console.log('Found user:', existingUser.id)

    // Delete any existing unused OTPs for this email
    await supabaseAdmin
      .from('password_reset_otps')
      .delete()
      .eq('email', normalizedEmail)

    // Generate new OTP
    const otp = generateOTP()
    const otpHash = await hashOTP(otp)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes

    console.log('Generated OTP for:', normalizedEmail)

    // Store OTP in database
    const { error: insertError } = await supabaseAdmin
      .from('password_reset_otps')
      .insert({
        email: normalizedEmail,
        otp_hash: otpHash,
        expires_at: expiresAt.toISOString(),
        used: false,
        attempts: 0,
      })

    if (insertError) {
      console.error('Error storing OTP:', insertError)
      return new Response(
        JSON.stringify({ error: 'Không thể tạo mã xác nhận. Vui lòng thử lại.' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    // Generate email content
    const emailContent = generateOTPEmail(otp)

    // Send email via Resend
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'Hotel Management <onboarding@resend.dev>',
      to: [normalizedEmail],
      subject: emailContent.subject,
      html: emailContent.html,
    })

    if (emailError) {
      console.error('Resend error:', emailError)
      // Clean up OTP if email fails
      await supabaseAdmin
        .from('password_reset_otps')
        .delete()
        .eq('email', normalizedEmail)
      
      return new Response(
        JSON.stringify({ error: 'Không thể gửi email. Vui lòng thử lại sau.' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    console.log('OTP email sent successfully:', emailData?.id)

    // Log to database (optional)
    try {
      await supabaseAdmin
        .from('email_notifications')
        .insert({
          notification_type: 'password_reset_otp',
          to_email: normalizedEmail,
          subject: emailContent.subject,
          body_html: emailContent.html,
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
    } catch (dbError) {
      console.error('Failed to log email:', dbError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Mã xác nhận đã được gửi đến email của bạn.',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  } catch (error: any) {
    console.error('Error in send-password-reset:', error)

    return new Response(
      JSON.stringify({ error: 'Đã xảy ra lỗi. Vui lòng thử lại sau.' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  }
})
