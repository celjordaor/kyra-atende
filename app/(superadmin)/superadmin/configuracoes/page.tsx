import { createClient } from '@/lib/supabase/server'
import { GuidedTour } from '@/components/molecules/GuidedTour'

export const metadata = { title: 'Configurações — SuperAdmin Kyra' }

export default async function SuperAdminConfiguracoesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, email')
    .eq('id', user!.id)
    .single()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', maxWidth: 600 }}>
      <GuidedTour
        tourKey="superadmin-configuracoes"
        steps={[
          {
            target: '#sa-config-header',
            title: 'Configurações do sistema',
            body: 'Gerencie as configurações globais da plataforma Kyra.',
            placement: 'bottom',
          },
        ]}
      />

      <div id="sa-config-header">
        <h1 style={{ fontSize: '22px', fontWeight: 600, color: 'var(--ink)', margin: '0 0 4px' }}>
          Configurações
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--muted)', margin: 0 }}>
          Configurações globais da plataforma
        </p>
      </div>

      {/* Perfil SuperAdmin */}
      <section
        style={{
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-lg)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <p style={{ fontWeight: 600, color: 'var(--ink)', fontSize: 15, marginBottom: 4 }}>
          Sua conta
        </p>
        <div>
          <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 2 }}>Nome</p>
          <p style={{ fontSize: 14, color: 'var(--ink-body)', fontWeight: 500 }}>
            {profile?.name ?? '—'}
          </p>
        </div>
        <div>
          <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 2 }}>E-mail</p>
          <p style={{ fontSize: 14, color: 'var(--ink-body)', fontWeight: 500 }}>
            {profile?.email ?? user?.email ?? '—'}
          </p>
        </div>
        <div>
          <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 2 }}>Papel</p>
          <span
            style={{
              display: 'inline-block',
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--brand)',
              background: 'var(--brand-dim)',
              padding: '2px 10px',
              borderRadius: 99,
            }}
          >
            SuperAdmin
          </span>
        </div>
      </section>

      {/* Integrações globais */}
      <section
        style={{
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-lg)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <p style={{ fontWeight: 600, color: 'var(--ink)', fontSize: 15 }}>
          Integrações da plataforma
        </p>
        {[
          { name: 'Twilio (WhatsApp MVP)',      status: 'Configurado',  color: 'var(--green)' },
          { name: 'Resend (E-mail transacional)', status: 'Configurado', color: 'var(--green)' },
          { name: 'BullMQ / Redis',             status: 'Pendente',     color: 'var(--orange)' },
          { name: 'Evolution API (WhatsApp Scale)', status: 'Pendente', color: 'var(--orange)' },
          { name: 'N8N (Automações)',            status: 'Pendente',     color: 'var(--orange)' },
        ].map(({ name, status, color }) => (
          <div
            key={name}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: 12,
              borderBottom: '1px solid var(--border)',
              gap: 12,
            }}
          >
            <p style={{ fontSize: 14, color: 'var(--ink-body)' }}>{name}</p>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color,
                background: color + '18',
                padding: '2px 10px',
                borderRadius: 99,
                flexShrink: 0,
              }}
            >
              {status}
            </span>
          </div>
        ))}
      </section>

      {/* Variáveis de ambiente */}
      <section
        style={{
          background: 'var(--surface-3)',
          border: '1px dashed var(--border-mid)',
          borderRadius: 'var(--r-lg)',
          padding: '20px 24px',
        }}
      >
        <p style={{ fontWeight: 600, color: 'var(--ink-soft)', fontSize: 13, marginBottom: 8 }}>
          ⚙️ Variáveis de ambiente necessárias
        </p>
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            'NEXT_PUBLIC_SUPABASE_URL',
            'NEXT_PUBLIC_SUPABASE_ANON_KEY',
            'SUPABASE_SERVICE_ROLE_KEY',
            'NEXT_PUBLIC_VAPID_PUBLIC_KEY',
            'VAPID_PRIVATE_KEY',
            'TWILIO_ACCOUNT_SID',
            'TWILIO_AUTH_TOKEN',
            'RESEND_API_KEY',
            'REDIS_URL',
          ].map(v => (
            <li key={v} style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--ink-soft)' }}>
              {v}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
