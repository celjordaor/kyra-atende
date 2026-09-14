import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import BiDashboardClient from './BiDashboardClient'

export const metadata = { title: 'BI Dashboard — Kyra Atende' }

function monthsAgoRange(n: number) {
  const now   = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() - n, 1).toISOString()
  const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString()
  return { start, end }
}

function monthLabel(offsetFromNow: number) {
  const d = new Date()
  d.setMonth(d.getMonth() - offsetFromNow)
  return d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
}

export default async function BiDashboardPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const tenantId = (user.app_metadata?.tenant_id ?? '') as string
  if (!tenantId) redirect('/login')

  // ── Guard de entitlement: has_bi_dashboard (Expande, Enterprise) ──
  const { data: tenantPlan } = await supabase
    .from('tenants')
    .select('plan')
    .eq('id', tenantId)
    .single()

  const plan = (tenantPlan?.plan ?? 'essencial') as string
  const hasBiDashboard = ['expande', 'enterprise'].includes(plan)

  if (!hasBiDashboard) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '60vh', gap: '16px', textAlign: 'center',
        padding: '0 24px',
      }}>
        <div style={{
          width: '56px', height: '56px', borderRadius: '50%',
          background: 'var(--brand-faint)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
            stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
            <polyline points="17 6 23 6 23 12"/>
          </svg>
        </div>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--ink)', margin: '0 0 8px' }}>
            BI Dashboard
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--muted)', margin: '0 0 20px', maxWidth: '380px' }}>
            Análise estratégica com tendências de 12 meses, heatmap de horários, retenção de clientes e LTV estão disponíveis nos planos <strong>Kyra Expande</strong> e <strong>Enterprise</strong>.
          </p>
          <a href="/configuracoes/plano" style={{
            display: 'inline-block', padding: '10px 20px',
            background: 'var(--brand)', color: 'var(--white)',
            borderRadius: 'var(--r)', fontSize: '14px', fontWeight: 600,
            textDecoration: 'none',
          }}>
            Ver planos e preços
          </a>
        </div>
      </div>
    )
  }

  const range12 = monthsAgoRange(11)

  // Buscar dados dos últimos 12 meses em paralelo
  const [bookings12Res, clientsRes, heatmapRes, topClientsRes] = await Promise.all([
    // Todos os agendamentos dos últimos 12 meses (concluídos)
    supabase
      .from('bookings')
      .select('start_at, price_charged, discount, client_phone, services(name)')
      .eq('tenant_id', tenantId)
      .eq('status', 'completed')
      .gte('start_at', range12.start)
      .lte('start_at', range12.end)
      .order('start_at', { ascending: true }),

    // Total de clientes únicos por mês (confirmados + concluídos)
    supabase
      .from('bookings')
      .select('start_at, client_phone')
      .eq('tenant_id', tenantId)
      .in('status', ['confirmed', 'completed'])
      .gte('start_at', range12.start)
      .lte('start_at', range12.end),

    // Heatmap — todos os agendamentos (não cancelados) com dia/hora
    supabase
      .from('bookings')
      .select('start_at')
      .eq('tenant_id', tenantId)
      .neq('status', 'cancelled')
      .gte('start_at', range12.start)
      .lte('start_at', range12.end),

    // Top clientes por receita (concluídos)
    supabase
      .from('bookings')
      .select('client_name, client_phone, price_charged, discount')
      .eq('tenant_id', tenantId)
      .eq('status', 'completed')
      .gte('start_at', range12.start)
      .lte('start_at', range12.end),
  ])

  const bookings12 = bookings12Res.data ?? []
  const clients12  = clientsRes.data ?? []
  const heatmap    = heatmapRes.data ?? []
  const topRaw     = topClientsRes.data ?? []

  // ── Receita mensal (12 meses) ─────────────────────────────────────
  const monthRevMap: Record<string, number> = {}
  for (let i = 11; i >= 0; i--) {
    monthRevMap[monthLabel(i)] = 0
  }
  for (const b of bookings12) {
    const d   = new Date(b.start_at)
    const lbl = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
    if (lbl in monthRevMap) {
      monthRevMap[lbl] = (monthRevMap[lbl] ?? 0) + ((b.price_charged ?? 0) - (b.discount ?? 0))
    }
  }
  const monthlyRevenue = Object.entries(monthRevMap).map(([mes, receita]) => ({ mes, receita }))

  // ── Clientes únicos por mês ────────────────────────────────────────
  const monthCliMap: Record<string, Set<string>> = {}
  for (let i = 11; i >= 0; i--) {
    monthCliMap[monthLabel(i)] = new Set()
  }
  for (const b of clients12) {
    if (!b.client_phone) continue
    const d   = new Date(b.start_at)
    const lbl = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
    if (lbl in monthCliMap) monthCliMap[lbl].add(b.client_phone)
  }
  const monthlyClients = Object.entries(monthCliMap).map(([mes, s]) => ({ mes, clientes: s.size }))

  // ── Heatmap dia × hora ─────────────────────────────────────────────
  // Grid 7 dias × 12 faixas de 2h (0-2, 2-4... 22-24)
  const DAYS  = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  const SLOTS = ['00h', '02h', '04h', '06h', '08h', '10h', '12h', '14h', '16h', '18h', '20h', '22h']
  const heatGrid: Record<string, number> = {}
  for (const day of DAYS)  for (const slot of SLOTS) heatGrid[`${day}|${slot}`] = 0
  for (const b of heatmap) {
    const d    = new Date(b.start_at)
    const day  = DAYS[d.getDay()]
    const slot = SLOTS[Math.floor(d.getHours() / 2)]
    if (day && slot) heatGrid[`${day}|${slot}`]++
  }
  const heatmapData = DAYS.flatMap(day =>
    SLOTS.map(slot => ({ day, slot, value: heatGrid[`${day}|${slot}`] ?? 0 }))
  )

  // ── Top 10 clientes por receita ────────────────────────────────────
  const clientRevMap: Record<string, { name: string; receita: number; visitas: number }> = {}
  for (const b of topRaw) {
    const phone = b.client_phone ?? b.client_name ?? 'Desconhecido'
    if (!clientRevMap[phone]) clientRevMap[phone] = { name: b.client_name ?? phone, receita: 0, visitas: 0 }
    clientRevMap[phone].receita  += (b.price_charged ?? 0) - (b.discount ?? 0)
    clientRevMap[phone].visitas  += 1
  }
  const topClients = Object.values(clientRevMap)
    .sort((a, b) => b.receita - a.receita)
    .slice(0, 10)
    .map(c => ({ ...c, ltv: c.receita, ticketMedio: c.visitas > 0 ? Math.round(c.receita / c.visitas) : 0 }))

  // ── KPIs globais ───────────────────────────────────────────────────
  const totalRevenue12  = bookings12.reduce((s, b) => s + ((b.price_charged ?? 0) - (b.discount ?? 0)), 0)
  const totalBookings12 = bookings12.length
  const uniqueClients12 = new Set(clients12.map(b => b.client_phone).filter(Boolean)).size
  const avgLtv          = topClients.length > 0
    ? Math.round(topClients.reduce((s, c) => s + c.ltv, 0) / topClients.length) : 0

  return (
    <BiDashboardClient
      totalRevenue12={totalRevenue12}
      totalBookings12={totalBookings12}
      uniqueClients12={uniqueClients12}
      avgLtv={avgLtv}
      monthlyRevenue={monthlyRevenue}
      monthlyClients={monthlyClients}
      heatmapData={heatmapData}
      heatmapDays={DAYS}
      heatmapSlots={SLOTS}
      topClients={topClients}
    />
  )
}
