/**
 * app/api/whatsapp/connect/route.ts
 * POST /api/whatsapp/connect — cria/reconecta instância e retorna QR code
 */
import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/route-helpers'
import { assertCanUse } from '@/lib/entitlements'
import { connectInstance } from '@/lib/whatsapp'

export async function POST() {
  const session = await requireSession()
  if (!session.ok) return session.response

  const { tenantId } = session

  const err = await assertCanUse(tenantId, 'has_whatsapp')
  if (err) return err

  try {
    const result = await connectInstance(tenantId)
    return NextResponse.json(result)
  } catch (e) {
    console.error('[whatsapp/connect]', e)
    return NextResponse.json({ error: 'Erro ao conectar WhatsApp.' }, { status: 500 })
  }
}
