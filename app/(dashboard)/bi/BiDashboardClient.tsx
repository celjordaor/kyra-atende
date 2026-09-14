'use client'

import {
  AreaChart, Area,
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { StatTile } from '@/components/molecules/StatTile'

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface MonthlyPoint  { mes: string; receita: number }
interface ClientsPoint  { mes: string; clientes: number }
interface HeatCell      { day: string; slot: string; value: number }
interface TopClient     { name: string; receita: number; visitas: number; ltv: number; ticketMedio: number }

interface Props {
  totalRevenue12:  number
  totalBookings12: number
  uniqueClients12: number
  avgLtv:          number
  monthlyRevenue:  MonthlyPoint[]
  monthlyClients:  ClientsPoint[]
  heatmapData:     HeatCell[]
  heatmapDays:     string[]
  heatmapSlots:    string[]
  topClients:      TopClient[]
}


// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

function CustomTooltip({ active, payload, label, currency }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--surface-2)', border: '1px solid var(--border)',
      borderRadius: 'var(--r-md)', padding: '10px 14px', fontSize: '13px',
      color: 'var(--ink-body)', boxShadow: '0 2px 8px rgba(0,0,0,.08)',
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

function ChartCard({ title, id, children }: { title: string; id?: string; children: React.ReactNode }) {
  return (
    <div id={id} style={{
      background: 'var(--surface-2)', border: '1px solid var(--border)',
      borderRadius: 'var(--r-lg)', padding: '20px 20px 12px',
    }}>
      <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)', margin: '0 0 16px' }}>{title}</p>
      {children}
    </div>
  )
}

function EmptyState({ label }: { label: string }) {
  return (
    <div style={{
      height: 180, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 8,
      color: 'var(--subtle)', fontSize: 13,
    }}>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
        stroke="var(--border-mid)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
      {label}
    </div>
  )
}

// ─── Heatmap ─────────────────────────────────────────────────────────────────

