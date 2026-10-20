# WhatsApp — Procedimento de conciliação (sem reenvio automático)

**Objetivo:** investigar envios cujo resultado não pode ser comprovado pela aplicação, preservando o histórico e evitando mensagens duplicadas.

## Quem pode executar

A consulta está disponível somente para Superadmin em `/superadmin/whatsapp-conciliacao` e `GET /api/superadmin/whatsapp-reconciliation`. A tela é exclusivamente de leitura. Nenhum operador deve executar SQL manual, criar mensagem artificial, limpar o estado ou reenviar a partir dessa tela.

## Interpretação dos estados

| Estado | Significado | Ação segura |
|---|---|---|
| `sending` | A intenção foi registrada; o processo não concluiu a confirmação | Se permanecer mais de 10 minutos, consultar provedor antes de decidir |
| `accepted` | Evolution respondeu com sucesso; histórico pode estar pendente | Consultar histórico e ID do evento no provedor; não reenviar |
| `recorded` | Histórico foi gravado e vinculado ao rastreamento | Não aparece na lista de pendências |
| `rejected` | Resposta HTTP não bem-sucedida | Conferir código e resultado efetivo no provedor; nem toda rejeição prova não entrega |
| `unknown` | Timeout/erro de rede após iniciar o envio | **Nunca reenviar automaticamente**; verificar se o destinatário recebeu |
| `reconcile` | Provedor aceitou, mas falhou o registro do histórico | Investigar integridade de banco/histórico antes de qualquer outra ação |

## Checklist manual de investigação

1. Anotar ID da tentativa, tenant, horário e estado exibidos pela tela. Não copiar o conteúdo da mensagem em tickets de suporte.
2. Confirmar a identidade da empresa e a instância Evolution correta no ambiente correspondente. Não operar instâncias compartilhadas sem autorização.
3. Consultar logs/eventos da Evolution no intervalo e localizar a tentativa usando metadados confiáveis. O hash do corpo não é um identificador de mensagem no provedor.
4. Confirmar se há evento/ID de mensagem no provedor e, se necessário, confirmar recebimento de forma apropriada com o operador responsável. Ausência de log **não comprova que a mensagem não foi entregue**.
5. Conferir histórico de `whatsapp_messages` e eventual falha de incremento de consumo; identificar divergências sem modificar dados em produção.
6. Registrar um parecer: **entrega confirmada**, **não entrega confirmada**, **resultado indeterminado** ou **falha de registro**, com evidência, responsável e data.
7. Encaminhar qualquer correção de histórico/consumo para mudança técnica controlada e auditável. Só planejar reenvio após prova de não entrega e autorização operacional; não existe ferramenta automática para isso hoje.

## Critérios de homologação

- Sem sessão: `GET` deve responder HTTP 401 gerado pela aplicação (não pela proteção da Vercel).
- Com usuário de tenant: HTTP 403.
- Com Superadmin: HTTP 200, máximo 100 linhas, sem corpo/hash/telefone completo.
- Tela exibe estados e sinaliza `sending`/`accepted` com mais de 10 minutos, além de `unknown`/`reconcile`.
- Ler a tela não altera `whatsapp_outbox`, `whatsapp_messages` ou contadores de uso.
- Testes com Evolution devem usar instância e número de homologação exclusivos, com autorização explícita. Não enviar WhatsApp para números de clientes.

## Limitações ainda abertas

- O rastreamento atual não possui chave idempotente compartilhada com a Evolution, workers, leases ou reconciliador automático.
- Uma falha durante a atualização do próprio estado pode deixar `sending` mesmo após entrega; o marcador de 10 minutos indica investigação, não prova de erro.
- A interface não faz paginação além das últimas 100 pendências, não tem atribuição de responsável ou botão de resolução.
- Incremento de uso, gravação do histórico e entrega externa não são uma transação atômica.
- Política de retenção de dados da outbox e operação segura de marcação/fechamento deverão ser especificadas antes de implantar.

## Fontes

- [Plano de continuidade](../PLANO-DE-CONTINUIDADE-E-PENDENCIAS.md)
- [Auditoria AUD-01](../auditoria/AUD-01-evidencias-rls-componentes.md)
- Código: `lib/whatsapp.ts`, `app/api/superadmin/whatsapp-reconciliation/route.ts`
