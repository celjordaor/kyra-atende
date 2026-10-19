/**
 * lib/ai.ts
 * Wrapper Anthropic — chat interno e resposta automática de WhatsApp.
 * Substitui o NestJS AiService.
 * ⚠️ ANTHROPIC_API_KEY deve estar APENAS em .env.local, nunca no frontend.
 * ⚠️ Sempre usar claude-haiku-4-5-20251001 — Claude 3.x descontinuado.
 */
import Anthropic from '@anthropic-ai/sdk'
import { createAdminClient } from '@/lib/supabase/admin'

const MODEL = 'claude-haiku-4-5-20251001'

const WA_SYSTEM_PROMPT = `Você é a Kyra, assistente virtual de agendamentos da empresa {company_name}.
Seu objetivo é ajudar clientes a agendar, remarcar ou cancelar serviços.

Serviços disponíveis:
{services_list}

Regras:
- Seja simpática, breve e objetiva (respostas de até 3 linhas no WhatsApp)
- Confirme sempre: serviço, data, horário e profissional
- Se não souber responder, diga "vou verificar com a equipe e retorno em breve"
- Não invente horários disponíveis — peça para o cliente acessar o link de agendamento
- Link de agendamento: {booking_url}
- Nunca mencione que é uma IA, a menos que perguntado diretamente`

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) console.warn('[ai] ANTHROPIC_API_KEY não configurada — IA desativada')
  return new Anthropic({ apiKey })
}

// ── Chat interno ──────────────────────────────────────────────────────────────

export interface ChatMessage {
  role:    'user' | 'assistant'
  content: string
}

/**
 * Chat IA interno — tela /ia do dashboard.
 * Retorna o texto da resposta e o total de tokens usados.
 */
export async function chat(
  messages: ChatMessage[],
): Promise<{ reply: string; tokensUsed: number }> {
  const client   = getClient()
  const response = await client.messages.create({
    model:      MODEL,
    max_tokens: 1024,
    temperature: 0.3,
    system:
      'Você é a Kyra, assistente de gestão de agendamentos. ' +
      'Ajude o dono do negócio com análises, sugestões e respostas sobre seus agendamentos.',
    messages,
  })

  const reply      = response.content[0]?.type === 'text' ? response.content[0].text : ''
  const tokensUsed = (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0)

  return { reply, tokensUsed }
}

// ── IA de agendamento via WhatsApp ────────────────────────────────────────────

/**
 * Processa mensagem inbound do WhatsApp e gera resposta automática.
 * Retorna null se não houver resposta.
 */
export async function processWhatsappMessage(
  tenantId: string,
  phone:    string,
  text:     string,
  incomingMessageId?: string,
): Promise<string | null> {
  const supabase = createAdminClient()

  const [tenantResult, servicesResult] = await Promise.all([
    supabase.from('tenants').select('name, slug').eq('id', tenantId).single(),
    supabase
      .from('services')
      .select('name, duration_minutes, price')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .limit(20),
  ])

  const companyName  = tenantResult.data?.name ?? 'nossa empresa'
  const slug         = tenantResult.data?.slug ?? ''
  const appUrl       = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'https://kyraatende.com.br'
  const bookingUrl   = `${appUrl}/agendar/${slug}`

  const servicesList =
    servicesResult.data
      ?.map((s) => `- ${s.name} (${s.duration_minutes ?? '?'} min, R$${s.price ?? '?'})`)
      .join('\n') ?? 'Consulte pelo link de agendamento'

  const systemPrompt = WA_SYSTEM_PROMPT
    .replace('{company_name}', companyName)
    .replace('{services_list}', servicesList)
    .replace('{booking_url}', bookingUrl)

  // Histórico recente para contexto
  const history = await getRecentMessages(supabase, tenantId, phone, 8, incomingMessageId)

  const messages: ChatMessage[] = [
    ...history.map((m) => ({
      role:    (m.direction === 'inbound' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: m.body,
    })),
    { role: 'user', content: text },
  ]

  const normalized = normalizeMessages(messages)
  if (!normalized.length) return null

  try {
    const client   = getClient()
    const response = await client.messages.create({
      model:       MODEL,
      max_tokens:  300,
      temperature: 0.4,
      system:      systemPrompt,
      messages:    normalized,
    })
    const reply = response.content[0]?.type === 'text' ? response.content[0].text.trim() : null
    return reply || null
  } catch (err) {
    // Não transformar falhas do provedor em resposta vazia. O chamador
    // precisa distinguir falha de IA de ausência legítima de resposta,
    // para informar a equipe sem repetir envios automaticamente.
    const providerStatus = typeof err === 'object' && err !== null && 'status' in err
      ? (err as { status?: unknown }).status : undefined
    console.error('[ai] Falha ao gerar resposta WhatsApp', {
      tenantId,
      providerStatus: typeof providerStatus === 'number' ? providerStatus : undefined,
      errorType: err instanceof Error ? err.name : 'unknown',
    })
    throw new Error('whatsapp_ai_generation_failed')
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Garante alternância user/assistant (API Anthropic exige). */
function normalizeMessages(messages: ChatMessage[]): ChatMessage[] {
  const result: ChatMessage[] = []
  for (const msg of messages) {
    if (result.length && result[result.length - 1].role === msg.role) {
      result[result.length - 1].content += '\n' + msg.content
    } else {
      result.push({ ...msg })
    }
  }
  // Última mensagem deve ser do role 'user'
  if (result.length && result[result.length - 1].role !== 'user') result.pop()
  return result
}

async function getRecentMessages(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  tenantId: string,
  phone:    string,
  limit:    number,
  incomingMessageId?: string,
): Promise<Array<{ direction: string; body: string }>> {
  const { data } = await supabase
    .from('whatsapp_messages')
    .select('direction, body, external_id')
    .eq('tenant_id', tenantId)
    .or(`from_number.eq.${phone},to_number.eq.${phone}`)
    .order('created_at', { ascending: false })
    .limit(incomingMessageId ? limit + 1 : limit)

  // O webhook grava a mensagem atual antes de gerar a resposta. Evitar
  // que ela apareça duas vezes: no histórico e no último turno do usuário.
  const previous = ((data ?? []) as Array<{ direction: string; body: string; external_id: string | null }>)
    .filter(m => !incomingMessageId || m.external_id !== incomingMessageId)
    .slice(0, limit)
  return previous.reverse().map(({ direction, body }) => ({ direction, body }))
}
