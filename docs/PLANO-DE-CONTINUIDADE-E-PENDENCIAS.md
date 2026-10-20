# Kyra Atende — Estado do projeto e plano de continuidade

**Atualizado em:** 20/10/2026  
**Referências verificadas:** repositório `celjordaor/kyra-atende`; [evidências AUD-01](auditoria/AUD-01-evidencias-rls-componentes.md); [histórico remoto de migrations](auditoria/sql-remoto-aplicado/README.md).  
**Regra:** não confundir código desenvolvido, testes SQL, deploy `READY` e homologação funcional E2E.

## Resumo executivo

A implementação de controles de RLS, isolamento multitenant e auditoria administrativa avançou, com testes SQL e deployments publicados. **AUD-01 encerrável como avaliação técnica com ressalvas**, mas **não homologada integralmente**: faltam provas de execução verde do GitHub Actions, testes HTTP autenticados com perfis de tenants distintos e uso administrativo real em ambiente controlado. Uma ausência de erro reportado não constitui resultado de CI aprovado.

A evolução do projeto deve deixar de repetir consultas de deploy e seguir uma fila objetiva de aceite de produtos/integrações, abaixo.

## Inventário de pendências priorizadas

| Ordem | Frente | Situação baseada nas evidências | Critério verificável de aceite |
|---|---|---|---|
| P0 | CI e autenticação HTTP da AUD-01 | **Implementado parcialmente; homologação pendente.** Workflow `AUD-01 Quality Gates` existe; execução verde não recuperada; SQL com JWT simulado não é HTTP real | Run GitHub Actions verde (TypeScript, ESLint e smoke 401); testes HTTP documentados 401/403/200 ou 400 esperado com sessão de Superadmin e duas contas de tenants distintos, sem alterar dados reais |
| P0 | Evolution/WhatsApp: configuração e entrega real | **Não homologado E2E.** Documentação aponta ausência de `EVOLUTION_WEBHOOK_SECRET` em Production na verificação realizada; instâncias existentes podem precisar reconfiguração | Segredo válido e protegido; instância de homologação configurada; entrada, webhook autenticado, persistência, resposta e deduplicação comprovadas, sem afetar números compartilhados |
| P0 | Processamento confiável de WhatsApp | **Falta confirmar/implantar.** Documentação afirma não existir fila/outbox com estados e retentativas idempotentes para falhas após registro de inbound | Fila com estados, recuperação, retries seguros e teste de falha entre recebimento, IA e envio, sem mensagens duplicadas |
| P1 | Consumo/limites de IA | **Pendência técnica identificada.** Reserva ou débito atômico de quota de IA não comprovado | Teste concorrente sem exceder limite; reconciliação do consumo e tratamento previsível de erro |
| P1 | Asaas/billing | **Parcialmente homologado.** Evidências de PIX sandbox e idempotência; verificar cenários adicionais e recibo de webhook oficial | Cenários aprovados: pagamento duplicado, expiração, renovação, cancelamento, estorno, reenvio webhook, trial/crédito; contratos e valores reconciliados |
| P1 | Configurações de segurança Supabase | **Alertas conhecidos em aberto.** Proteção contra senhas vazadas desabilitada; extensão `btree_gist` em `public` exige análise de dependências | Decisão registrada para cada alerta; habilitar leaked-password protection quando disponível; mover extensão somente mediante plano seguro, ou justificar manutenção |
| P1 | HTML de templates e abuso de APIs | **Sem homologação.** Necessário revisar sanitização/preview, limites de repetição e rate limiting; logs de admin auditados sem corpo HTML | Testes de XSS/HTML e limites de payload; política de rate limit por identidade/tenant; logs úteis e sem dados sensíveis |
| P1 | Governança de migrations | **Parcial.** Inventário histórico remoto arquivado, mas reconciliar baseline e prevenir reaplicação ainda requer aceite | Política única de versionamento, comparação do schema e procedimento documentado de migração/reversão verificados |
| P2 | Disponibilidade, slots e horário comercial | **Adiado por decisão explícita**, não bug a corrigir dentro da AUD-01 | Especificação funcional do novo motor: calendário, regras de funcionamento, duração, conflito, fuso e exceções; posterior implementação em módulo próprio |
| P2 | UX e Design System | **Uso parcial verificado** nas telas amostradas; lista `ESTADOS` duplicada, revisão visual ampla não concluída | Checklist por tela, componentes reutilizados, máscaras e validações consistentes, acessibilidade e estados de erro testados |
| P2 | Política de edição concorrente de templates | **Última escrita prevalece** sem controle de versão comprovado | Decidir bloqueio otimista/versão ou aceitar formalmente last-write-wins e testar concorrência |
| P2 | Homologação geral de onboarding, notificações e relatórios | **Não comprovada pelos documentos de auditoria consultados** | Matriz de módulos originais, fluxos principais e aceite por responsável de negócio |

## O que não se deve reabrir sem evidência nova

- RLS de isolamento de clientes, serviços, profissionais e agendamentos: testes SQL com rollback existentes.
- RPC administrativa transacional para tenants e templates: testes SQL positivos/negativos já registrados.
- Deploys Vercel: últimos commits auditados alcançaram READY; isso não certifica o comportamento funcional.

## Sequência recomendada

