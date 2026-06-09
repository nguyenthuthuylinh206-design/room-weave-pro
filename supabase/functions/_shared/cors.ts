/**
 * Shared CORS helper với origin allowlist.
 *
 * - Production domains: roomqc.com, roomqc.lovable.app
 * - Preview/staging: bất kỳ subdomain *.lovable.app, *.lovableproject.com
 * - Dev: localhost
 *
 * Dùng cho các edge function nhạy cảm (auth, user-management, admin).
 * Các function webhook gọi từ bên thứ 3 (sepay-webhook, auth-email-hook)
 * vẫn dùng `*` vì không thể biết trước origin.
 */

const STATIC_ALLOWLIST = new Set<string>([
  'https://roomqc.com',
  'https://www.roomqc.com',
  'https://roomqc.lovable.app',
  'http://localhost:8080',
  'http://localhost:5173',
  'http://localhost:3000',
])

const DYNAMIC_PATTERNS: RegExp[] = [
  /^https:\/\/[a-z0-9-]+\.lovable\.app$/i,
  /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/i,
  /^https:\/\/[a-z0-9-]+--[a-z0-9-]+\.lovable\.app$/i,
]

function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false
  if (STATIC_ALLOWLIST.has(origin)) return true
  return DYNAMIC_PATTERNS.some((re) => re.test(origin))
}

/**
 * Build CORS headers restrict theo origin của request.
 * Nếu origin không hợp lệ → trả về `null` ở Access-Control-Allow-Origin
 * (browser sẽ chặn) — không bao giờ rơi về `*` cho function nhạy cảm.
 */
export function buildCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin')
  const allowed = isOriginAllowed(origin) ? origin! : 'null'
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  }
}
