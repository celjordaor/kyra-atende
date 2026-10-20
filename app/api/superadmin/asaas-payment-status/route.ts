import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export async function GET(request: NextRequest) {
  const { data: { user }, error: authError } = await createClient().auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const admin = createAdminClient()
  const { data: profile, error: roleError } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (roleError || profile?.role !== 'superadmin') return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 })

  const paymentId = request.nextUrl.searchParams.get('paymentId')
  if (!paymentId || !/^pay_[a-zA-Z0-9_-]{1,100}$/.test(paymentId)) {
    return NextResponse.json({ error: 'Identificador inválido' }, { status: 400 })
  }
  const { data: recorded, error: dbError } = await admin.from('asaas_processed_payments')
    .select('payment_id,tenant_id,plan,period,amount').eq('payment_id', paymentId).maybeSingle()
  if (dbError) return NextResponse.json({ error: 'Falha ao consultar registro financeiro' }, { status: 503 })
  if (!recorded) return NextResponse.json({ error: 'Pagamento sem vínculo registrado no Kyra Atende' }, { status: 404 })

  const apiKey = process.env.ASAAS_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'Asaas não configurado' }, { status: 503 })
  const base = process.env.ASAAS_SANDBOX !== 'false' ? 'https://api-sandbox.asaas.com/v3' : 'https://api.asaas.com/v3'
  try {
    const response = await fetch(base + '/payments/' + encodeURIComponent(paymentId), {
      headers: { access_token: apiKey, accept: 'application/json', 'User-Agent': 'KyraAtende/1.0' },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) return NextResponse.json({ error: 'Não foi possível consultar pagamento no Asaas' }, { status: 502 })
    const payment: unknown = await response.json()
    if (!payment || typeof payment !== 'object') return NextResponse.json({ error: 'Resposta inválida do provedor' }, { status: 502 })
    const p = payment as Record<string, unknown>
    if (p.id !== paymentId) return NextResponse.json({ error: 'Identificador divergente no provedor' }, { status: 502 })
    const expected = [recorded.tenant_id, recorded.plan, recorded.period].join('|')
    let externalRef = p.externalReference
    if (p.paymentLink != null) {
      if (typeof p.paymentLink !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(p.paymentLink)) {
        return NextResponse.json({ error: 'Vínculo do link inválido' }, { status: 422 })
      }
      const linkRes = await fetch(base + '/paymentLinks/' + encodeURIComponent(p.paymentLink), {
        headers: { access_token: apiKey, accept: 'application/json', 'User-Agent': 'KyraAtende/1.0' },
        cache: 'no-store', signal: AbortSignal.timeout(8000),
      })
      if (!linkRes.ok) return NextResponse.json({ error: 'Falha ao conferir vínculo do link' }, { status: 503 })
      const link: unknown = await linkRes.json()
      if (!link || typeof link !== 'object' || (link as Record<string, unknown>).id !== p.paymentLink) {
        return NextResponse.json({ error: 'Vínculo de link divergente' }, { status: 422 })
      }
      const linked = (link as Record<string, unknown>).externalReference
      if (externalRef && linked !== externalRef) return NextResponse.json({ error: 'Referências divergentes' }, { status: 422 })
      externalRef = linked
    }
    if (externalRef !== expected || typeof p.value !== 'number' || Math.abs(p.value - Number(recorded.amount)) > 0.001) {
      return NextResponse.json({ error: 'Pagamento sem vínculo ou valor compatível' }, { status: 422 })
    }
    return NextResponse.json({
      paymentId, status: typeof p.status === 'string' ? p.status : 'UNKNOWN',
      value: p.value, recordedAmount: Number(recorded.amount), plan: recorded.plan,
      period: recorded.period, asaasEnvironment: process.env.ASAAS_SANDBOX !== 'false' ? 'sandbox' : 'production',
      checkedAt: new Date().toISOString(),
      requiresReview: !['CONFIRMED', 'RECEIVED'].includes(String(p.status)),
      note: 'Consulta informativa. Nenhuma alteração de acesso ou pagamento foi realizada.',
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    console.error('[superadmin/asaas] consulta indisponível', { errorType: err instanceof Error ? err.name : 'unknown' })
    return NextResponse.json({ error: 'Provedor temporariamente indisponível' }, { status: 503 })
  }
}
