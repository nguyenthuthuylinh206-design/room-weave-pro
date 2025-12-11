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

function generatePasswordResetEmail(resetLink: string): { subject: string; html: string } {
  return {
    subject: '🔐 Đặt lại mật khẩu của bạn',
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
              <h1 style="color: #1a1a1a; font-size: 24px; font-weight: bold; margin: 0;">Đặt lại mật khẩu</h1>
            </div>

            <!-- Content -->
            <p style="color: #4a5568; font-size: 16px; line-height: 26px; margin: 0 0 24px 0;">
              Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản của mình. Nhấp vào nút bên dưới để tiếp tục:
            </p>

            <!-- CTA Button -->
            <div style="text-align: center; margin: 32px 0;">
              <a href="${resetLink}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(102, 126, 234, 0.4);">
                Đặt lại mật khẩu
              </a>
            </div>

            <!-- Warning -->
            <div style="background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 16px; margin: 24px 0;">
              <p style="color: #856404; font-size: 14px; margin: 0; display: flex; align-items: flex-start;">
                <span style="margin-right: 8px;">⚠️</span>
                <span>Link này sẽ hết hạn sau <strong>1 giờ</strong>. Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</span>
              </p>
            </div>

            <!-- Alternative Link -->
            <p style="color: #718096; font-size: 14px; line-height: 22px; margin: 24px 0;">
              Nếu nút không hoạt động, bạn có thể copy và paste link sau vào trình duyệt:
            </p>
            <p style="background-color: #f7fafc; padding: 12px; border-radius: 6px; word-break: break-all; font-size: 12px; color: #4a5568; margin: 0;">
              ${resetLink}
            </p>

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

    console.log('Processing password reset for:', email)

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
      .eq('email', email.toLowerCase().trim())
      .maybeSingle()

    if (userError) {
      console.error('Error checking user:', userError)
    }

    if (!existingUser) {
      console.log('Email not found in system:', email)
      // Return 200 with success: false to avoid SDK error handling issues
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

    // Get the origin from request headers or use default
    const origin = req.headers.get('origin') || Deno.env.get('SITE_URL') || 'https://ehjtoajnlnuvuiwkpmbp.lovableproject.com'
    const redirectTo = `${origin}/auth/reset-password`

    console.log('Redirect URL:', redirectTo)

    // Generate password reset link using Supabase Admin API
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: redirectTo,
      },
    })

    if (error) {
      console.error('Supabase error:', error)
      return new Response(
        JSON.stringify({ error: 'Không thể tạo link đặt lại mật khẩu. Vui lòng thử lại.' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    if (!data?.properties?.action_link) {
      console.error('No action link generated')
      return new Response(
        JSON.stringify({ error: 'Không thể tạo link đặt lại mật khẩu. Vui lòng thử lại.' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    const resetLink = data.properties.action_link
    console.log('Generated reset link successfully')

    // Generate email content
    const emailContent = generatePasswordResetEmail(resetLink)

    // Send email via Resend
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'Hotel Management <onboarding@resend.dev>',
      to: [email],
      subject: emailContent.subject,
      html: emailContent.html,
    })

    if (emailError) {
      console.error('Resend error:', emailError)
      return new Response(
        JSON.stringify({ error: 'Không thể gửi email. Vui lòng thử lại sau.' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    console.log('Email sent successfully:', emailData?.id)

    // Log to database (optional, don't fail if this fails)
    try {
      await supabaseAdmin
        .from('email_notifications')
        .insert({
          notification_type: 'password_reset',
          to_email: email,
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
        message: 'Email đặt lại mật khẩu đã được gửi thành công.',
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