function Heatmap({ data, days, slots }: { data: HeatCell[]; days: string[]; slots: string[] }) {
  const maxVal = Math.max(1, ...data.map(c => c.value))

  function cellColor(v: number): string {
    if (v === 0) return 'var(--surface-3)'
    const intensity = Math.min(v / maxVal, 1)
    if (intensity < 0.25) return 'var(--brand-faint)'
    if (intensity < 0.50) return 'var(--brand-dim)'
    if (intensity < 0.75) return '#93C5FD'
    return 'var(--brand)'
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: `56px repeat(${slots.length}, 1fr)`, gap: '3px', minWidth: '520px' }}>
        {/* Header de slots */}
        <div />
        {slots.map(s => (
          <div key={s} style={{ fontSize: '10px', color: 'var(--muted)', textAlign: 'center', paddingBottom: '4px' }}>{s}</div>
        ))}

        {/* Linhas por dia */}
        {days.map(day => (
          <>
            <div key={`lbl-${day}`} style={{
              fontSize: '12px', color: 'var(--ink-soft)', fontWeight: 500,
              display: 'flex', alignItems: 'center', paddingRight: '8px',
            }}>{day}</div>
            {slots.map(slot => {
              const cell = data.find(c => c.day === day && c.slot === slot)
              const v = cell?.value ?? 0
              return (
                <div
                  key={`${day}-${slot}`}
                  title={`${day} ${slot} — ${v} agendamento${v !== 1 ? 's' : ''}`}
                  style={{
                    height: '28px', borderRadius: '4px',
                    background: cellColor(v),
                    transition: 'opacity .15s',
                    cursor: v > 0 ? 'default' : undefined,
                  }}
                />
              )
            })}
          </>
        ))}
      </div>

      {/* Legenda */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px', justifyContent: 'flex-end' }}>
        <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Menos</span>
        {['var(--surface-3)', 'var(--brand-faint)', 'var(--brand-dim)', '#93C5FD', 'var(--brand)'].map((c, i) => (
          <div key={i} style={{ width: '16px', height: '16px', borderRadius: '3px', background: c }} />
        ))}
        <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Mais</span>
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function BiDashboardClient({
  totalRevenue12, totalBookings12, uniqueClients12, avgLtv,
  monthlyRevenue, monthlyClients, heatmapData, heatmapDays, heatmapSlots,
  topClients,
}: Props) {
  const hasRevenue  = monthlyRevenue.some(m => m.receita > 0)
  const hasClients  = monthlyClients.some(m => m.clientes > 0)
  const hasHeatmap  = heatmapData.some(c => c.value > 0)
  const hasTopClts  = topClients.length > 0

  return (
    <>
      {/* Cabeçalho */}
      <div id="bi-header" style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--ink)', margin: '0 0 4px', letterSpacing: '-0.3px' }}>
          BI Dashboard
        </h1>
        <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0 }}>
          Análise estratégica dos últimos 12 meses
        </p>
      </div>

      {/* KPIs */}
      <div id="bi-kpis" style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: 16, marginBottom: 28,
      }}>
        <StatTile label="Receita (12 meses)"      value={totalRevenue12}  icon="dollar"   color="green"  formatNumber />
        <StatTile label="Agendamentos (12 meses)" value={totalBookings12} icon="calendar" color="blue" />
        <StatTile label="Clientes únicos"         value={uniqueClients12} icon="users"    color="blue" />
        <StatTile label="LTV médio (top 10)"      value={avgLtv}          icon="chart"    color="green"  formatNumber />
      </div>

      {/* Tendências mensais */}
      <div id="bi-trends" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20, marginBottom: 20 }}>

        {/* Receita mensal */}
        <ChartCard title="Receita mensal (12 meses)">
          {hasRevenue ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={monthlyRevenue} margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="biGradReceita" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="var(--brand)" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="var(--brand)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: 'var(--muted)' }} axisLine={false} tickLine={false} width={52} />
                <Tooltip content={<CustomTooltip currency />} />
                <Area type="monotone" dataKey="receita" name="Receita"
                  stroke="var(--brand)" strokeWidth={2} fill="url(#biGradReceita)"
                  dot={{ r: 3, fill: 'var(--brand)', strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: 'var(--brand)' }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : <EmptyState label="Nenhum agendamento concluído nos últimos 12 meses" />}
        </ChartCard>

        {/* Clientes únicos por mês */}
        <ChartCard title="Clientes únicos por mês">
          {hasClients ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyClients} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--muted)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="clientes" name="Clientes" fill="var(--green)" radius={[4, 4, 0, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyState label="Nenhum agendamento nos últimos 12 meses" />}
        </ChartCard>
      </div>

      {/* Heatmap */}
      <div style={{ marginBottom: 20 }}>
        <ChartCard title="Heatmap de agendamentos — dia × horário" id="bi-heatmap">
          {hasHeatmap ? (
            <Heatmap data={heatmapData} days={heatmapDays} slots={heatmapSlots} />
          ) : <EmptyState label="Nenhum agendamento nos últimos 12 meses" />}
        </ChartCard>
      </div>

      {/* Top clientes */}
      <div id="bi-top-clients">
        <ChartCard title="Top 10 clientes por receita (12 meses)">
          {hasTopClts ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr>
                    {['#', 'Cliente', 'Visitas', 'Ticket médio', 'LTV (12 m)'].map(h => (
                      <th key={h} style={{
                        textAlign: h === '#' || h === 'Visitas' ? 'center' : h === 'Cliente' ? 'left' : 'right',
                        padding: '8px 12px', color: 'var(--muted)', fontWeight: 500,
                        borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {topClients.map((c, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-3)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <td style={{ textAlign: 'center', padding: '10px 12px', color: 'var(--muted)', fontWeight: 600 }}>
                        {i + 1}
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--ink-body)', fontWeight: 500 }}>
                        {c.name}
                      </td>
                      <td style={{ textAlign: 'center', padding: '10px 12px', color: 'var(--ink-soft)' }}>
                        {c.visitas}
                      </td>
                      <td style={{ textAlign: 'right', padding: '10px 12px', color: 'var(--ink-soft)' }}>
                        {fmtBRL(c.ticketMedio)}
                      </td>
                      <td style={{ textAlign: 'right', padding: '10px 12px', color: 'var(--green)', fontWeight: 700 }}>
                        {fmtBRL(c.ltv)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <EmptyState label="Nenhum agendamento concluído nos últimos 12 meses" />}
        </ChartCard>
      </div>
    </>
  )
}