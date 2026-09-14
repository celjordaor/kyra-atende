/**
 * app/api/profile/route.ts
 * PATCH /api/profile — atualiza nome do perfil do usuário autenticado
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/route-helpers'

export async function PATCH(request: NextRequest) {
  const session = await requireSession()
  if (!session.ok) return session.response

  const { userId, supabase } = session
  const body = await request.json()
  const { name } = body as { name?: string }

  if (!name || name.trim().length < 2) {
    return NextResponse.json(
      { error: 'Nome deve ter pelo menos 2 caracteres.' },
      { status: 400 },
    )
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({ name: name.trim() })
    .eq('id', userId)
    .select()
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Erro ao atualizar perfil.' }, { status: 500 })
  }

  return NextResponse.json(data)
}
