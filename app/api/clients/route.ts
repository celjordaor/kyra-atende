/**
 * app/api/clients/route.ts
 * GET  /api/clients — lista clientes do tenant
 * POST /api/clients — cria cliente
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/route-helpers'

export async function GET() {
  const session = await requireSession()
  if (!session.ok) return session.response

  const { tenantId, supabase } = session

  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('name', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(request: NextRequest) {
  const session = await requireSession()
  if (!session.ok) return session.response

  const { tenantId, supabase } = session

  const body = await request.json()
  const {
    name, email, phone, source, notes,
    cpf, birth_date, gender, nationality, profession,
    cep, logradouro, numero, complemento, bairro, estado, cidade,
  } = body as {
    name:         string
    email?:       string | null
    phone?:       string | null
    source?:      string | null
    notes?:       string | null
    cpf?:         string | null
    birth_date?:  string | null
    gender?:      string | null
    nationality?: string | null
    profession?:  string | null
    cep?:         string | null
    logradouro?:  string | null
    numero?:      string | null
    complemento?: string | null
    bairro?:      string | null
    estado?:      string | null
    cidade?:      string | null
  }

  if (!name || name.length < 2) {
    return NextResponse.json({ error: 'Nome deve ter pelo menos 2 caracteres.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('clients')
    .insert({
      tenant_id:   tenantId,
      name,
      email:       email       ?? null,
      phone:       phone       ?? null,
      source:      source      ?? null,
      notes:       notes       ?? null,
      cpf:         cpf         ?? null,
      birth_date:  birth_date  ?? null,
      gender:      gender      ?? null,
      nationality: nationality ?? null,
      profession:  profession  ?? null,
      cep:         cep         ?? null,
      logradouro:  logradouro  ?? null,
      numero:      numero      ?? null,
      complemento: complemento ?? null,
      bairro:      bairro      ?? null,
      estado:      estado      ?? null,
      cidade:      cidade      ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
