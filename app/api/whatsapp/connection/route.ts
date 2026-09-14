/**
 * app/api/whatsapp/connection/route.ts
 * GET /api/whatsapp/connection — status atual da conexão (sem gerar novo QR)
 */
import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/route-helpers'
import { assertCanUse } from '@/lib/entitlements'
import { getConnectionStatus } from '@/lib/whatsapp'

export async function GET() {
  const session = await requireSession()
  if (!session.ok) return session.response

  const { tenantId } = session

  const err = await assertCanUse(tenantId, 'has_whatsapp')
  if (err) return err

  const result = await getConnectionStatus(tenantId)
  return NextResponse.json(result)
}
