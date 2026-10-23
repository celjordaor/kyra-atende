# WhatsApp — rodada global de verificação técnica

## Escopo inspecionado
- Webhook Evolution: autenticação por segredo, limite de payload em streaming, validação estrutural e respostas HTTP.
- Entrada: fila de contatos não autorizados sem guardar corpo da mensagem; permissões pending/manual/ai/ignored; unicidade de external_id e marcação inbound.
- Processamento: IA ou atendimento humano, marcação done/needs_review, push de acompanhamento e ausência de repetição automática depois de resultado incerto.
- Saída: reserva de quota antes do envio, status accepted/rejected/unknown/reconcile, histórico, conciliação e limite mensal; timeout de 15s na chamada ao provedor.
- Instância: conexão, QR, estado, desconexão e tratamento de falhas do provedor.
- Portal WhatsApp: status e histórico do tenant com resposta privada e sem cache.

## Controles observados no código
- A deduplicação inbound usa inserção com índice de unicidade e ignora erro `23505`; a chamada `claim_whatsapp_inbound` cria rastreamento antes de IA.
- Uma resposta da Evolution perdida após envio pode ter entregue a mensagem: o outbox permanece `unknown` e **não há retentativa automática**.
- A quota de envio é reservada antes da chamada; a liquidação depende da RPC atômica.
- O endpoint de conexão não gera QR automaticamente; o endpoint de status exibe `provider_unavailable` quando a conexão do provedor falha.
- Exigência do segredo de webhook e implementação local **não provam que a integração real esteja configurada**.

## Verificações automatizadas
Exigir `AUD-01 Quality Gates` e `AUD-01 Static Security & Quality Checks` com sucesso para o SHA deste PR; tais gates não substituem prova real de entrega de mensagem.

## Homologação externa pendente (não executar em números compartilhados)
1. Verificar presença de `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_WEBHOOK_SECRET` e URL da aplicação, sem revelar os valores.
2. Isolar uma instância e número de homologação antes de iniciar conexão.
3. Confirmar entrada autorizada, entrada não autorizada e decisão do proprietário; não persistir corpo de mensagens de contatos pendentes.
4. Repetir webhook com o mesmo ID; verificar apenas um inbound e uma tentativa de IA.
5. Simular falha após persistir inbound; verificar needs_review e ausência de segunda resposta.
6. Enviar saída e conciliar histórico, outbox e contador mensal; simular rejeição e resposta ambígua.
7. Verificar mensagens de múltiplos tenants sem mistura; quotas e entitlements de cada tenant.
8. Verificar conexão, QR, perda de conexão e desconexão real.
9. Confirmar alertas push, permissões e acesso à conciliação por perfil.
10. Registrar IDs redigidos e evidência de provedor; validar deploy READY do commit exato.

**Situação:** revisão técnica do código concluída; E2E real da Evolution/WhatsApp permanece pendente até homologação isolada. Não declarar funcionamento comercial homologado com base somente no CI.