1. **Fechar AUD-01 como “encerramento técnico com ressalvas”**, com dono, data e evidência pendente por item. Não registrar testes não executados como aprovados.
2. **Homologar WhatsApp/Evolution em ambiente isolado**, validando configuração, privacidade e recuperação de falha antes de divulgar comercialmente o canal.
3. **Endurecer limites de IA e cobrança**, depois concluir fluxos complementares do Asaas.
4. **Separar projeto do motor de disponibilidade** e criar especificação antes de codificar.
5. **Executar aceite funcional e visual por módulo**, comparando com o escopo original, quando este estiver disponível para leitura integral.

## Limitação da reconciliação com documentos originais

A pesquisa dos arquivos disponibilizados no contexto do Project não retornou o blueprint/escopo original. Também não foram localizados, nos caminhos convencionais testados do repositório, arquivos `docs/blueprint.md`, `docs/escopo.md`, `docs/roadmap.md` ou `docs/planejamento.md`. Portanto **não é possível afirmar que 100% dos requisitos originais foram entregues**. Os itens acima são achados comprovados ou pendências explicitamente registradas na auditoria, não uma comparação requisito-a-requisito com um blueprint ausente.

**Próxima dependência documental:** disponibilizar o blueprint/escopo original para criar matriz `requisito → implementação → evidência → status → responsável`. Não marcar `não localizado` como `não implementado`.

## Critérios de status

- **Implementado:** código/migration identificado; pode faltar homologação.
- **Testado em SQL:** comportamento do banco verificado; não equivale a teste real HTTP.
- **Homologado:** fluxo ponta a ponta e evidência reproduzível aprovados.
- **Adiado:** decisão de produto, fora do marco corrente.
- **Não comprovado:** documentação ou evidência insuficiente; requer verificação antes de afirmar ausência.


## Evolução iniciada — Revisão técnica Evolution/WhatsApp (19/10/2026)

**Arquivos inspecionados:** `lib/whatsapp.ts` e `app/api/whatsapp/webhook/route.ts`.

- **Controle existente confirmado:** o endpoint compara o segredo do webhook em tempo constante, exige segredo com pelo menos 32 caracteres e valida tipo do evento e identificador da instância. A implantação ainda requer configuração real do segredo no provedor e na Vercel.
- **Controle existente confirmado:** mensagens sem permissão `manual` ou `ai` não entram no histórico/IA; contatos novos geram solicitação `pending`; `external_id` evita repetição simples do mesmo inbound.
- **Correção pontual nesta rodada:** o handler deixou de imprimir a exceção completa recebida do processamento externo, registrando apenas o tipo do erro (commit `1ab4f5ba`). Isso reduz vazamento involuntário em logs; ainda depende de deploy.
- **Risco funcional confirmado por leitura de código:** após envio bem-sucedido na Evolution, a inserção do outbound em `whatsapp_messages` não verifica `error` antes de chamar `incrementUsage`. Pode haver mensagem entregue sem histórico confiável. A atualização de uso também não é uma transação conjunta com o evento externo; não adicionar retry automático ingênuo porque pode duplicar o envio.
- **Risco operacional confirmado por leitura de código:** a mensagem inbound é gravada antes da IA; se a IA ou o envio falhar, não há estado durável de reprocessamento e um reenvio pelo provedor encontra `external_id` duplicado. A notificação push não equivale a fila persistente.
- **Pré-requisitos de homologação:** instância de teste exclusiva, segredo de webhook válido, URL HTTPS, permissões da conta, provedor compatível e confirmação de não impacto em números já em uso.
- **Próxima entrega técnica recomendada (não implantada):** migração com fila/outbox e estados `pending/processing/done/failed`, chave idempotente, tentativas com backoff e reconciliação manual de envios ambíguos; cobrir por testes de concorrência, falha após envio, indisponibilidade da IA e duplicidade do webhook.
- **Limites da rodada:** sem webhook real, sem conexão com número externo, sem alterações de esquema e sem disparar mensagens. Não chamar integração Evolution de homologada.


## Continuidade WhatsApp — detecção de falha após envio (19/10/2026)

- **Commit `35a24e27`:** `lib/whatsapp.ts` agora verifica explicitamente `error` do INSERT de mensagens outbound. Quando a Evolution já aceitou a mensagem, mas a gravação falha, o erro é registrado apenas com `tenantId` e código técnico, e a operação retorna uma mensagem de **conciliação manual**. O código não envia automaticamente outra mensagem.
- Respostas HTTP de erro da Evolution não são mais incluídas integralmente nas exceções, reduzindo exposição acidental de conteúdos e identificadores.
- **Ainda não resolvido:** em falha depois da confirmação HTTP do provedor, o sistema não possui outbox persistente para conciliar os envios ambíguos; incrementos de consumo e persistência não são transacionais com o provedor. Uma repetição manual da chamada HTTP poderá reenviar, portanto não classificar esta correção como idempotência ponta a ponta.
- **Próxima implementação recomendada:** desenho e migração da outbox com ID externo imutável, estado `pending/processing/sent/failed/unknown`, leases, retentativas somente quando comprovadamente seguras, reconciliação com o provedor e testes de concorrência. Revisar os fluxos chamadores antes de alterar o tratamento da exceção.
- Não foram disparadas mensagens nem feitos testes na instância real nesta rodada. A correção depende da confirmação de deploy e de teste controlado.
