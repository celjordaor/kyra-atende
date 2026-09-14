import { createClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'
import { StatTile, GuidedTour } from '@/components/molecules'
import { DashboardBookingsSection } from './DashboardBookingsSection'
import type { Booking } from '@/components/organisms'
import type { NewClient, ServiceRevenue } from './DashboardBookingsSection'

function todayRange() {
  const start = new Date(); start.setHours(0, 0, 0, 0)
  const end   = new Date(); end.setHours(23, 59, 59, 999)
  return { start: start.toISOString(), end: end.toISOString() }
}

function thisMonthRange() {
  const now   = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()
  return { start, end }
}

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const tenantId = (user.app_metadata?.tenant_id ?? '') as string

  if (!tenantId) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '60vh', gap: '16px', textAlign: 'center',
      }}>
        <h1 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--ink)' }}>
          Configuração necessária
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--muted)', maxWidth: '360px' }}>
          Sua conta foi criada mas a empresa ainda não foi configurada.
          Entre em contato com o suporte ou crie uma nova conta em{' '}
          <a href="/cadastro" style={{ color: 'var(--brand)' }}>/cadastro</a>.
        </p>
      </div>
    )
  }

  const today     = todayRange()
  const thisMonth = thisMonthRange()

  // ── Busca dados em paralelo ────────────────────────────────────
  const [
    tenantRes,
    todayRes,
    monthRes,
    pendingRes,
    confirmedMonthRes,
    clientsRes,
    revenueTodayRes,
    revenueMonthRes,
    bookingsTodayRes,
    pendingListRes,
    newClientsRes,
    monthBookingsRes,
  ] = await Promise.all([

    // Tenant name
    supabase.from('tenants').select('name').eq('id', tenantId).single(),

    // Agendamentos hoje (não cancelados)
    supabase.from('bookings').select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .gte('start_at', today.start).lte('start_at', today.end)
      .neq('status', 'cancelled'),

    // Agendamentos este mês (não cancelados)
    supabase.from('bookings').select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .gte('start_at', thisMonth.start).lte('start_at', thisMonth.end)
      .neq('status', 'cancelled'),

    // Pendentes
    supabase.from('bookings').select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId).eq('status', 'pending'),

    // Confirmados + concluídos este mês (para taxa de confirmação)
    supabase.from('bookings').select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .gte('start_at', thisMonth.start).lte('start_at', thisMonth.end)
      .in('status', ['confirmed', 'completed']),

    // Total de clientes
    supabase.from('clients').select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId),

    // Receita hoje (serviços confirmados/concluídos)
    supabase.from('bookings')
      .select('services(price)')
      .eq('tenant_id', tenantId)
      .in('status', ['confirmed', 'completed'])
      .gte('start_at', today.start).lte('start_at', today.end),

    // Receita este mês
    supabase.from('bookings')
      .select('services(price)')
      .eq('tenant_id', tenantId)
      .in('status', ['confirmed', 'completed'])
      .gte('start_at', thisMonth.start).lte('start_at', thisMonth.end),

    // Agenda de hoje (lista completa)
    supabase.from('bookings')
      .select('id, client_name, client_phone, start_at, end_at, status, services(name, price)')
      .eq('tenant_id', tenantId)
      .gte('start_at', today.start).lte('start_at', today.end)
      .neq('status', 'cancelled')
      .order('start_at', { ascending: true }),

    // Pendentes (lista para painel direito)
    supabase.from('bookings')
      .select('id, client_name, start_at, end_at, status, services(name)')
      .eq('tenant_id', tenantId).eq('status', 'pending')
      .order('start_at', { ascending: true }).limit(5),

    // Novos clientes (últimos 5)
    supabase.from('clients')
      .select('id, name, created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false }).limit(5),

    // Agendamentos do mês com serviço + preço (para receita por serviço)
    supabase.from('bookings')
      .select('id, services(name, price)')
      .eq('tenant_id', tenantId)
      .gte('start_at', thisMonth.start).lte('start_at', thisMonth.end)
      .in('status', ['confirmed', 'completed']),
  ])

  // ── Valores derivados ──────────────────────────────────────────
  const tenantName    = tenantRes.data?.name ?? ''
  const countToday    = todayRes.count    ?? 0
  const countMonth    = monthRes.count    ?? 0
  const countPending  = pendingRes.count  ?? 0
  const countClients  = clientsRes.count  ?? 0
  const countConfirmed = confirmedMonthRes.count ?? 0

  const revenueToday = (revenueTodayRes.data ?? [])
    .reduce((s: number, b: any) => s + (b.services?.price ?? 0), 0)
  const revenueMonth = (revenueMonthRes.data ?? [])
    .reduce((s: number, b: any) => s + (b.services?.price ?? 0), 0)

  const ticketMedio      = countMonth > 0 ? revenueMonth / countMonth : 0
  const taxaConfirmacao  = countMonth > 0 ? Math.round((countConfirmed / countMonth) * 100) : 0

  // Receita por serviço (confirmados/concluídos este mês)
  const svcMap: Record<string, { count: number; revenue: number }> = {}
  for (const b of monthBookingsRes.data ?? []) {
    const name  = (b as any).services?.name  ?? 'Outros'
    const price = (b as any).services?.price ?? 0
    if (!svcMap[name]) svcMap[name] = { count: 0, revenue: 0 }
    svcMap[name].count++
    svcMap[name].revenue += price
  }
  const topServices: ServiceRevenue[] = Object.entries(svcMap)
    .sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 5)
    .map(([name, { count, revenue }]) => ({ name, count, revenue }))

  // Bookings tipados
  const todayBookings: Booking[] = (bookingsTodayRes.data ?? []).map((b: any) => ({
    id:          b.id,
    clientName:  b.client_name,
    clientPhone: b.client_phone ?? '',
    service:     b.services?.name ?? 'Serviço',
    startAt:     b.start_at,
    endAt:       b.end_at,
    status:      b.status as Booking['status'],
    price:       b.services?.price,
  }))

  const pendingBookings: Booking[] = (pendingListRes.data ?? []).map((b: any) => ({
    id:          b.id,
    clientName:  b.client_name,
    service:     b.services?.name ?? 'Serviço',
    startAt:     b.start_at,
    endAt:       b.end_at,
    status:      'pending' as const,
  }))

  const newClients: NewClient[] = (newClientsRes.data ?? []).map((c: any) => ({
    id:         c.id,
    name:       c.name,
    created_at: c.created_at,
  }))

  const now      = new Date()
  const greeting = now.getHours() < 12 ? 'Bom dia' : now.getHours() < 18 ? 'Boa tarde' : 'Boa noite'
  const dateLabel = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

  const DASHBOARD_TOUR = [
    {
      title: 'Bem-vindo ao seu painel! 👋',
      body:  'Aqui você acompanha em tempo real o que está acontecendo no seu negócio: agendamentos, receita e clientes — tudo num só lugar.',
    },
    {
      target: '#stat-tiles',
      title:  'Tiles de receita',
      body:   'Veja a receita de hoje e do mês atual, calculada sobre agendamentos confirmados e concluídos.',
    },
    {
      target: '#dashboard-content',
      title:  'Agenda de hoje',
      body:   'Acompanhe todos os agendamentos do dia, confirme pendentes e marque serviços como concluídos.',
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

      <GuidedTour tourKey="dashboard" steps={DASHBOARD_TOUR} />

      {/* ── Cabeçalho: saudação + receita ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 600, color: 'var(--ink)', margin: '0 0 4px' }}>
            {greeting}, {tenantName} 👋
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--muted)', margin: 0, textTransform: 'capitalize' }}>
            {dateLabel}
            {countPending > 0 && (
              <>
                {' · '}
                <span style={{ color: 'var(--orange)', fontWeight: 500 }}>
                  {countPending} agendamento{countPending !== 1 ? 's' : ''} pendente{countPending !== 1 ? 's' : ''} aguardando confirmação
                </span>
              </>
            )}
          </p>
        </div>

        {/* Tiles de receita */}
        <div style={{ display: 'flex', gap: '12px', flexShrink: 0 }}>
          <StatTile label="Receita hoje"     value={fmtBRL(revenueToday)}  icon="dollar" color="green" formatNumber={false} />
          <StatTile label="Receita este mês" value={fmtBRL(revenueMonth)}  icon="dollar" color="blue"  formatNumber={false} />
        </div>
      </div>

      {/* ── KPI tiles (6) ── */}
      <div id="stat-tiles" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px' }}>
        <StatTile label="Agendamentos hoje"      value={countToday}    icon="calendar" color="blue"   />
        <StatTile label="Agendamentos este mês"  value={countMonth}    icon="chart"    color="green"  />
        <StatTile label="Pendentes confirmação"  value={countPending}  icon="clock"    color="orange" />
        <StatTile label="Total de clientes"      value={countClients}  icon="users"    color="blue"   />
        <StatTile label="Ticket médio"           value={fmtBRL(ticketMedio)}   icon="dollar" color="green"  formatNumber={false} />
        <StatTile label="Taxa de confirmação"    value={taxaConfirmacao}       icon="check"  color="blue"   suffix="%" />
      </div>

      {/* ── Seção principal (agenda + pendentes) ── */}
      <div id="dashboard-content">
        <DashboardBookingsSection
          todayBookings={todayBookings}
          pendingBookings={pendingBookings}
          newClients={newClients}
          topServices={topServices}
        />
      </div>
    </div>
  )
}
