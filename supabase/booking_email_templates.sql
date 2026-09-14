-- ============================================================
-- Booking transactional email templates + reminder flags
-- Run via Supabase SQL Editor (service role)
-- ============================================================

-- 1. Colunas de controle de deduplicação de lembretes
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS reminder_email_sent     boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_24h_email_sent boolean DEFAULT false;

-- 2. Templates de email para eventos de agendamento
-- Variáveis disponíveis: {{cliente}}, {{empresa}}, {{servico}}, {{profissional}}, {{data_hora}}, {{hora}}

INSERT INTO public.email_templates (name, subject, body_html, is_active)
VALUES

-- ── Agendamento criado ──────────────────────────────────────────────────────
(
  'booking-created',
  'Agendamento confirmado — {{servico}}',
  '
<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #E5E7EB">
  <div style="background:#1E6EF5;padding:28px 32px">
    <h1 style="color:#ffffff;margin:0;font-size:20px;font-weight:700">Seu agendamento foi recebido! 🎉</h1>
  </div>
  <div style="padding:28px 32px">
    <p style="color:#111827;font-size:15px;margin:0 0 20px">Olá, <strong>{{cliente}}</strong>!</p>
    <p style="color:#374151;font-size:15px;margin:0 0 24px">
      Recebemos o seu agendamento com <strong>{{empresa}}</strong>. Confira os detalhes:
    </p>
    <table style="width:100%;border-collapse:collapse;background:#F9FAFB;border-radius:8px;overflow:hidden">
      <tr><td style="padding:12px 16px;border-bottom:1px solid #E5E7EB;color:#6B7280;font-size:13px;width:40%">Serviço</td>
          <td style="padding:12px 16px;border-bottom:1px solid #E5E7EB;color:#111827;font-size:14px;font-weight:600">{{servico}}</td></tr>
      <tr><td style="padding:12px 16px;border-bottom:1px solid #E5E7EB;color:#6B7280;font-size:13px">Profissional</td>
          <td style="padding:12px 16px;border-bottom:1px solid #E5E7EB;color:#111827;font-size:14px">{{profissional}}</td></tr>
      <tr><td style="padding:12px 16px;color:#6B7280;font-size:13px">Data e hora</td>
          <td style="padding:12px 16px;color:#111827;font-size:14px;font-weight:600">{{data_hora}}</td></tr>
    </table>
    <p style="color:#6B7280;font-size:13px;margin:24px 0 0">
      Qualquer dúvida, entre em contato com <strong>{{empresa}}</strong> diretamente.
    </p>
  </div>
</div>
',
  true
),

-- ── Agendamento confirmado ──────────────────────────────────────────────────
(
  'booking-confirmed',
  'Agendamento confirmado ✅ — {{data_hora}}',
  '
<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #E5E7EB">
  <div style="background:#059669;padding:28px 32px">
    <h1 style="color:#ffffff;margin:0;font-size:20px;font-weight:700">Agendamento confirmado ✅</h1>
  </div>
  <div style="padding:28px 32px">
    <p style="color:#111827;font-size:15px;margin:0 0 20px">Olá, <strong>{{cliente}}</strong>!</p>
    <p style="color:#374151;font-size:15px;margin:0 0 24px">
      Seu agendamento com <strong>{{empresa}}</strong> está confirmado. Te esperamos!
    </p>
    <table style="width:100%;border-collapse:collapse;background:#F9FAFB;border-radius:8px;overflow:hidden">
      <tr><td style="padding:12px 16px;border-bottom:1px solid #E5E7EB;color:#6B7280;font-size:13px;width:40%">Serviço</td>
          <td style="padding:12px 16px;border-bottom:1px solid #E5E7EB;color:#111827;font-size:14px;font-weight:600">{{servico}}</td></tr>
      <tr><td style="padding:12px 16px;border-bottom:1px solid #E5E7EB;color:#6B7280;font-size:13px">Profissional</td>
          <td style="padding:12px 16px;border-bottom:1px solid #E5E7EB;color:#111827;font-size:14px">{{profissional}}</td></tr>
      <tr><td style="padding:12px 16px;color:#6B7280;font-size:13px">Data e hora</td>
          <td style="padding:12px 16px;color:#111827;font-size:14px;font-weight:600">{{data_hora}}</td></tr>
    </table>
    <p style="color:#6B7280;font-size:13px;margin:24px 0 0">
      Se precisar reagendar, entre em contato com <strong>{{empresa}}</strong>.
    </p>
  </div>
</div>
',
  true
),

