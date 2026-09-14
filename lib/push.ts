/**
 * lib/push.ts
 * Dispatcher de Push Notifications via web-push.
 * Substitui BullMQ + PushWorker do NestJS — disparo direto, sem fila.
 * ⚠️ Chamar com `void dispatchPush(...)` (fire-and-forget) fora do path crítico.
 */
import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'

// Configura VAPID na inicialização do módulo
const vapidPublic  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''
const vapidPrivate = process.env.VAPID_PRIVATE_KEY ?? ''
const vapidSubject = process.env.VAPID_SUBJECT ?? 'mailto:suporte@kyraatende.com.br'

if (vapidPublic && vapidPrivate) {
  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate)
}

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface PushPayload {
  event: string
  data?: Record<string, unknown>
  title?: string
  body?: string
  url?: string
}

// ── Dispatch ──────────────────────────────────────────────────────────────────

/**
 * Envia push notification para todos os dispositivos de um tenant.
 * Subscriptions com erro 410 (Gone) são removidas automaticamente.
 */
export async function dispatchPush(
  tenantId: string,
  event: string,
  data: Record<string, unknown> = {},
): Promise<void> {
  if (!vapidPublic || !vapidPrivate) {
    console.warn('[push] VAPID keys não configuradas — push ignorado')
    return
  }

  const supabase = createAdminClient()

  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('tenant_id', tenantId)

  if (error || !subscriptions?.length) return

  const payload = JSON.stringify({
    event,
    data,
    title: (data.title as string | undefined) ?? 'Kyra Atende',
    body:  (data.body  as string | undefined) ?? '',
    url:   (data.url   as string | undefined) ?? '/dashboard',
  } satisfies PushPayload)

  const expiredIds: string[] = []

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        )
      } catch (err: unknown) {
        // 410 Gone → subscription expirada, remover
        if (typeof err === 'object' && err !== null && 'statusCode' in err) {
          const status = (err as { statusCode: number }).statusCode
          if (status === 410 || status === 404) {
            expiredIds.push(sub.id)
          }
        }
      }
    }),
  )

  if (expiredIds.length > 0) {
    await supabase.from('push_subscriptions').delete().in('id', expiredIds)
  }
}
