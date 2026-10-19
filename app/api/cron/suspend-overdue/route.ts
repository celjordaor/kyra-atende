import { NextRequest, NextResponse } from 'next/server'
import { requireCronSecret } from '@/lib/route-helpers'
import { createAdminClient } from '@/lib/supabase/admin'
export const runtime = 'nodejs'
export async function GET(request: NextRequest) {
  const forbidden = requireCronSecret(request)
  if (forbidden) return forbidden
  // Suspensão por atraso depende de cobrança conciliada e política de carência.
  // Evita cancelar acesso com base apenas em data, sem confirmar o pagamento.
  const supabase = createAdminClient()
  const { count, error } = await supabase.from('subscriptions')
    .select('id', { count:'exact', head:true }).eq('status','overdue')
  if (error) return NextResponse.json({ error: 'Erro ao consultar assinaturas' }, { status:500 })
  return NextResponse.json({ suspended: 0, overdue: count ?? 0, requiresReconciliation: true })
}