-- ── Agendamento cancelado ───────────────────────────────────────────────────
(
  'booking-cancelled',
  'Agendamento cancelado — {{servico}}',
  '
<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #E5E7EB">
  <div style="background:#DC2626;padding:28px 32px">
    <h1 style="color:#ffffff;margin:0;font-size:20px;font-weight:700">Agendamento cancelado</h1>
  </div>
  <div style="padding:28px 32px">
    <p style="color:#111827;font-size:15px;margin:0 0 20px">Olá, <strong>{{cliente}}</strong>!</p>
    <p style="color:#374151;font-size:15px;margin:0 0 24px">
      Seu agendamento com <strong>{{empresa}}</strong> foi cancelado. Confira os detalhes abaixo.
    </p>
    <table style="width:100%;border-collapse:collapse;background:#F9FAFB;border-radius:8px;overflow:hidden">
      <tr><td style="padding:12px 16px;border-bottom:1px solid #E5E7EB;color:#6B7280;font-size:13px;width:40%">Serviço</td>
          <td style="padding:12px 16px;border-bottom:1px solid #E5E7EB;color:#111827;font-size:14px;font-weight:600">{{servico}}</td></tr>
      <tr><td style="padding:12px 16px;border-bottom:1px solid #E5E7EB;color:#6B7280;font-size:13px">Profissional</td>
          <td style="padding:12px 16px;border-bottom:1px solid #E5E7EB;color:#111827;font-size:14px">{{profissional}}</td></tr>
      <tr><td style="padding:12px 16px;color:#6B7280;font-size:13px">Data e hora</td>
          <td style="padding:12px 16px;color:#111827;font-size:14px">{{data_hora}}</td></tr>
    </table>
    <p style="color:#374151;font-size:14px;margin:24px 0 8px">
      Gostaria de reagendar? Entre em contato com <strong>{{empresa}}</strong>.
    </p>
    <p style="color:#6B7280;font-size:13px;margin:0">Lamentamos o transtorno.</p>
  </div>
</div>
',
  true
),

-- ── Lembrete 24h ───────────────────────────────────────────────────────────
(
  'booking-reminder-24h',
  'Lembrete: seu agendamento é amanhã — {{data_hora}}',
  '
<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #E5E7EB">
  <div style="background:#1E6EF5;padding:28px 32px">
    <h1 style="color:#ffffff;margin:0;font-size:20px;font-weight:700">Seu agendamento é amanhã ⏰</h1>
  </div>
  <div style="padding:28px 32px">
    <p style="color:#111827;font-size:15px;margin:0 0 20px">Olá, <strong>{{cliente}}</strong>!</p>
    <p style="color:#374151;font-size:15px;margin:0 0 24px">
      Este é um lembrete do seu agendamento amanhã com <strong>{{empresa}}</strong>.
    </p>
    <table style="width:100%;border-collapse:collapse;background:#F9FAFB;border-radius:8px;overflow:hidden">
      <tr><td style="padding:12px 16px;border-bottom:1px solid #E5E7EB;color:#6B7280;font-size:13px;width:40%">Serviço</td>
          <td style="padding:12px 16px;border-bottom:1px solid #E5E7EB;color:#111827;font-size:14px;font-weight:600">{{servico}}</td></tr>
      <tr><td style="padding:12px 16px;border-bottom:1px solid #E5E7EB;color:#6B7280;font-size:13px">Profissional</td>
          <td style="padding:12px 16px;border-bottom:1px solid #E5E7EB;color:#111827;font-size:14px">{{profissional}}</td></tr>
      <tr><td style="padding:12px 16px;color:#6B7280;font-size:13px">Data e hora</td>
          <td style="padding:12px 16px;color:#111827;font-size:14px;font-weight:600">{{data_hora}}</td></tr>
    </table>
    <p style="color:#6B7280;font-size:13px;margin:24px 0 0">
      Precisa cancelar ou reagendar? Entre em contato com <strong>{{empresa}}</strong> o quanto antes.
    </p>
  </div>
</div>
',
  true
),

-- ── Lembrete 1h ────────────────────────────────────────────────────────────
(
  'booking-reminder-1h',
  'Seu agendamento começa em 1 hora — {{hora}}',
  '
<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #E5E7EB">
  <div style="background:#D97706;padding:28px 32px">
    <h1 style="color:#ffffff;margin:0;font-size:20px;font-weight:700">Falta 1 hora para seu agendamento! ⏱</h1>
  </div>
  <div style="padding:28px 32px">
    <p style="color:#111827;font-size:15px;margin:0 0 20px">Olá, <strong>{{cliente}}</strong>!</p>
    <p style="color:#374151;font-size:15px;margin:0 0 24px">
      Seu agendamento com <strong>{{empresa}}</strong> começa às <strong>{{hora}}</strong>. Não se esqueça!
    </p>
    <table style="width:100%;border-collapse:collapse;background:#F9FAFB;border-radius:8px;overflow:hidden">
      <tr><td style="padding:12px 16px;border-bottom:1px solid #E5E7EB;color:#6B7280;font-size:13px;width:40%">Serviço</td>
          <td style="padding:12px 16px;border-bottom:1px solid #E5E7EB;color:#111827;font-size:14px;font-weight:600">{{servico}}</td></tr>
      <tr><td style="padding:12px 16px;color:#6B7280;font-size:13px">Profissional</td>
          <td style="padding:12px 16px;color:#111827;font-size:14px">{{profissional}}</td></tr>
    </table>
    <p style="color:#6B7280;font-size:13px;margin:24px 0 0">
      Te esperamos em breve! — <strong>{{empresa}}</strong>
    </p>
  </div>
</div>
',
  true
)

ON CONFLICT (name) DO UPDATE SET
  subject   = EXCLUDED.subject,
  body_html = EXCLUDED.body_html,
  is_active = EXCLUDED.is_active;
