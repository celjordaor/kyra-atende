'use client'

import {
  AreaChart, Area,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { StatTile } from '@/components/molecules/StatTile'
import GuidedTour from '@/components/molecules/GuidedTour'

// ─── Tipos ──────────────────────────────────────────────────────────────────

interface WeeklyPoint       { semana: string; receita: number }
interface ProfPoint         { profissional: string; agendamentos: number }
interface ProfRevenuePoint  { profissional: string; receita: number }
interface ServicePoint      { servico: string; agendamentos: number; receita: number }
interface StatusPoint       { name: string; value: number; color: string }

interface Props {
  revenue:          number
  revenueTrend:     number
  bookingsCount:    number
  bookingsTrend:    number
  avgTicket:        number
  avgTicketTrend:   number
  returnRate:       number
  returnRateTrend:  number
  weeklyData:       WeeklyPoint[]
  profData:         ProfPoint[]
  profRevenueData:  ProfRevenuePoint[]
  serviceData:      ServicePoint[]
  statusData:       StatusPoint[]
}


// ─── Formatadores ────────────────────────────────────────────────────────────

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

function truncate(s: string, max = 14) {
  return s.length > max ? s.slice(0, max - 1) + '…' : s
}

// ─── Tooltip personalizado ───────────────────────────────────────────────────

function CustomTooltip({ active, payload, label, currency }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--surface-2)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--r-md)',
      padding: '10px 14px',
      fontSize: '13px',
      color: 'var(--ink-body)',
      boxShadow: '0 2px 8px rgba(0,0,0,.08)',
    }}>
      {label && <p style={{ fontWeight: 600, marginBottom: 4, color: 'var(--ink)' }}>{label}</p>}
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ margin: '2px 0', color: p.color }}>
          {p.name}: <strong>{currency ? fmtBRL(p.value) : p.value}</strong>
        </p>
      ))}
    </div>
  )
}

// ─── Container de card ───────────────────────────────────────────────────────

function ChartCard({ title, children, span2 }: { title: string; children: React.ReactNode; span2?: boolean }) {
  return (
    <div style={{
      background: 'var(--surface-2)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--r-lg)',
      padding: '20px 20px 12px',
      gridColumn: span2 ? 'span 2' : undefined,
    }}>
      <p style={{
        fontSize: '14px',
        fontWeight: 600,
        color: 'var(--ink)',
        margin: '0 0 16px',
      }}>{title}</p>
      {children}
    </div>
  )
}

// ─── Estado vazio ────────────────────────────────────────────────────────────

function EmptyState({ label }: { label: string }) {
  return (
    <div style={{
      height: 180,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      color: 'var(--subtle)',
      fontSize: 13,
    }}>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
        stroke="var(--border-mid)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
      {label}
    </div>
  )
}

// ─── Componente principal ────────────────────────────────────────────────────

