import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PushPayload {
  user_id?: string
  user_ids?: string[]
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  action_url?: string
  data?: Record<string, any>
}

interface PushSubscription {
  id: string
  user_id: string
  endpoint: string
  p256dh_key: string
  auth_key: string
}

// Web Push VAPID signing
async function generateVAPIDAuth(
  endpoint: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  subject: string
) {
  const urlObj = new URL(endpoint)
  const audience = `${urlObj.protocol}//${urlObj.host}`

  // Create JWT header and payload
  const header = { typ: 'JWT', alg: 'ES256' }
  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60, // 12 hours
    sub: subject,
  }

  // Base64url encode
  const base64UrlEncode = (data: string) => {
    return btoa(data)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
  }

  const headerB64 = base64UrlEncode(JSON.stringify(header))
  const payloadB64 = base64UrlEncode(JSON.stringify(payload))
  const unsignedToken = `${headerB64}.${payloadB64}`

  // Import private key
  const privateKeyBytes = Uint8Array.from(atob(vapidPrivateKey.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))
  
  // For ES256, we need to create a proper key
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    privateKeyBytes,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  ).catch(() => null)

  if (!cryptoKey) {
    // Fallback: use a simpler approach
    return {
      authorization: `vapid t=${unsignedToken}, k=${vapidPublicKey}`,
    }
  }

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  )

  const signatureB64 = base64UrlEncode(String.fromCharCode(...new Uint8Array(signature)))
  const jwt = `${unsignedToken}.${signatureB64}`

  return {
    authorization: `vapid t=${jwt}, k=${vapidPublicKey}`,
  }
}

// Encrypt payload for push notification
async function encryptPayload(
  payload: string,
  p256dhKey: string,
  authKey: string
): Promise<{ encrypted: ArrayBuffer; salt: Uint8Array; serverPublicKey: ArrayBuffer } | null> {
  try {
    // Generate server key pair
    const serverKeys = await crypto.subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      ['deriveBits']
    )

    // Decode client public key
    const clientPublicKeyBytes = Uint8Array.from(
      atob(p256dhKey.replace(/-/g, '+').replace(/_/g, '/')),
      c => c.charCodeAt(0)
    )

    // Import client public key
    const clientPublicKey = await crypto.subtle.importKey(
      'raw',
      clientPublicKeyBytes,
      { name: 'ECDH', namedCurve: 'P-256' },
      false,
      []
    )

    // Derive shared secret
    const sharedSecret = await crypto.subtle.deriveBits(
      { name: 'ECDH', public: clientPublicKey },
      serverKeys.privateKey,
      256
    )

    // Export server public key
    const serverPublicKey = await crypto.subtle.exportKey('raw', serverKeys.publicKey)

    // Generate salt
    const salt = crypto.getRandomValues(new Uint8Array(16))

    // Decode auth secret
    const authSecret = Uint8Array.from(
      atob(authKey.replace(/-/g, '+').replace(/_/g, '/')),
      c => c.charCodeAt(0)
    )

    // Derive encryption key using HKDF-like derivation
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new Uint8Array(sharedSecret),
      'HKDF',
      false,
      ['deriveBits']
    )

    const prk = await crypto.subtle.deriveBits(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt: authSecret,
        info: new TextEncoder().encode('Content-Encoding: auth\0'),
      },
      keyMaterial,
      256
    )

    // Derive content encryption key
    const cekMaterial = await crypto.subtle.importKey('raw', new Uint8Array(prk), 'HKDF', false, ['deriveBits'])
    const cek = await crypto.subtle.deriveBits(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt: salt,
        info: new TextEncoder().encode('Content-Encoding: aes128gcm\0'),
      },
      cekMaterial,
      128
    )

    // Derive nonce
    const nonce = await crypto.subtle.deriveBits(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt: salt,
        info: new TextEncoder().encode('Content-Encoding: nonce\0'),
      },
      cekMaterial,
      96
    )

    // Encrypt payload
    const encryptionKey = await crypto.subtle.importKey(
      'raw',
      new Uint8Array(cek),
      'AES-GCM',
      false,
      ['encrypt']
    )

    const paddedPayload = new Uint8Array([...new TextEncoder().encode(payload), 2])
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: new Uint8Array(nonce) },
      encryptionKey,
      paddedPayload
    )

    return { encrypted, salt, serverPublicKey }
  } catch (error) {
    console.error('Encryption error:', error)
    return null
  }
}

