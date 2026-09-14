/**
 * app/api/whatsapp/disconnect/route.ts
 * DELETE /api/whatsapp/disconnect — desconecta instância do tenant
 */
import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/route-helpers'
import { disconnectInstance } from '@/lib/whatsapp'

export async function DELETE() {
  const session = await requireSession()
  if (!session.ok) return session.response

  const { tenantId } = session

  await disconnectInstance(tenantId)
  return new NextResponse(null, { status: 204 })
}
