# WhatsApp / Evolution — auditoria técnica consolidada (23/10/2026)

## Evidências verificadas no código
- Webhook exige `EVOLUTION_WEBHOOK_SECRET` (32+ caracteres), compara em tempo constante, limita payload a 1 MiB **durante** leitura e verifica campos de `messages.upsert`.
- Contato novo ou pendente: registra referência de mensagem, sem texto/IA até autorização. Proprietário do tenant decide entre ignorar, manual e IA.
- Entrada autorizada: unicidade de `external_id`, claim de processamento e status `done`/`needs_review`. Falha posterior não gera reenvio automático.
- Saída: reserva atômica de quota em outbox antes da Evolution, estados `unknown`, `rejected`, `accepted`, `reconcile`; liquidação por RPC. Envio incerto não sofre retry automático.
- Consulta de instância, conexão, QR e desconexão têm timeout; falha na desconexão é reportada, não mascarada.
- **Correção desta rodada:** falha no aviso opcional de consumo de 80% não pode converter um envio aceito/liquidado em erro para o chamador.
- Verificação estática não confirma existência dos segredos em produção, entrega real da Evolution, funcionamento de números conectados ou compatibilidade de versões externas.

## Cenários da matriz técnica
| Cenário | Evidência de código | Homologação com provedor |
|---|---|---|
| Webhook sem segredo / payload inválido ou grande | Validações HTTP | Pendente |
| Evento duplicado/concorrente | Unicidade inbound e claim | Pendente |
| Contato sem permissão, manual, IA, ignorado | Fila e decisão proprietário | Pendente |
| IA vazia ou indisponível | `needs_review` e alerta | Pendente |
| Timeout de envio após aceite incerto | Outbox `unknown`, sem retry | Pendente |
| Erro de histórico ou quota após aceite | Estado de conciliação | Pendente |
| Limite mensal e alerta 80% | Reserva/liquidação; aviso isolado | Pendente |
| Conectar, QR, status, desconectar | Timeout e tratamento de erro | Pendente |
| Reconciliação administrativa | Endpoint e histórico de migrações existentes | Pendente |

## Critério de encerramento
CI verde + deploy `READY` permitem **encerrar a revisão técnica de código com ressalva de E2E**. Não declarar homologação funcional de WhatsApp sem instância isolada, webhook autenticado, mensagens reais e testes de falha. Não alterar números compartilhados. Nenhuma operação de configuração externa ou mensagem real foi executada nesta rodada.