export default function RelatoriosClient({
  revenue, revenueTrend,
  bookingsCount, bookingsTrend,
  avgTicket, avgTicketTrend,
  returnRate, returnRateTrend,
  weeklyData, profData, profRevenueData, serviceData, statusData,
}: Props) {
  const monthLabel = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  const hasWeekly      = weeklyData.some(w => w.receita > 0)
  const hasProf        = profData.length > 0
  const hasProfRevenue = profRevenueData.some(p => p.receita > 0)
  const hasService     = serviceData.length > 0
  const hasStatus      = statusData.length > 0

  return (
    <>
      <GuidedTour
        tourKey="relatorios"
        steps={[
          {
            target:    '#kyra-relatorios-header',
            title:     'Relatórios do mês',
            body:      'Acompanhe o desempenho do seu negócio com dados atualizados do mês atual. As métricas são comparadas com o mês anterior.',
            placement: 'bottom',
          },
          {
            target:    '#kyra-relatorios-charts',
            title:     'Gráficos e análises',
            body:      'Visualize receita semanal, agendamentos por profissional, serviços mais vendidos e distribuição por status — tudo em um só lugar.',
            placement: 'top',
          },
        ]}
      />

      {/* Cabeçalho */}
      <div id="kyra-relatorios-header" style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--ink)', margin: '0 0 4px', letterSpacing: '-0.3px' }}>
          Relatórios
        </h1>
        <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0, textTransform: 'capitalize' }}>
          {monthLabel}
        </p>
      </div>

      {/* StatTiles */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: 16,
        marginBottom: 28,
      }}>
        <StatTile label="Receita do mês"          value={revenue}              trend={revenueTrend}    icon="dollar"   color="green"  formatNumber />
        <StatTile label="Agendamentos realizados"  value={bookingsCount}        trend={bookingsTrend}   icon="calendar" color="blue" />
        <StatTile label="Ticket médio"             value={Math.round(avgTicket)} trend={avgTicketTrend} icon="chart"    color="blue"   formatNumber />
        <StatTile label="Taxa de retorno"          value={returnRate}           trend={returnRateTrend} icon="check"    color={returnRate >= 50 ? 'green' : 'orange'} suffix="%" />
      </div>

      {/* Gráficos */}
      <div
        id="kyra-relatorios-charts"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 20,
        }}
      >

        {/* 1 — Receita por semana */}
        <ChartCard title="Receita por semana" span2>
          {hasWeekly ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={weeklyData} margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradReceita" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="var(--brand)" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="var(--brand)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="semana" tick={{ fontSize: 12, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 12, fill: 'var(--muted)' }} axisLine={false} tickLine={false} width={52} />
                <Tooltip content={<CustomTooltip currency />} />
                <Area
                  type="monotone"
                  dataKey="receita"
                  name="Receita"
                  stroke="var(--brand)"
                  strokeWidth={2}
                  fill="url(#gradReceita)"
                  dot={{ r: 3, fill: 'var(--brand)', strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: 'var(--brand)' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : <EmptyState label="Nenhum agendamento confirmado nas últimas 8 semanas" />}
        </ChartCard>

        {/* 2 — Por profissional */}
        <ChartCard title="Agendamentos por profissional">
          {hasProf ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={profData} layout="vertical" margin={{ top: 0, right: 16, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12, fill: 'var(--muted)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="profissional"
                  width={100}
                  tick={{ fontSize: 12, fill: 'var(--ink-soft)' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v => truncate(v, 14)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="agendamentos" name="Agendamentos" fill="var(--brand)" radius={[0, 4, 4, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyState label="Nenhum agendamento confirmado este mês" />}
        </ChartCard>

        {/* 3 — Receita por profissional */}
        <ChartCard title="Receita por profissional">
          {hasProfRevenue ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={profRevenueData}
                layout="vertical"
                margin={{ top: 0, right: 20, left: 4, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis
                  type="number"
                  tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 12, fill: 'var(--muted)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="profissional"
                  width={100}
                  tick={{ fontSize: 12, fill: 'var(--ink-soft)' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v => truncate(v, 14)}
                />
                <Tooltip content={<CustomTooltip currency />} />
                <Bar
                  dataKey="receita"
                  name="Receita"
                  fill="var(--green)"
                  radius={[0, 4, 4, 0]}
                  barSize={18}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState label="Nenhuma receita registrada este mês" />
          )}
        </ChartCard>

        {/* 5 — Serviços mais vendidos */}
        <ChartCard title="Serviços mais vendidos">
          {hasService ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={serviceData} layout="vertical" margin={{ top: 0, right: 16, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12, fill: 'var(--muted)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="servico"
                  width={100}
                  tick={{ fontSize: 12, fill: 'var(--ink-soft)' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v => truncate(v, 14)}
                />
                <Tooltip content={<CustomTooltip currency />} />
                <Bar dataKey="agendamentos" name="Agendamentos" fill="var(--green)"  radius={[0, 4, 4, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyState label="Nenhum agendamento confirmado este mês" />}
        </ChartCard>

        {/* 6 — Distribuição por status */}
        <ChartCard title="Distribuição por status">
          {hasStatus ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`}
                  labelLine={false}
                >
                  {statusData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => [v, 'Agendamentos']} />
                <Legend
                  iconType="circle"
                  iconSize={10}
                  formatter={(value) => (
                    <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyState label="Nenhum agendamento este mês" />}
        </ChartCard>

      </div>
    </>
  )
}
