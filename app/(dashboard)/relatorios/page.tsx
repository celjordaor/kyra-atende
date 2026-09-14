import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import RelatoriosClient from './RelatoriosClient'

export const metadata = { title: 'Relatórios — Kyra Atende' }

function monthRange(offsetMonths = 0) {
  const now   = new Date()
  const year  = now.getFullYear()
  const month = now.getMonth() + offsetMonths
  const start = new Date(year, month, 1).toISOString()
  const end   = new Date(year, month + 1, 0, 23, 59, 59, 999).toISOString()
  return { start, end }
}

function weeksAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n * 7)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

export default async function RelatoriosPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const tenantId = (user.app_metadata?.tenant_id ?? '') as string
  if (!tenantId) redirect('/login')

  const cur  = monthRange(0)
  const prev = monthRange(-1)

  const [
    curRes, prevRes, returningRes, allPhonesRes,
    weeklyRes, byProfRes, byProfRevenueRes, byServiceRes, statusRes,
  ] = await Promise.all([
    // Mês atual — serviços concluídos com valor real cobrado
    supabase
      .from('bookings')
      .select('id, client_phone, price_charged, discount')
      .eq('tenant_id', tenantId)
      .eq('status', 'completed')
      .gte('start_at', cur.start)
      .lte('start_at', cur.end),

    // Mês anterior — tendência
    supabase
      .from('bookings')
      .select('id, client_phone, price_charged, discount')
      .eq('tenant_id', tenantId)
      .eq('status', 'completed')
      .gte('start_at', prev.start)
      .lte('start_at', prev.end),

    // Clientes anteriores ao mês atual (taxa de retorno) — inclui confirmados e concluídos
    supabase
      .from('bookings')
      .select('client_phone')
      .eq('tenant_id', tenantId)
      .in('status', ['confirmed', 'completed'])
      .lt('start_at', cur.start),

    // Telefones únicos deste mês — inclui confirmados e concluídos
    supabase
      .from('bookings')
      .select('client_phone')
      .eq('tenant_id', tenantId)
      .in('status', ['confirmed', 'completed'])
      .gte('start_at', cur.start)
      .lte('start_at', cur.end),

    // Gráfico 1: últimas 8 semanas — receita real (completed)
    supabase
      .from('bookings')
      .select('start_at, price_charged, discount')
      .eq('tenant_id', tenantId)
      .eq('status', 'completed')
      .gte('start_at', weeksAgo(8))
      .order('start_at', { ascending: true }),

    // Gráfico 2: agendamentos por profissional (mês atual — confirmados + concluídos)
    supabase
      .from('bookings')
      .select('professionals(name)')
      .eq('tenant_id', tenantId)
      .in('status', ['confirmed', 'completed'])
      .gte('start_at', cur.start)
      .lte('start_at', cur.end),

    // Gráfico 2b: receita por profissional (mês atual — apenas concluídos)
    supabase
      .from('bookings')
      .select('professionals(name), price_charged, discount')
      .eq('tenant_id', tenantId)
      .eq('status', 'completed')
      .gte('start_at', cur.start)
      .lte('start_at', cur.end),

    // Gráfico 3: serviços mais realizados (mês atual — concluídos, com valor real)
    supabase
      .from('bookings')
      .select('services(name), price_charged, discount')
      .eq('tenant_id', tenantId)
      .eq('status', 'completed')
      .gte('start_at', cur.start)
      .lte('start_at', cur.end),

    // Gráfico 4: distribuição por status (mês atual — todos)
    supabase
      .from('bookings')
      .select('status')
      .eq('tenant_id', tenantId)
      .gte('start_at', cur.start)
      .lte('start_at', cur.end),
  ])

  // ── StatTiles ──────────────────────────────────────────
  /** Receita real = price_charged - discount (para bookings completed) */
  function calcRevenue(rows: any[]) {
    return rows.reduce((sum, b) => sum + ((b.price_charged ?? 0) - (b.discount ?? 0)), 0)
  }
  function trend(cur: number, prev: number) {
    if (prev === 0) return cur > 0 ? 100 : 0
    return Math.round(((cur - prev) / prev) * 100)
  }

  const curBookings  = curRes.data  ?? []
  const prevBookings = prevRes.data ?? []
  const curRevenue   = calcRevenue(curBookings)
  const prevRevenue  = calcRevenue(prevBookings)
  const curCount     = curBookings.length
  const prevCount    = prevBookings.length
  const curTicket    = curCount  > 0 ? curRevenue / curCount   : 0
  const prevTicket   = prevCount > 0 ? prevRevenue / prevCount : 0

  const prevPhones   = new Set((returningRes.data ?? []).map((b: any) => b.client_phone).filter(Boolean))
  const curPhones    = [...new Set((allPhonesRes.data ?? []).map((b: any) => b.client_phone).filter(Boolean))]
  const returning    = curPhones.filter(p => prevPhones.has(p)).length
  const returnRate   = curPhones.length > 0 ? Math.round((returning / curPhones.length) * 100) : 0

  const prevPhonesMonth  = new Set(prevBookings.map((b: any) => b.client_phone).filter(Boolean))
  const prevBeforeRes    = await supabase
    .from('bookings')
    .select('client_phone')
    .eq('tenant_id', tenantId)
    .in('status', ['confirmed', 'completed'])
    .lt('start_at', prev.start)
  const prevBeforePhones = new Set((prevBeforeRes.data ?? []).map((b: any) => b.client_phone).filter(Boolean))
  const prevReturning    = [...prevPhonesMonth].filter(p => prevBeforePhones.has(p)).length
  const prevReturnRate   = prevPhonesMonth.size > 0 ? Math.round((prevReturning / prevPhonesMonth.size) * 100) : 0

  // ── Gráfico 1: Receita semanal ──────────────────────────
  const weekMap: Record<string, number> = {}
  for (let i = 7; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i * 7)
    const key = `S${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`
    weekMap[key] = 0
  }
  for (const b of (weeklyRes.data ?? [])) {
    const d = new Date(b.start_at)
    for (let i = 7; i >= 0; i--) {
      const w = new Date()
      w.setDate(w.getDate() - i * 7)
      w.setHours(0, 0, 0, 0)
      const wEnd = new Date(w)
      wEnd.setDate(wEnd.getDate() + 6)
      if (d >= w && d <= wEnd) {
        const key = `S${String(w.getDate()).padStart(2,'0')}/${String(w.getMonth()+1).padStart(2,'0')}`
        if (key in weekMap) weekMap[key] += (b.price_charged ?? 0) - (b.discount ?? 0)
        break
      }
    }
  }
  const weeklyData = Object.entries(weekMap).map(([semana, receita]) => ({ semana, receita }))

  // ── Gráfico 2: Por profissional ─────────────────────────
  const profMap: Record<string, number> = {}
  for (const b of (byProfRes.data ?? [])) {
    const name = (b.professionals as any)?.name ?? 'Sem profissional'
    profMap[name] = (profMap[name] ?? 0) + 1
  }
  const profData = Object.entries(profMap)
    .map(([profissional, agendamentos]) => ({ profissional, agendamentos }))
    .sort((a, b) => b.agendamentos - a.agendamentos)
    .slice(0, 6)

  // ── Gráfico 2b: Receita por profissional ───────────────
  const profRevenueMap: Record<string, number> = {}
  for (const b of (byProfRevenueRes.data ?? [])) {
    const name = (b.professionals as any)?.name ?? 'Sem profissional'
    profRevenueMap[name] = (profRevenueMap[name] ?? 0) + ((b.price_charged ?? 0) - (b.discount ?? 0))
  }
  const profRevenueData = Object.entries(profRevenueMap)
    .map(([profissional, receita]) => ({ profissional, receita }))
    .sort((a, b) => b.receita - a.receita)
    .slice(0, 6)

  // ── Gráfico 3: Serviços mais realizados ─────────────────
  const svcMap: Record<string, { count: number; revenue: number }> = {}
  for (const b of (byServiceRes.data ?? [])) {
    const svc  = b.services as any
    const name = svc?.name ?? 'Sem serviço'
    if (!svcMap[name]) svcMap[name] = { count: 0, revenue: 0 }
    svcMap[name].count++
    svcMap[name].revenue += (b.price_charged ?? 0) - (b.discount ?? 0)
  }
  const serviceData = Object.entries(svcMap)
    .map(([servico, v]) => ({ servico, agendamentos: v.count, receita: v.revenue }))
    .sort((a, b) => b.agendamentos - a.agendamentos)
    .slice(0, 6)

  // ── Gráfico 4: Distribuição por status ──────────────────
  const statusCount = { confirmed: 0, pending: 0, cancelled: 0, completed: 0 }
  for (const b of (statusRes.data ?? [])) {
    if (b.status in statusCount) statusCount[b.status as keyof typeof statusCount]++
  }
  const statusData = [
    { name: 'Concluído',  value: statusCount.completed, color: '#6366F1' },
    { name: 'Confirmado', value: statusCount.confirmed,  color: '#10B981' },
    { name: 'Pendente',   value: statusCount.pending,    color: '#F59E0B' },
    { name: 'Cancelado',  value: statusCount.cancelled,  color: '#EF4444' },
  ].filter(s => s.value > 0)

  return (
    <RelatoriosClient
      revenue={curRevenue}
      revenueTrend={trend(curRevenue, prevRevenue)}
      bookingsCount={curCount}
      bookingsTrend={trend(curCount, prevCount)}
      avgTicket={curTicket}
      avgTicketTrend={trend(curTicket, prevTicket)}
      returnRate={returnRate}
      returnRateTrend={returnRate - prevReturnRate}
      weeklyData={weeklyData}
      profData={profData}
      profRevenueData={profRevenueData}
      serviceData={serviceData}
      statusData={statusData}
    />
  )
}
