import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import EmailTemplatesClient from './EmailTemplatesClient'

export const metadata = { title: 'Email Templates — SuperAdmin' }

/** Defaults inline — exibidos quando o registro ainda não existir no banco */
const DEFAULT_TEMPLATES = [
  // ── Onboarding ──────────────────────────────────────────────────────────────
  {
    key:       'onboarding-day-3',
    label:     'Dia 3 — Configure seus profissionais',
    subject:   'Configure seus profissionais e serviços no Kyra Atende',
    variables: ['nome'] as string[],
    html: `<h2>Olá! 👋</h2>
<p>Você está no Kyra Atende há 3 dias. Que tal aproveitar para cadastrar seus profissionais e serviços?</p>
<p>Com eles configurados, seus clientes já conseguem agendar online de forma automática.</p>
<p><a href="https://app.kyraatende.com.br/profissionais">Configurar agora →</a></p>`,
  },
  {
    key:       'onboarding-day-7',
    label:     'Dia 7 — Ative o WhatsApp',
    subject:   'Ative o WhatsApp e automatize seus agendamentos',
    variables: ['nome'] as string[],
    html: `<h2>Uma semana de Kyra Atende! 🎉</h2>
<p>Sabia que você pode receber e confirmar agendamentos diretamente pelo WhatsApp?</p>
<p>Com a integração ativa, seus clientes recebem lembretes automáticos e você reduz faltas em até 40%.</p>
<p><a href="https://app.kyraatende.com.br/whatsapp">Ativar WhatsApp →</a></p>`,
  },
  {
    key:       'onboarding-day-11',
    label:     'Dia 11 — Trial acaba em 3 dias',
    subject:   'Seu trial termina em 3 dias — não perca seu acesso',
    variables: ['nome', 'trial_ends_at'] as string[],
    html: `<h2>Atenção: seu período de trial está acabando ⏰</h2>
<p>Em 3 dias seu acesso ao Kyra Atende será limitado. Para continuar usando todos os recursos, escolha um plano agora.</p>
<p><a href="https://app.kyraatende.com.br/configuracoes/plano">Escolher meu plano →</a></p>`,
  },
  {
    key:       'onboarding-day-14',
    label:     'Dia 14 — Trial expirado',
    subject:   'Seu trial encerrou — veja como continuar',
    variables: ['nome'] as string[],
    html: `<h2>Seu trial no Kyra Atende encerrou</h2>
<p>Seus dados estão seguros por 30 dias. Para retomar o acesso completo, basta escolher um plano.</p>
<p>Planos a partir de R$49/mês — cancele a qualquer momento.</p>
<p><a href="https://app.kyraatende.com.br/configuracoes/plano">Reativar conta →</a></p>`,
  },

  // ── Agendamentos (emails transacionais para clientes) ────────────────────────
  {
    key:       'booking-created',
    label:     'Agendamento — Criado',
    subject:   'Agendamento confirmado — {{servico}}',
    variables: ['cliente', 'empresa', 'servico', 'profissional', 'data_hora'] as string[],
    html: `<p>Olá, <strong>{{cliente}}</strong>!</p>
<p>Seu agendamento com <strong>{{empresa}}</strong> foi recebido.</p>
<p><strong>Serviço:</strong> {{servico}}<br>
   <strong>Profissional:</strong> {{profissional}}<br>
   <strong>Data e hora:</strong> {{data_hora}}</p>
<p>Qualquer dúvida, entre em contato conosco.</p>`,
  },
  {
    key:       'booking-confirmed',
    label:     'Agendamento — Confirmado',
    subject:   'Agendamento confirmado ✅ — {{data_hora}}',
    variables: ['cliente', 'empresa', 'servico', 'profissional', 'data_hora'] as string[],
    html: `<p>Olá, <strong>{{cliente}}</strong>!</p>
<p>Seu agendamento com <strong>{{empresa}}</strong> está confirmado. Te esperamos!</p>
<p><strong>Serviço:</strong> {{servico}}<br>
   <strong>Profissional:</strong> {{profissional}}<br>
   <strong>Data e hora:</strong> {{data_hora}}</p>`,
  },
  {
    key:       'booking-cancelled',
    label:     'Agendamento — Cancelado',
    subject:   'Agendamento cancelado — {{servico}}',
    variables: ['cliente', 'empresa', 'servico', 'profissional', 'data_hora'] as string[],
    html: `<p>Olá, <strong>{{cliente}}</strong>!</p>
<p>Seu agendamento com <strong>{{empresa}}</strong> foi cancelado.</p>
<p><strong>Serviço:</strong> {{servico}}<br>
   <strong>Data e hora:</strong> {{data_hora}}</p>
<p>Para reagendar, entre em contato com <strong>{{empresa}}</strong>.</p>`,
  },
  {
    key:       'booking-reminder-24h',
    label:     'Lembrete — 24h antes',
    subject:   'Lembrete: seu agendamento é amanhã — {{data_hora}}',
    variables: ['cliente', 'empresa', 'servico', 'profissional', 'data_hora'] as string[],
    html: `<p>Olá, <strong>{{cliente}}</strong>!</p>
<p>Lembrete: você tem um agendamento amanhã com <strong>{{empresa}}</strong>.</p>
<p><strong>Serviço:</strong> {{servico}}<br>
   <strong>Profissional:</strong> {{profissional}}<br>
   <strong>Data e hora:</strong> {{data_hora}}</p>`,
  },
  {
    key:       'booking-reminder-1h',
    label:     'Lembrete — 1h antes',
    subject:   'Seu agendamento começa em 1 hora — {{hora}}',
    variables: ['cliente', 'empresa', 'servico', 'profissional', 'hora'] as string[],
    html: `<p>Olá, <strong>{{cliente}}</strong>!</p>
<p>Seu agendamento com <strong>{{empresa}}</strong> começa em 1 hora, às <strong>{{hora}}</strong>.</p>
<p><strong>Serviço:</strong> {{servico}}<br>
   <strong>Profissional:</strong> {{profissional}}</p>`,
  },
]

export default async function EmailTemplatesPage() {
  // Auth: createClient() com JWT do usuário (auth não passa por RLS)
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Dados: createAdminClient() para bypassar RLS na tabela email_templates
  const admin = createAdminClient()
  const { data: saved } = await admin
    .from('email_templates')
    .select('name, subject, body_html, is_active, variables, updated_at')
    .in('name', DEFAULT_TEMPLATES.map(t => t.key))

  // Indexa por name para merge rápido
  const savedMap = Object.fromEntries(
    (saved ?? []).map(t => [t.name, t])
  )

  // Mescla: usa o valor do banco se existir, senão usa o default inline
  const templates = DEFAULT_TEMPLATES.map(def => {
    const db = savedMap[def.key]
    return {
      ...def,
      subject:   db?.subject    ?? def.subject,
      html:      db?.body_html  ?? def.html,
      isActive:  db?.is_active  ?? true,
      variables: (db?.variables as string[] | null) ?? def.variables,
      updatedAt: db?.updated_at ?? null,
      isCustom:  !!db && (db.subject !== def.subject || db.body_html !== def.html),
    }
  })

  return <EmailTemplatesClient templates={templates} />
}
