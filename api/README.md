# Kyra Atende — Backend API (NestJS)

Backend assíncrono do sistema de agendamento Kyra Atende.

## Stack

| Tecnologia | Uso |
|-----------|-----|
| NestJS 10 | Framework REST API |
| BullMQ + Redis | Filas assíncronas (WhatsApp, Push, Crons) |
| Supabase (service_role) | Banco PostgreSQL sem RLS |
| Anthropic Claude Haiku | IA de chat e agendamento via WhatsApp |
| Twilio | Envio/recebimento de mensagens WhatsApp |
| web-push | Envio de notificações push (Web Push Protocol) |

## Estrutura dos módulos

```
src/
├── main.ts               # Bootstrap, Swagger, CORS
├── app.module.ts         # Raiz — registra BullMQ, Schedule, todos os módulos
│
├── supabase/             # SupabaseService (service_role global)
├── auth/                 # JwtStrategy, JwtAuthGuard, @CurrentUser()
├── entitlements/         # EntitlementsService — controle de planos e limites
│
├── push/                 # Notificações Push
│   ├── push.controller   # GET /vapid-key · POST/DELETE /subscribe · POST /test
│   ├── push.service      # save/remove/getByTenant/sendToEndpoint
│   ├── push.worker       # BullMQ Processor 'push-notifications'
│   └── push.dispatcher   # dispatch(tenantId, event, data) → enfileira push
│
├── whatsapp/             # WhatsApp via Twilio
│   ├── whatsapp.controller  # POST /webhook (inbound do Twilio)
│   ├── whatsapp.service     # enqueueInbound · send · saveMessage
│   └── whatsapp.worker      # BullMQ Processors: inbound (IA/push) + outbound (Twilio)
│
├── ai/                   # IA Claude Haiku 3
│   ├── ai.service        # chat() · processWhatsappMessage()
│   └── ai.controller     # POST /ai/chat
│
├── booking/              # Agendamentos
│   ├── booking.service   # confirm · cancel · sendReminders (cron 30min)
│   └── booking.controller # POST /bookings/:id/confirm|cancel
│
└── billing/              # Cobrança e agendador de tarefas
    ├── billing.service   # handlePaymentFailed · recordPlanChange · suspendTenant
    └── scheduler.service # Crons: trial expirando (1h) · reset contadores (mensal)
```

## Setup

### 1. Pré-requisitos

- Node.js 20+
- Redis 7+ (local via Docker ou Redis Cloud)
- Conta Supabase com `SUPABASE_SERVICE_ROLE_KEY`
- Conta Twilio com número WhatsApp sandbox ou dedicado
- Chave Anthropic API
- Chaves VAPID geradas (rodar UMA VEZ: `npx web-push generate-vapid-keys`)

### 2. Instalação

```bash
cd KyraAtende
npm install
cp .env.example .env
# Preencher .env com as chaves reais
```

### 3. Redis local (Docker)

```bash
docker run -d --name redis-kyra -p 6379:6379 redis:7-alpine
```

### 4. Rodar em desenvolvimento

```bash
npm run start:dev
# API: http://localhost:3001
# Swagger: http://localhost:3001/docs
```

### 5. VAPID keys (push notifications)

```bash
# Rodar UMA ÚNICA VEZ e salvar no .env de todos os ambientes
npx web-push generate-vapid-keys
```

## Filas BullMQ

| Fila | Worker | Trigger |
|------|--------|---------|
| `push-notifications` | PushWorker | PushDispatcher.dispatch() |
| `whatsapp-inbound` | WhatsappWorker | POST /whatsapp/webhook (Twilio) |
| `whatsapp-outbound` | WhatsappOutboundWorker | WhatsappService.send() |

## Webhook Twilio

Configurar no painel Twilio o webhook de inbound para:
```
https://sua-api.kyraatende.com.br/api/whatsapp/webhook
```

Método: `HTTP POST`

## Variáveis de ambiente

Ver `.env.example` para lista completa.

## SQL necessário no Supabase

```sql
-- Tabela de mensagens WhatsApp
CREATE TABLE whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  from_number text NOT NULL,
  to_number text NOT NULL,
  body text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  external_id text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Tabela de contadores de uso
CREATE TABLE usage_counters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  key text NOT NULL,
  value integer NOT NULL DEFAULT 0,
  reset_at timestamptz,
  UNIQUE(tenant_id, key)
);

-- Função para incrementar contador de forma atômica
CREATE OR REPLACE FUNCTION increment_usage_counter(
  p_tenant_id uuid, p_key text, p_by integer DEFAULT 1
) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO usage_counters (tenant_id, key, value)
  VALUES (p_tenant_id, p_key, p_by)
  ON CONFLICT (tenant_id, key)
  DO UPDATE SET value = usage_counters.value + p_by;
END;
$$;

-- Tabela de eventos de billing
CREATE TABLE billing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  metadata jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
```
