import { createHash } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

const policies = {
  publicBooking: { limit: 8, seconds: 600 },
  portalClaim: { limit: 12, seconds: 600 },
  portalBooking: { limit: 8, seconds: 600 },
  businessSignupCheck: { limit: 8, seconds: 600 },
} as const

export async function enforceApiRateLimit(
 request: NextRequest,
 policy: keyof typeof policies,
 scope: string,
): Promise<NextResponse | null> {
 // Vercel supplies x-vercel-forwarded-for at the trusted edge. Do not trust
 // arbitrary client-controlled x-forwarded-for values as an identity.
 const address = request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim()
 // Without trustworthy edge identity, use a shared bucket to fail safely.
 const identity = address && /^[\da-fA-F:.]{3,45}$/.test(address) ? address : 'unknown'
 const secret = process.env.API_RATE_LIMIT_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
 if (!secret) return NextResponse.json({ error: 'Serviço temporariamente indisponível.' }, { status: 503 })
 const hash = createHash('sha256').update([secret,policy,scope,identity].join(':')).digest('hex')
 const cfg = policies[policy]
 const { data, error } = await createAdminClient().rpc('claim_api_rate_limit', {
  p_key_hash:hash,p_limit:cfg.limit,p_window_seconds:cfg.seconds,
 })
 if (error || !Array.isArray(data) || !data[0]) {
  console.error('[rate-limit] backend unavailable', { code:error?.code,policy })
  return NextResponse.json({ error: 'Serviço temporariamente indisponível.' }, { status:503 })
 }
 if (!data[0].allowed) return NextResponse.json({ error:'Muitas tentativas. Aguarde antes de tentar novamente.' },
  { status:429,headers:{'Retry-After':String(data[0].retry_after),'Cache-Control':'no-store'} })
 return null
}
