import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

// Cliente Supabase com service_role para leitura sem RLS
function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })
}

export async function POST(request: NextRequest) {
  // Configuração VAPID dentro do handler para evitar erro no build
  // quando as variáveis de ambiente ainda não estão disponíveis
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? 'mailto:suporte@kyraatende.com.br',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '',
    process.env.VAPID_PRIVATE_KEY ?? '',
  )

  try {
    const { tenantId, clientName, serviceName, startAt } = await request.json() as {
      tenantId:    string
      clientName:  string
      serviceName: string
      startAt:     string
    }

    if (!tenantId || !clientName) {
      return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
    }

    const supabase = adminClient()

    // Busca todas as subscriptions push do tenant
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('tenant_id', tenantId)

    if (!subs?.length) {
      return NextResponse.json({ ok: true, sent: 0 })
    }

    const payload = JSON.stringify({
      title: '🗓️ Novo agendamento',
      body:  `${clientName} · ${serviceName} · ${formatDateTime(startAt)}`,
      url:   '/agendamentos',
    })

    // Envia para todos os dispositivos do tenant em paralelo
    const results = await Promise.allSettled(
      subs.map(sub =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        ).catch(async (err: any) => {
          // Remove endpoints expirados (410 Gone)
          if (err.statusCode === 410) {
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('endpoint', sub.endpoint)
          }
        })
      )
    )

    const sent = results.filter(r => r.status === 'fulfilled').length
    return NextResponse.json({ ok: true, sent })
  } catch (err) {
    console.error('[notify-created] erro:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
