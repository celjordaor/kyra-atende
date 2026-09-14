import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import webpush from 'web-push'

export async function POST(request: NextRequest) {
  // Configuração VAPID dentro do handler para evitar erro no build
  webpush.setVapidDetails(
    'mailto:suporte@kyraatende.com.br',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  )

  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch all subscriptions for the authenticated user
    const { data: subs, error: fetchError } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', user.id)

    if (fetchError || !subs?.length) {
      return NextResponse.json(
        { error: 'No push subscriptions found for this user' },
        { status: 404 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const title = (body as Record<string, string>).title ?? 'Kyra Atende'
    const message = (body as Record<string, string>).message ?? 'Notificação de teste 🔔'

    const payload = JSON.stringify({
      title,
      body: message,
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      tag: 'test-notification',
      data: { url: '/dashboard' },
    })

    const results = await Promise.allSettled(
      subs.map((sub) =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        )
      )
    )

    const sent = results.filter((r) => r.status === 'fulfilled').length
    const failed = results.filter((r) => r.status === 'rejected').length

    return NextResponse.json({ ok: true, sent, failed })
  } catch (err) {
    console.error('[push/test] unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
