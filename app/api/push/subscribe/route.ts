import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { subscription, deviceLabel } = body as {
      subscription: PushSubscriptionJSON
      deviceLabel?: string
    }

    if (!subscription?.endpoint || !subscription?.keys) {
      return NextResponse.json(
        { error: 'Invalid subscription object' },
        { status: 400 }
      )
    }

    // Busca tenant_id do usuário
    const { data: tenantData } = await supabase
      .from('tenants')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (!tenantData) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Upsert subscription (mesmo endpoint = mesmo dispositivo)
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          user_id:      user.id,
          tenant_id:    tenantData.id,
          endpoint:     subscription.endpoint,
          p256dh:       (subscription.keys as Record<string, string>).p256dh,
          auth:         (subscription.keys as Record<string, string>).auth,
          device_label: deviceLabel ?? null,
          updated_at:   new Date().toISOString(),
        },
        { onConflict: 'endpoint' }
      )

    if (error) {
      console.error('[push/subscribe] upsert error:', error)
      return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[push/subscribe] unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