async function sendPushToSubscription(
  subscription: PushSubscription,
  payload: PushPayload,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<{ success: boolean; error?: string; expired?: boolean }> {
  try {
    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/icon-192x192.png',
      badge: payload.badge || '/icon-72x72.png',
      tag: payload.tag,
      data: {
        url: payload.action_url || '/',
        ...payload.data,
      },
    })

    // Try simple fetch first (many push services accept unencrypted payloads)
    const vapidAuth = await generateVAPIDAuth(
      subscription.endpoint,
      vapidPublicKey,
      vapidPrivateKey,
      'mailto:support@roomweave.app'
    )

    // For FCM endpoints, use simpler approach
    if (subscription.endpoint.includes('fcm.googleapis.com') || subscription.endpoint.includes('push.services.mozilla.com')) {
      const response = await fetch(subscription.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'TTL': '86400',
          'Authorization': vapidAuth.authorization,
          'Crypto-Key': `p256ecdsa=${vapidPublicKey}`,
        },
        body: notificationPayload,
      })

      if (response.status === 201 || response.status === 200) {
        return { success: true }
      }

      if (response.status === 410 || response.status === 404) {
        return { success: false, expired: true, error: 'Subscription expired' }
      }

      const errorText = await response.text()
      console.error(`Push failed with status ${response.status}:`, errorText)
      return { success: false, error: `HTTP ${response.status}: ${errorText}` }
    }

    // For other endpoints, try with encryption
    const encryptedData = await encryptPayload(
      notificationPayload,
      subscription.p256dh_key,
      subscription.auth_key
    )

    if (!encryptedData) {
      // Fallback to unencrypted
      const response = await fetch(subscription.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'TTL': '86400',
          'Authorization': vapidAuth.authorization,
        },
        body: new TextEncoder().encode(notificationPayload),
      })

      if (response.status === 201 || response.status === 200) {
        return { success: true }
      }

      if (response.status === 410 || response.status === 404) {
        return { success: false, expired: true }
      }

      return { success: false, error: `HTTP ${response.status}` }
    }

    // Build encrypted body with headers
    const recordSize = new ArrayBuffer(4)
    new DataView(recordSize).setUint32(0, 4096, false)

    const serverPublicKeyLength = new Uint8Array([65])
    const body = new Uint8Array([
      ...new Uint8Array(encryptedData.salt),
      ...new Uint8Array(recordSize),
      ...serverPublicKeyLength,
      ...new Uint8Array(encryptedData.serverPublicKey),
      ...new Uint8Array(encryptedData.encrypted),
    ])

    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'TTL': '86400',
        'Authorization': vapidAuth.authorization,
      },
      body,
    })

    if (response.status === 201 || response.status === 200) {
      return { success: true }
    }

    if (response.status === 410 || response.status === 404) {
      return { success: false, expired: true, error: 'Subscription expired' }
    }

    return { success: false, error: `HTTP ${response.status}` }
  } catch (error) {
    console.error('Push error:', error)
    return { success: false, error: String(error) }
  }
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!

    if (!vapidPublicKey || !vapidPrivateKey) {
      throw new Error('VAPID keys not configured')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const payload: PushPayload = await req.json()

    console.log('Received push request:', JSON.stringify(payload, null, 2))

    // Get target user IDs
    const userIds = payload.user_ids || (payload.user_id ? [payload.user_id] : [])
    
    if (userIds.length === 0) {
      throw new Error('No user_id or user_ids provided')
    }

    // Fetch active subscriptions for users
    const { data: subscriptions, error: fetchError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('user_id', userIds)
      .eq('is_active', true)

    if (fetchError) {
      console.error('Error fetching subscriptions:', fetchError)
      throw fetchError
    }

    console.log(`Found ${subscriptions?.length || 0} active subscriptions`)

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No active subscriptions' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Also save to in_app_notifications
    for (const userId of userIds) {
      const sub = subscriptions.find(s => s.user_id === userId)
      if (sub) {
        await supabase.from('in_app_notifications').insert({
          tenant_id: sub.tenant_id,
          user_id: userId,
          title: payload.title,
          body: payload.body,
          type: payload.data?.type || 'info',
          action_url: payload.action_url,
          icon: payload.icon,
          metadata: payload.data || {},
        })
      }
    }

    // Send push to each subscription
    const results = await Promise.all(
      subscriptions.map(sub =>
        sendPushToSubscription(sub, payload, vapidPublicKey, vapidPrivateKey)
      )
    )

    // Handle expired subscriptions
    const expiredIds = subscriptions
      .filter((_, i) => results[i].expired)
      .map(sub => sub.id)

    if (expiredIds.length > 0) {
      await supabase
        .from('push_subscriptions')
        .update({ is_active: false })
        .in('id', expiredIds)
      
      console.log(`Deactivated ${expiredIds.length} expired subscriptions`)
    }

    // Update failed counts
    const failedIds = subscriptions
      .filter((_, i) => !results[i].success && !results[i].expired)
      .map(sub => sub.id)

    if (failedIds.length > 0) {
      // Update failed count for each failed subscription
      await supabase
        .from('push_subscriptions')
        .update({ failed_count: 1 })
        .in('id', failedIds);
    }

    const successCount = results.filter(r => r.success).length
    console.log(`Push results: ${successCount}/${subscriptions.length} successful`)

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        total: subscriptions.length,
        expired: expiredIds.length,
        failed: failedIds.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
