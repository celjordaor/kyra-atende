# Kyra Atende — Matriz única de aceite funcional
Data: 20/10/2026
Objetivo: concluir testes sem reabrir infraestruturas já validadas. Não confundir CI, migration e E2E.

## Baseline verificada
- Commit `ccd85fdd`: Quality Gates e Static Security & Quality Checks = SUCCESS; Vercel READY.
- Supabase: migrations de agenda e inbound WhatsApp aplicadas.
- Dados reais observados: 0 expedientes da empresa, 0 vínculos no Portal, 0 rastreamentos de inbound e 0 pendências outbound.
- Privilégios: authenticated NÃO executa RPCs create_booking_checked, create_portal_booking, claim_whatsapp_inbound; NÃO lê diretamente customer_memberships nem whatsapp_inbound_processing.
- Integridade consultada: 0 reservas com cliente de outro tenant e 0 vínculos com cliente de outro tenant.
- Evidência anterior: 12 verificações transacionais da agenda com rollback (ver AUDITORIA-CONSOLIDADA-AGENDAMENTOS-2026-10-20.md).
- Nenhum WhatsApp enviado, nenhuma reserva criada, nenhum número real alterado nesta rodada.

## Critérios por módulo
| Módulo | Comprovado | Falta antes de homologar |
|---|---|---|
| Agenda interna e link público | CI e motor SQL com rollback | Tenant QA com horários reais, HTTP/GUI 401/403/201/409, concorrência HTTP, fusos, profissional opcional |
| Portal central | Isolamento em schema/RPC e 0 acessos diretos | OTP real, vínculo verificado de cliente teste, duas empresas, agendar/ver/cancelar conforme regras |
| WhatsApp/Evolution | Webhook com segredo e limite de payload no código; trilhas persistentes, controles SQL | Instância e número QA exclusivos, webhook real, evento duplicado, falha IA/Evolution, conciliação sem retry ambíguo |
| IA/consumo | Infra de orçamento e ledger identificada no plano | Chamadas QA autenticadas, reserva/liquidação por mês e tenant, FX, falhas e concorrência |
| Asaas | Infra prévia documentada | Sandbox webhooks de pagamento, repetição, vencimento, renovação, cancelamento, estorno |
| Segurança | CI verde e verificações SQL acima | HTTP com sessões reais de tenant A/tenant B/superadmin, OTP, rate limiting |
| UX/Design System | Sem aceite nesta rodada | Revisão por tela, máscaras, erros, acessibilidade e responsividade |

## Ordem enxuta
1. Preparar tenant e identidades QA sem interferir nos 5 tenants existentes, registrar credenciais exclusivamente em cofre.
2. Homologação HTTP/GUI de agenda e Portal, com verificação negativa multitenant.
3. Homologação Evolution isolada e conciliação de resultados ambíguos, sem envios a clientes reais.
4. Bateria IA/Asaas em QA/sandbox.
5. Revisão visual e assinatura do aceite por responsável.

## Classificação final
- **Compilação/publicação:** aprovado no commit verificado.
- **Regras de banco e isolamento básico:** testadas, aprovadas no escopo descrito.
- **E2E e integrações externas:** pendentes, não homologados.
- **Sem bloqueio para desenvolvimento de outras frentes**, mas sem habilitação comercial até o aceite real.
