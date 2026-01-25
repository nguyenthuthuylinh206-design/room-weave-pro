import { Hono } from 'https://deno.land/x/hono@v3.4.1/mod.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const app = new Hono()

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ChargeableNotificationPayload {
  tenant_id: string
  hotel_id: string
  booking_id: string
  room_id: string
  room_number: string
  items: {
    name: string
    quantity: number
    total: number
  }[]
  total_amount: number
  recorded_by_name?: string
}

app.options('*', (c) => {
  return c.json({}, { headers: corsHeaders })
})

app.post('/', async (c) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const payload: ChargeableNotificationPayload = await c.req.json()
    const { tenant_id, hotel_id, booking_id, room_id, room_number, items, total_amount, recorded_by_name } = payload

    if (!tenant_id || !hotel_id || items.length === 0) {
      return c.json({ error: 'Missing required fields' }, { status: 400, headers: corsHeaders })
    }

    // Format message
    const itemsList = items.map(i => `• ${i.quantity}x ${i.name}: ${formatCurrency(i.total)}`).join('\n')
    const message = `📦 Phòng ${room_number} - Phụ thu minibar\n${itemsList}\n💰 Tổng: ${formatCurrency(total_amount)}${recorded_by_name ? `\n👤 Ghi nhận bởi: ${recorded_by_name}` : ''}`

    // Get users to notify (receptionists and managers at this hotel)
    const { data: usersToNotify } = await supabase
      .from('users')
      .select('id, full_name')
      .eq('tenant_id', tenant_id)
      .eq('status', 'active')
      .or(`user_level_code.in.(tenant_owner,manager),id.in.(
        select user_id from user_hotels where hotel_id = '${hotel_id}'
      )`)

    if (!usersToNotify || usersToNotify.length === 0) {
      console.log('No users to notify')
      return c.json({ success: true, notified: 0 }, { headers: corsHeaders })
    }

    // Create in-app notifications
    const notifications = usersToNotify.map(user => ({
      tenant_id,
      user_id: user.id,
      type: 'chargeable_consumption',
      title: `Phụ thu Phòng ${room_number}`,
      message: `${items.length} sản phẩm - ${formatCurrency(total_amount)}`,
      data: {
        booking_id,
        room_id,
        room_number,
        items,
        total_amount,
      },
      is_read: false,
    }))

    const { error: notifError } = await supabase
      .from('notifications')
      .insert(notifications)

    if (notifError) {
      console.error('Error creating notifications:', notifError)
    }

    // Send Telegram notification to hotel groups
    const { data: telegramGroups } = await supabase
      .from('telegram_group_connections')
      .select('chat_id')
      .eq('tenant_id', tenant_id)
      .or(`hotel_id.eq.${hotel_id},hotel_id.is.null`)
      .eq('is_active', true)
      .or('notification_types.cs.{chargeable_consumption},notification_types.cs.{all},notification_types.eq.{}')

    if (telegramGroups && telegramGroups.length > 0) {
      const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
      if (botToken) {
        for (const group of telegramGroups) {
          try {
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: group.chat_id,
                text: message,
                parse_mode: 'HTML',
              }),
            })
          } catch (err) {
            console.error('Telegram send error:', err)
          }
        }
      }
    }

    return c.json({ 
      success: true, 
      notified: usersToNotify.length,
      telegram_groups: telegramGroups?.length || 0,
    }, { headers: corsHeaders })

  } catch (error: unknown) {
    console.error('Error in notify-chargeable:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return c.json({ error: message }, { status: 500, headers: corsHeaders })
  }
})

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value)
}

Deno.serve(app.fetch)
