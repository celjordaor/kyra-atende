# Kyra Atende — Estado do projeto e plano de continuidade

> **Reorientação de produto (23/10/2026):** este documento trata de riscos técnicos e homologações, **não substitui o roadmap de funcionalidades**. Ler primeiro [Plano Mestre](PLANO-MESTRE-E-ORDEM-DE-EXECUCAO-2026-10-23.md). Próxima construção autorizada: [E3 / item 12 — Pesquisas pós-agendamento e pós-atendimento](E3-PESQUISAS-POS-AGENDAMENTO-E-ATENDIMENTO.md). Não usar pendências genéricas de WhatsApp/Portal para adiar sistematicamente a construção de novos módulos.\n\n
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


## WhatsApp — Registro persistente de envio (20/10/2026)

- Migration remota `20261020004119_whatsapp_outbound_delivery_tracking`: tabela `whatsapp_outbox` com RLS e permissões somente para backend `service_role`; cada tentativa guarda tenant, destinatário, hash SHA-256 do corpo (não o texto), estado, eventual HTTP do provedor e referência ao histórico.
- `lib/whatsapp.ts` grava `sending` **antes** do envio; se o registro falhar, não chama a Evolution. Na resposta HTTP: `rejected` para rejeição, `accepted` para sucesso; falha de rede gera `unknown`, sem retry; falha de histórico após aceitação gera `reconcile`; histórico gravado gera `recorded`.
- **Limites críticos:** esta primeira versão é rastreamento, não outbox transacional completa. Não existe chave idempotente compartilhada com Evolution, claim/lease, reconciliador ou interface administrativa; invocações repetidas podem ainda reenviar. Falha do próprio UPDATE de estado pode manter a linha em estado anterior. Incremento de consumo e envio externo continuam não transacionais.
- **Segurança:** armazenamento sem conteúdo da mensagem, isolamento por backend, nenhuma linha criada em dados reais nesta rodada. Não confundir a criação de tabela com teste E2E.
- **Validação pendente:** build/TypeScript, testes com Evolution isolada, falha simulada após aceite HTTP, falha de histórico, recuperação de `sending` antigo e reconciliação operacional. Não ativar retry automático antes de determinar uma estratégia de idempotência ponta a ponta.

## Visibilidade de conciliação WhatsApp — continuidade (20/10/2026)

- **Implementado no código:** endpoint somente leitura `GET /api/superadmin/whatsapp-reconciliation` (commit `777310a1`). Exige autenticação e papel `superadmin` verificado no banco antes de usar `service_role`.
- Lista no máximo 100 tentativas em estados `sending`, `accepted`, `unknown` e `reconcile`, exibindo tenant, sufixo do telefone, estado, timestamps e indicador de atenção após 10 minutos. Não retorna conteúdo nem hash das mensagens e não permite modificar estados.
- **Não implementado:** interface visual de conciliação, autenticação HTTP E2E, paginação, fluxo de confirmação/reconciliação manual e reenvio idempotente. Nunca reenviar automaticamente mensagens `unknown`.
- **Critério de aceite:** endpoint retorna 401 sem sessão, 403 para usuário não Superadmin; Superadmin enxerga somente os metadados previstos, sem dados do corpo; estado permanece inalterado após leitura. Requer testes autenticados controlados.

## UI de conciliação e verificação real de CI (20/10/2026)

- Tela `/superadmin/whatsapp-conciliacao`, somente consulta, usa `DataTable` padrão do Design System, atualiza sob demanda, identifica estados e casos de atenção; menu lateral do Superadmin atualizado (commits `b621430c` e `3a44cd59`).
- **CI comprovado:** workflow `AUD-01 Quality Gates` no commit `b90a011d` finalizado com `success` ([run 39349444741](https://github.com/celjordaor/kyra-atende/actions/runs/39349444741)); workflow `AUD-01 Static Security & Quality Checks` também `success` ([run 39349444780](https://github.com/celjordaor/kyra-atende/actions/runs/39349444780)). No commit `3a44cd59`, Quality Gates também apresentou `success` ([run 39350229633](https://github.com/celjordaor/kyra-atende/actions/runs/39350229633)). O CI está comprovado nesses commits, mas permanece a obrigação de testar HTTP com sessões legítimas antes de homologação integral.
- Sem envio de WhatsApp, sem mutações de outbox pela tela; não há conciliação de estado nem retries.
- Após deploy READY, homologar a tela com sessão real de Superadmin e negar acesso a tenant admin; nenhuma operação de envio é oferecida na UI.

## Consumo de IA — primeira correção (19/10/2026)

- **Achado confirmado:** `POST /api/ai/chat` validava o consumo com `getUsage` antes de chamar Anthropic, mas executava `incrementUsage` em `fire-and-forget`. Assim, respostas poderiam concluir sem que a contabilização fosse comprovada.
- **Correção versionada:** `lib/entitlements.ts` agora trata explicitamente o erro retornado pela RPC `increment_usage_counter` (commit `dcfde3a5`). `app/api/ai/chat/route.ts` aguarda `incrementUsage` antes de responder ao cliente (commit `5c3916f3`).
- **Limitação importante:** isso **não equivale a quota atômica**. Duas requisições simultâneas ainda podem observar saldo disponível antes da chamada à Anthropic, e uma falha de registro após a chamada pode gerar custo do provedor com resposta 500. Não considerar cobrança exata, reserva nem teto financeiro rígido homologados.
- **Próxima entrega P1:** especificar e implementar reserva atômica no Postgres com orçamento máximo de tokens por requisição, controle de concorrência, expiração e liberação de reserva em falha, considerando consumo real informado pelo modelo e política de tratamento de excedente. Priorizar testes concorrentes e de falha do provedor.
- **Evidência pendente:** GitHub Actions e deploy dos commits acima; não houve chamadas reais à Anthropic durante esta correção.

## Reserva atômica de IA — fundação instalada, ativação bloqueada por unidade (19/10/2026)

- **Migrations aplicadas no Supabase:** `ai_token_reservations` e `ai_token_reservations_lock_order`; arquivos SQL no GitHub sob `supabase/migrations/20261020010000_ai_token_reservations.sql` e `20261020010200_ai_token_reservations_lock_order.sql`. Tabela `public.ai_token_reservations` protegida por RLS e `service_role`; RPCs `reserve_ai_tokens` e `finish_ai_token_reservation` restritas a service_role.
- **Comportamento preparado:** bloqueio transacional concorrente por tenant, reserva com ID único, liquidação idempotente e liberação; nenhuma chamada à Anthropic foi feita nesta etapa.
- **Teste SQL executado dentro de ROLLBACK:** reserva de quatro tokens, liquidação de três, segunda liquidação recusada; consulta posterior confirmou zero reservas de teste. Teste com papéis via claims simuladas não substitui homologação HTTP.
- **Impedimento para ativação:** `ai_chat_monthly_limit` é 50 no Essencial e 200 no Cresce, mas `POST /api/ai/chat` contabiliza tokens de entrada + saída. Decidir se os números representam **interações/mês** ou **tokens/mês**, estabelecer teto de tokens por requisição e política de excedente antes de conectar a RPC à rota. Não alterar contratos comerciais sem aprovação.
- **Pendências adicionais:** harmonizar os nomes/versionamentos das migrations locais com as versões geradas remotamente, definir expiração/reconciliação de reservas interrompidas, observar efeito de `usage_counters.reset_at` e testar concorrência simultânea em sessões reais.
- **Status:** infraestrutura de banco pronta para evolução, **não ativada em produção**; o chat continua usando a contagem síncrona corrigida anteriormente.

## Decisão de produto em revisão — controle de IA por valor (19/10/2026)

**Diretriz atual do responsável pelo projeto:** preferir franquia financeira (R$) por tenant, em vez de bloqueio por quantidade de interações. As cifras comerciais ainda são propostas e precisam de aprovação antes de ativação.

- Modelo atualmente chamado no código `lib/ai.ts`: `claude-haiku-4-5-20251001`. Preços-base oficiais Anthropic Haiku 4.5: **US$ 1 por milhão de tokens de entrada, US$ 5 por milhão de tokens de saída**. Fonte: https://platform.claude.com/docs/en/models/haiku-4-5/overview
- Câmbio ilustrativo de 19/10/2026: US$ 1 ≈ R$ 5,06. Custos ilustrativos por mês para 50/200 chamadas, respectivamente: entrada/saída 500/150 tokens ≈ R$ 0,32/R$ 1,27; 1500/300 ≈ R$ 0,76/R$ 3,04; 4000/500 ≈ R$ 1,64/R$ 6,58. Não incluem impostos, taxas, WhatsApp, infraestrutura nem chamadas adicionais.
- **Orçamentos de partida sugeridos, NÃO aprovados:** Essencial R$ 5/mês; Cresce R$ 15/mês; Expande R$ 40/mês; Enterprise sob contrato. Exigir aprovação e eventual fator de proteção de custo/câmbio antes de codificação.
- **Estado técnico:** migration `ai_interaction_quota` foi aplicada no Supabase e versionada em `20261020020000_ai_interaction_quota.sql` enquanto a regra de interações estava sendo considerada, mas **não foi conectada à rota do chat**. Não eliminar nem reverter automaticamente a estrutura; ela está inativa e deve ser avaliada em uma futura limpeza controlada.
- As migrations anteriores de `ai_token_reservations` também estão preparatórias e não foram conectadas ao chat. A rota ainda utiliza seu fluxo anterior; não existe enforcement de limite em R$.
- **Novo desenho necessário:** ledger por chamada com `input_tokens`, `output_tokens`, modelo, tarifa USD versionada, cotação aplicada, valor estimado/confirmado BRL, reserva financeira atômica, reconciliação em falhas, reset por ciclo e orçamento por plano/tenant editável no Superadmin. Não persistir conteúdo do prompt no ledger. Usar valores inteiros em micros de moeda ou `numeric` decimal, nunca float para saldo.
- **Regra de proteção:** reservar custo máximo estimado antes de chamar a Anthropic e liquidar pelo uso informado pelo provedor. Sem margem/reserva adequada não prometer teto rígido, pois tokens de entrada, contexto e resposta variam.

## Superadmin — Orçamentos e consumo mensal de IA (19/10/2026)

**Reutilizado:** layout do Superadmin, navegação do `DashboardLayout`, cadastro de tenants, cadastro de planos e `usage_counters` para tokens. **Novo:** configuração financeira individual e ledger sem expor prompts.

- Migrations: `ai_monetary_budget_configuration` cria `ai_budget_plans` e `ai_budget_tenant_overrides`, com limites iniciais Essencial R$ 5, Cresce R$ 15, Expande R$ 40 e Enterprise R$ 40 **provisório/editável**, não preço da assinatura. As permissões da tabela são restritas ao service_role. Alterações são feitas somente por API que exige sessão Superadmin.
- `ai_cost_ledger` registra custo por chamada em BRL a partir de tokens de entrada e saída, preço-base de modelo por milhão e taxa USD/BRL aplicada na chamada; RLS ativa, sem conteúdo de conversa.
- API `GET/PATCH/DELETE /api/superadmin/ai-budgets` disponibiliza limites por plano, overrides de tenant e relatório de custos do mês. PATCH recebe somente centavos inteiros. DELETE restaura o limite do plano para aquele cliente.
- Página `/superadmin/orcamento-ia` permite editar limites por plano ou cliente e visualizar consumo em BRL, saldo e percentual. A consulta é limitada a 10.000 lançamentos e avisa quando pode estar incompleta. Registros históricos anteriores ao ledger **não foram reconstituídos**.
- `lib/ai.ts` agora fornece tokens de entrada e saída do chat, e a API registra chamada no ledger **se** a variável protegida `AI_USD_BRL_RATE` estiver configurada como número positivo. Enquanto ausente, não inventa custo financeiro e registra aviso técnico; não é uma garantia de contabilização completa nem de exatidão fiscal. Tarifas Haiku 4.5 usadas: USD 1/M entrada, USD 5/M saída; revisar tarifas na evolução de modelos.
- **Falta antes de ativar bloqueio rígido:** configurar política de FX com atualização e auditoria, validar escrita do ledger com chamada real, implementar reserva financeira atômica baseada em orçamento efetivo (plano/tenant) e reconciliação para chamadas ambíguas, tratar ciclo e fuso mensal, expiração e alerts. A rota atual ainda não consulta o orçamento em reais para bloquear acesso; NÃO apresentar como enforcement ou como custo retroativo total.
- **Homologação exigida:** APIs autorizadas (401/403/200), visual Superadmin, edição/restauração, isolamento entre tenants, ledger após chamada de teste, checagem de CI/deploy e comportamento ao exceder o orçamento após implantação da reserva monetária.

## Bloqueio financeiro da IA — infraestrutura pronta com ativação controlada (19/10/2026)

- Migration `ai_monetary_reservation` aplicada e versionada em `supabase/migrations/20261020040000_ai_monetary_reservation.sql`. Tabela `ai_monetary_reservations` acessível somente a `service_role`. RPC `reserve_ai_monetary` consulta orçamento individual ou do plano, soma custo de `ai_cost_ledger` no mês UTC e reservas abertas; trava por tenant para evitar reservas concorrentes excederem o saldo. `finish_ai_monetary` liquida registro de custo em BRL e contador de tokens na mesma transação, ou libera reserva sem lançamento.
- Teste SQL executado com `ROLLBACK`: reserva de R$ 0,01, liquidação simulada (100 tokens de entrada/50 de saída), segunda liquidação recusada; zero reservas persistidas após o teste.
- Integração do chat em `app/api/ai/chat/route.ts` guardada pela variável `AI_MONETARY_ENFORCEMENT_ENABLED=true`. **Não habilitada nesta entrega.** Quando habilitada, exige `AI_USD_BRL_RATE` numérica positiva, reserva custo conservador baseado em até 25.000 tokens de entrada e 1.024 de saída, consulta Anthropic, liquida custo observado e devolve HTTP 402 quando a reserva não cabe no orçamento.
- **Requisitos antes da ativação:** confirmar o câmbio USD/BRL e sua política de atualização; validar cálculo de reserva com casos reais de contexto; adicionar reconciliação de reservas abandonadas (não liberá-las automaticamente quando custo no provedor for incerto); garantir retenção/limite de logs e testar HTTP autenticado, cenários concorrentes e mês de referência.
- **Riscos conhecidos:** o histórico anterior ao ledger não foi reconstruído, o custo de chamadas WhatsApp ainda não integra este orçamento, e reservas podem permanecer presas após queda de processo. O teto de 25k tokens de entrada é conservador mas não é validação de limite real garantido em todos os cenários. Não declarar teto total ou custo de toda a IA enquanto WhatsApp não for abrangido.
- **Importante:** não alterar o preço das assinaturas ao editar os orçamentos de IA; Enterprise permanece customizável. A ativação precisa de decisão de operação, já que o controle passa a bloquear acesso quando o orçamento é atingido.

## Liberação controlada do orçamento financeiro de IA (19/10/2026)

- Usuário autorizou liberação e testes da franquia em valor. Tela em reais **já existe** em `/superadmin/orcamento-ia`; não migrar para USD.
- Variáveis de ambiente de produção configuradas no Vercel: `AI_USD_BRL_RATE=5.04` (referência operacional fixa, não FX em tempo real) e `AI_MONETARY_ENFORCEMENT_ENABLED=true`. Elas terão efeito no próximo deployment construído **depois** da alteração. Revisar o câmbio regularmente.
- Teste de SQL em transação revertida verificou reserva aceita, reserva acima do orçamento recusada, liberação única e liberação duplicada recusada; nenhuma reserva de teste persistida.
- Os dois workflows GitHub Actions e deployment `READY` no commit `2bac5b0e` estavam confirmados antes desta configuração. Isto comprova compilação/checagens, **não** teste real com Anthropic.
- Bloqueio é relativo ao chat do dashboard; chamadas via WhatsApp ainda não estão integradas ao ledger orçamentário. Sem histórico de ledger antes da funcionalidade. Reservas abertas após timeout continuam aguardando conciliação manual.
- **Riscos:** disparos que ultrapassem a reserva estimada de 25k tokens de entrada podem exceder a previsão; não existe renovação automática do câmbio nem garantia de que o orçamento seja o custo total da conta Anthropic. É necessário testar autenticado 401/403/200 e consumo real com tenant homologado antes de considerar integralmente homologado.

## Visibilidade de reservas financeiras pendentes (19/10/2026)

- Os workflows `AUD-01 Quality Gates` e `AUD-01 Static Security & Quality Checks` do commit `c13d37ca` concluíram com `success`, mas deploy continuava `BUILDING` na consulta subsequente.
- API do Superadmin `GET /api/superadmin/ai-budgets` agora inclui `reservations`: soma de orçamento reservado, quantidade aberta e quantidade acima de 15 minutos por tenant; somente usuários Superadmin autorizados podem consultar. Limite de 10.000 reservas reportado como consulta possivelmente incompleta.
- Tela `/superadmin/orcamento-ia` apresenta coluna **Reservado**, subtrai reservas abertas do saldo estimado e destaca reservas antigas para conciliação. Não libera automaticamente dinheiro bloqueado e não executa novas chamadas Anthropic.
- **Homologação pendente:** verificar últimos commits da UI e deploy, endpoint HTTP autorizado (401/403/200) e comportamento real de orçamento. A estimativa de FX fixa em produção precisa de revisão periódica; continuar distinguindo custo calculado de custo financeiro confirmado pela Anthropic.

## Revisão de segurança da reserva financeira — 19/10/2026

- Último deploy anterior ao ajuste `5c21ddf6` está `READY`; ambos workflows de qualidade nesse commit finalizaram com `success`.
- Checagem SQL: `authenticated` não tem permissão de `EXECUTE` em `reserve_ai_monetary`; `service_role` tem. Orçamentos confirmados na base: Essencial 500, Cresce 1500, Expande 4000 e Enterprise 4000 centavos/mês.
- **Correção `ac15346b`:** erro durante a chamada à Anthropic agora mantém a reserva para conciliação, pois timeout/erro do cliente não prova ausência de cobrança no provedor. Evita liberar dinheiro indevidamente após um envio ambíguo. Reverso operacional: falhas comprovadamente sem cobrança também deixam reserva aberta até decisão manual; não há reconciliador automático.
- Ainda não foram realizados testes HTTP com sessão real nem chamada paga à Anthropic. Nenhuma reserva ou custo real foi criado nesta rodada; o commit da correção depende de novo CI/deploy.


## Asaas — revisão operacional inicial (19/10/2026)

- Checkout já utiliza catálogo `PLAN_PRICES`, referência de tenant/plano/período e Asaas sandbox configurado por ambiente. Foi adicionado `AbortSignal.timeout(10000)` e `cache:'no-store'` ao envio de criação do link para não manter chamada externa indefinidamente (commit `49e6f9b6`). **Timeout pode ocorrer depois da criação do link**: não tentar novamente automaticamente; avaliar registro de intenção e idempotência do checkout.
- Webhook existente valida autenticação por token em comparação de tempo constante, consulta pagamento e link na API autenticada e aplica pagamentos via RPC idempotente/transacional. Logs de erros transacionais ou de provedor foram reduzidos a códigos/tipos sem imprimir objetos de exceções potencialmente sensíveis (commit `869423b9`).
- Cron `suspend-overdue` **não suspende assinaturas**, apenas relata quantas exigem conciliação. Mantido intencionalmente: não desabilitar serviços com base em status sem política de carência/checagem da fatura.
- **Ainda pendente:** verificação de eventos de estorno e cancelamento com política explícita, renovação recorrente e reconciliação do pagamento, idempotência de criação do payment link, testes em sandbox com reenvio de webhook e eventos fora de ordem. Nenhuma cobrança real emitida neste ciclo.

## Superadmin: acompanhamento de assinaturas (19/10/2026)

- Nova pagina somente de leitura em `/superadmin/assinaturas`, com sessao verificada e papel Superadmin, consulta a `subscriptions` e `tenants` e indicador de vencimentos nos proximos sete dias, periodos encerrados e status `overdue`.
- Reutilizada a navegacao do `DashboardLayout`; commits `369da295` e `49174dcb`.
- Nenhuma operacao de pagamento, cancelamento ou suspensao e oferecida na interface. Fim do periodo nao implica inadimplencia verificada; conciliacao Asaas segue obrigatoria.
- Consulta limitada a 500 assinaturas e empresas: a tela deve sinalizar ampliacao/paginacao antes de escalar. Nao representa reconciliacao financeira completa.
- Proxima rodada: validacao automatizada, publicacao e verificacao autenticada do painel; depois projetar fila de conciliacao segura para cancelamentos e estornos.

## Financeiro — visão de conciliação no Superadmin (19/10/2026)

- A página `/superadmin/assinaturas` agora inclui os pagamentos conciliados de `asaas_processed_payments` e eventos recentes de `billing_events`, reutilizando a autenticação de Superadmin e a lista de empresas. Commit `1604c5f0`.
- Ambas as tabelas são consultadas via service role apenas no servidor, depois de verificar o papel `superadmin`; não há ação de cancelamento, cobrança, estorno ou suspensão.
- A visualização mostra até 250 pagamentos confirmados e 250 eventos internos; não representa todos os lançamentos, faturas abertas ou status atual do Asaas. Vencimentos continuam sendo sinalizadores operacionais, não provas de atraso.
- Próxima pendência: mecanismo de reconciliação autorizado com a API do Asaas para situações de reembolso, chargeback e cancelamento, com validação do vínculo da cobrança ao tenant e decisão de negócio antes de alterar acesso.

## Asaas: conferência sob demanda no Superadmin (19/10/2026)

- Endpoint somente GET `api/superadmin/asaas-payment-status`: exige sessão e perfil superadmin, aceita apenas `paymentId` válido e previamente registrado em `asaas_processed_payments`. Consulta a cobrança na API do Asaas conforme ambiente configurado, verifica identidade, valor e referência tenant/plano/ciclo; caso tenha paymentLink, também valida o link autenticado. Não grava dados nem altera contratos.
- Botão `Consultar Asaas` adicionado a cada pagamento confirmado em `superadmin/assinaturas`, com indicador de status atual e identificação do ambiente sandbox/produção.
- Escopo: somente pagamentos previamente conciliados no Kyra Atende; não lista cobranças abertas que nunca chegaram ao webhook. Respostas com estorno, cancelamento ou status divergente são informativas e devem levar à conferência manual, nunca alteração automática de acesso.
- Pendente homologação HTTP real com Superadmin, resposta de sandbox e chamadas não autorizadas; não foram criadas cobranças nem executados estornos.

## Asaas — análise manual de estornos e contestações (19/10/2026)

- Estrutura `asaas_payment_reviews` criada com RLS e privilégios exclusivos de `service_role`, vinculada a pagamentos previamente processados.
- Função `save_asaas_payment_review` valida o ator Superadmin, exige motivo e anotação, e grava revisão e evento em `admin_audit_events` na mesma transação. A RPC não concede nem revoga acesso.
- API `POST /api/superadmin/asaas-payment-reviews` valida sessão/papel e dados. No componente de consulta de status do Asaas, resultados divergentes expõem formulário de análise para estorno, contestação, cancelamento ou outro motivo.
- A interface não executa ação financeira nem mudança de plano. Revisões de pagamentos não conciliados originalmente ainda não estão incluídas; consulta HTTP autenticada e teste de persistência com pagamento de homologação ainda são necessários.
- Testes de permissão RPC e consulta sem criação de revisões executados; nenhuma cobrança real modificada. Sem automação de suspensão, reembolso ou cancelamento.

## Superadmin — fila de pendências financeiras (19/10/2026)

- Nova página `/superadmin/pendencias-financeiras` reaproveita `asaas_payment_reviews`, tenants e perfis, exibindo casos em análise, encaminhados e total analisado, com último responsável e data. Commits `b39b6a0b` e `8905579f`.
- Permissão Superadmin conferida no servidor antes de consultar dados com service role. Não oferece estorno, cancelamento, emissão de cobrança ou suspensão.
- A fila apresenta até 500 revisões recentes e é um retrato da última revisão, não um extrato vivo do Asaas; conferir pagamento individualmente na tela Assinaturas para status atual. Auditoria de alterações fica no banco.
- Pendente teste autenticado da tela e confirmação do deploy/Quality Gates; não houve mudanças financeiras nesta etapa.

## Fila financeira — filtros e histórico auditado (19/10/2026)

- A tela `/superadmin/pendencias-financeiras` passou a oferecer filtros por cliente, andamento e datas de última atualização, mantendo estado local no navegador. Componente `ReviewQueue.tsx` mostra histórico de alterações de cada pagamento ao expandir a linha.
- A página consulta `admin_audit_events` com filtros por `resource_type='asaas_payment'` e `action='asaas.payment.review'`, após validar Superadmin. A consulta limita a 1.000 eventos e a fila a 500 análises; ambos são amostras recentes, não histórico completo garantido.
- Somente leitura: nenhum status financeiro ou acesso é alterado; ausência de evento na janela consultada não significa ausência de auditoria antiga.
- Commits `5bd03257`, `55c6d82a`, `420d42ee`. Aguardar Quality Gates e deploy, além de teste autenticado da interface.

## Fechamento financeiro — rastreabilidade do checkout Asaas (19/10/2026)

- Criada `asaas_checkout_attempts` com RLS restrita ao service role; registra início, sucesso, rejeição e resultado incerto de cada criação de link. Migration aplicada ao Supabase e versionada em `20261020052000_asaas_checkout_attempts.sql`.
- Checkout agora salva tentativa antes de chamar Asaas e registra ID/link/status ao retornar. Falhas de rede, timeout, resposta 5xx ou link inválido são marcados como incertos para conferência, sem disparar cobrança automática adicional.
- Superadmin > Assinaturas exibe até 100 tentativas recentes, destacando as de resultado incerto.
- **Limitação deliberada:** não há prevenção completa de duplicidade entre múltiplas requisições de checkout nem renovação recorrente automática; a nova tabela é rastreabilidade, não chave idempotente garantida no Asaas. Não criar automaticamente links de substituição para casos incertos.
- Nenhum link real foi criado nesta implementação. Necessária homologação em sandbox e conferência de migração/deploy antes de declarar o checkout pronto para cobrança de produção.

## Checkout Asaas — proteção contra requisições duplicadas (19/10/2026)

- Nova RPC `claim_asaas_checkout` com trava transacional por tenant/plano/período, restrita ao `service_role`. Identifica tentativas `started` e `uncertain` anteriores e devolve link criado nos últimos 24 horas em vez de emitir outro. Commit SQL `6d207782`; rota `c00047c7`.
- Tentativas em estado incerto ou iniciado exigem conciliação manual; não são automaticamente liberadas. Isso pode bloquear uma nova compra daquela combinação até correção administrativa e é uma decisão de segurança para evitar links duplicados.
- Teste SQL com transação revertida: a primeira claim foi aceita e a segunda, reconhecida como repetida; permissão EXECUTE somente service_role. Sem cobrança e sem dados persistidos pelo teste.
- **Limitação:** proteção vale a mesma combinação de tenant/plano/ciclo/valor; não substitui idempotência nativa do provedor para variações de pedido nem reconciliação de links criados sem resposta. Links bem-sucedidos são reutilizados até 24 horas, sem verificar automaticamente se foram pagos ou cancelados; essa checagem precisa integrar a próxima rodada.

## Fechamento de rodada Git + Supabase (19/10/2026)

- Migration versionada `20261020054000_asaas_checkout_stale_claim.sql`, aplicada no Supabase como `asaas_checkout_stale_claim`.
- A RPC de checkout passa a classificar tentativas `started` com mais de 15 minutos como `uncertain` ao verificar nova solicitação para o mesmo cliente/plano/ciclo/valor. Mantém bloqueio de duplicação até conciliação; não presume ausência de cobrança.
- Teste SQL em transação revertida: primeira solicitação aceita, tentativa envelhecida classificada como incerta e permissão de execução negada a `authenticated`. Nenhuma cobrança foi criada.
- A verificação de entrega exige manter migrations no Git e aplicadas no Supabase; conclusão de deploy deve ser reportada separadamente.

## Contratação pendente — plano bloqueado no cliente (19/10/2026)

- Validada lacuna funcional: a trava anterior era por cliente/plano/ciclo, permitindo iniciar outro checkout com plano diferente. Corrigida no banco para trava transacional por tenant, independentemente de plano ou período (`20261020055000_asaas_checkout_tenant_lock.sql`).
- Pendências de link de checkout não expiram mais após 24 horas apenas por idade (`20261020056000_asaas_checkout_pending_persistent.sql`); requerem conciliação.
- Endpoint autenticado `GET /api/billing/pending` e avisos em `configuracoes/plano` e `configuracoes/assinatura`. O modal `PlanModal` consulta pendência e impede seleção e compra até consulta sem pendência; falha de consulta bloqueia por segurança.
- Criado estado `paid` no ledger de tentativas (`20261020057000_asaas_checkout_paid_state.sql`). Webhook validado e idempotente passa a fechar o checkout correspondente pelo identificador do paymentLink quando o pagamento é confirmado. Sem vínculo de paymentLink a pendência permanece para conciliação manual; nunca presumir pagamento por data.
- Teste SQL revertido: checkout inicial aceito; outra contratação de plano diferente bloqueada; status `paid` permitiu nova tentativa. Sem dados de teste persistidos.
- **Limitação:** interface sinaliza pagamento/checkout pendente, não equivale a consulta de status financeiro em tempo real a todos os pagamentos no Asaas; links externos sem processamento do webhook exigem conciliação.

## Trial → assinatura paga: opção A aprovada (19/10/2026)

- Durante o trial, a seleção do plano que está sendo experimentado passa a permitir contratação, inclusive do mesmo plano. Os quatro ciclos existentes continuam disponíveis. A condição de assinatura ativa mantém a restrição de checkout idêntico.
- `PlanModal` recebe `isTrial`; páginas Configurações > Plano e Assinatura passam a indicar claramente `Assinar plano`. Bloqueio por pagamento em aberto continua independente do trial.
- Migration `20261020058000_asaas_trial_conversion_immediate.sql` versionada e aplicada: quando `tenants.plan_status='trial'`, a RPC `apply_verified_asaas_payment` define início da assinatura paga em `now()` na confirmação verificada pelo Asaas; mantém regra de extensão do período para assinaturas fora do trial. `plan_status` passa a `active` na mesma transação existente.
- Validar ponta a ponta com conta em trial e pagamento sandbox, inclusive webhook idempotente. Nenhuma cobrança foi criada nesta rodada. Confirmar resultado final dos workflows/deploy.

## Motor de disponibilidade e vínculo profissionais × serviços — fundação (20/10/2026)

**Regra aprovada:** expediente-base da empresa; profissional herda expediente ou define intervalos próprios. Bloqueios gerais (feriados, inatividade, horários fechados) prevalecem sobre horários particulares, salvo exceção autorizada em futura modelagem. Serviços podem ser executados por vários profissionais, e profissionais podem executar vários serviços (N:N). Links públicos, agendamento interno e canais futuros devem consultar a mesma disponibilidade.

- Schema aplicado e versionado: `20261020100000_availability_and_professional_services_foundation.sql`.
- `availability_settings`: fuso da empresa, antecedência e horizonte; `company_working_hours`: múltiplas faixas semanais; `professional_availability_settings`: herança ou agenda particular; `professional_working_hours`: faixas individuais; `availability_blocks`: feriados, ausências e bloqueios gerais/individuais; `professional_services`: relação N:N com FKs compostas que impedem vínculos entre tenants; `service_assignment_settings`: flag de ativação gradual.
- Todas as sete tabelas têm RLS habilitada e acesso direto negado a usuários comuns; administração deverá passar por API autenticada com validação de tenant.
- Por segurança, **nenhum filtro de profissionais foi ativado nesta etapa** e `enforce_links` inicia `false`: clientes antigos e agendas atuais não devem ficar sem opções só porque os vínculos ainda não foram cadastrados.
- Teste SQL em transação revertida: inserção de associação e expediente seguida de rollback; conferidas sete tabelas remotas. Não foram criados horários, feriados ou vínculos reais.
- **Próximas entregas necessárias antes da ativação:** endpoints de configuração protegidos e UI; validação de sobreposição de intervalos; definição de como feriados recorrentes e exceções especiais serão cadastrados; motor único de slots respeitando duração do serviço, fuso, expediente efetivo, bloqueios, profissionais habilitados e conflito de reservas; enforcement no POST/PUT de bookings e no link público; testes concorrentes e HTTP autenticados.
- Não confundir fundação de schema com motor de disponibilidade ou seletor de profissionais homologado. A vinculação N:N já está prevista para evitar retrabalho quando se ativar o filtro nas telas.

## Configuração inicial de expediente da empresa (20/10/2026)

- Adicionada a página `/configuracoes/horarios` para cadastrar múltiplas faixas semanais por dia e link nas configurações.
- `GET /api/settings/availability` consulta dados do tenant autenticado, incluindo expediente, lista de profissionais/serviços e vínculos N:N; `PUT` salva as faixas de expediente com verificação de horários e sobreposição.
- Migration `20261020101000_save_company_working_hours.sql` versionada e aplicada; RPC `save_company_working_hours` substitui as faixas numa transação, valida o ator vinculado ao tenant e é executável somente via service role. Tabelas continuam fechadas para acesso direto.
- SQL transacional de cadastro de duas faixas (08h–12h e 13h–18h) executado e revertido, sem alterar expedientes reais. Endpoint HTTP autenticado e interface publicada ainda requerem teste de homologação.
- **Importante:** esta é a primeira configuração de expediente, ainda não o motor de disponibilidade. Horários configurados não interferem em reservas existentes ou novos agendamentos até integração posterior. Também faltam UI de bloqueios, cadastro de faixas próprias, vínculo N:N editável e validação de agenda pública.

## Configuração de profissionais — expediente e serviços (20/10/2026)

- API `GET /api/settings/availability` inclui horários e modos de profissionais; nova rota autenticada `PUT /api/settings/availability/professional` chama RPC com tenant e ator da sessão.
- Migration versionada e aplicada `20261020102000_save_professional_availability.sql`: salva atomicamente herança/horários próprios e vínculos N:N profissional-serviços; valida tenant, intervalo, sobreposições e serviços do mesmo tenant; acesso exclusivo de service role.
- UI `ProfissionaisHorarios.tsx` integrada em `/configuracoes/horarios` permite escolher profissional, herdar expediente ou editar faixas próprias e marcar múltiplos serviços.
- Teste SQL em transação revertida testou registro de horário e vínculo; usuário `authenticated` sem permissão direta da RPC. Nenhum dado real de horário/vínculo permaneceu após teste.
- **Ainda não ativo em agendamentos ou links públicos**: associação N:N, bloqueios e expediente individual aguardam motor central e validação de reservas. Não forçar associações nos tenants antigos sem ativação explícita.

## Feriados e bloqueios de disponibilidade (20/10/2026)

- Migration `20261020103000_manage_availability_blocks.sql` aplicada e versionada; RPCs restritas a service_role para salvar/remover bloqueios gerais ou individuais, com validação do tenant, do profissional, limites de intervalo e categoria.
- Endpoint autenticado `GET/POST/DELETE /api/settings/availability/blocks` e tela em `/configuracoes/horarios` para cadastrar feriados, ausências, indisponibilidade e inatividade; remoção sob confirmação do servidor.
- Teste de inserção e remoção no PostgreSQL executado com `ROLLBACK`, sem resíduos; privilégios diretos negados a `authenticated` confirmados.
- Pendências: motor central para aplicar os bloqueios aos slots; não foi ativada nenhuma restrição de agendamento nesta rodada. Feriados recorrentes/calendário nacional automático e exceções permissivas ainda não implementados. HTTP E2E e publicação requerem verificação.

## Motor de disponibilidade — prévia autenticada de slots (20/10/2026)

- Criada RPC `get_available_slots` service_role-only: combina faixa geral da empresa, horário específico/herdado, vínculos profissional/serviço sob ativação gradual, duração de serviço, bloqueios e reservas concorrentes existentes; geração em passos de 15 minutos no fuso cadastrado. Migrations versionadas `20261020104000_get_available_slots.sql`, `20261020104100_fix_available_slot_timestamps.sql`, `20261020104200_fix_available_slot_interval.sql`, todas aplicadas remotamente.
- API `GET /api/availability/slots?serviceId=...&date=...&professionalId=...` exige sessão vinculada ao tenant, consulta RPC por service role e retorna slots apenas para visualização.
- Validação SQL transacional com `ROLLBACK`: configuração temporária de expediente gera horários futuros; bloqueio geral temporário elimina os slots; nenhuma configuração nem bloqueio de teste persistidos.
- **Não ativado:** agendamento interno e link público ainda não consomem o motor, nem a inserção/edição fazem enforcement. Não apresentar prévia como garantia de reserva; banco continua protegendo sobreposição. Próximos passos: validação de duração e disponibilidade em POST/PUT com travamento transacional, proteção de fusos/DST, profissão sem vínculo e E2E de links públicos; conferir regras de preço e permissões.

## Convites de agendamento sem dados pessoais na URL (20/10/2026)

- Regra confirmada: link público de empresa mantém formulário em branco; convite individual enviado ao cliente preserva pré-preenchimento de nome, telefone e e-mail.
- Migration `20261020105000_booking_invitation_tokens.sql`: `booking_invitations` por tenant/cliente, hash SHA-256 do token randômico de 32 bytes, vencimento de sete dias e campo de revogação. RLS ativa, usuário comum sem acesso direto.
- Endpoint de envio gera convite e envia URL contendo somente slug e token opaco (`?convite=`), sem PII. Página pública valida hash, tenant, vencimento e revogação antes de carregar os três campos do cliente. Parâmetros legados de nome/e-mail/telefone não são mais aceitos como pré-preenchimento. Página marca política no-referrer e noindex.
- Verificações: migration aplicada, tabela confirmada, leitura direta por authenticated negada; Quality Gates da implementação inicial passaram. **Faltam** prova HTTP de envio/abertura com Resend em sandbox, limpeza de convites gerados cujo e-mail falhar, interface de revogação e política de rate-limit contra tentativas de acesso; evitar afirmar E2E homologado. Links antigos ainda podem conter PII em históricos/logs externos — não são apagados pela correção.
- Motor de disponibilidade permanece separado e sem enforcement sobre o formulário público até completar validação transacional do salvamento.

## Convite de uso único + fundação do Portal central (20/10/2026)

- Decisão de produto: convite individual consumido no primeiro agendamento concluído; Portal central com identidade compartilhada entre empresas, dados de cada tenant isolados e acesso mediante verificação de e-mail.
- Migration versionada e aplicada `20261020110000_single_use_booking_invitations_customer_identity.sql`: `booking_invitations.consumed_at` e `consumed_booking_id`; RPC `create_booking_from_invitation` restringida a service_role, com `FOR UPDATE` no convite e inserção de booking + consumo de token na mesma transação; tabelas `customer_identities` e `customer_memberships` com RLS, privilégio service_role e FKs compostas tenant+cliente.
- `POST /api/public/bookings` aceita `convite` e roteia confirmação pela RPC atômica. A página `/agendar/[slug]` rejeita tokens consumidos/expirados/revogados; `BookingFlow` repassa somente o token validado quando pré-preenchido.
- Portal `/portal` criado com entrada por OTP de e-mail e consulta das empresas apenas por memberships vinculadas ao usuário autenticado. **Não existe ainda mecanismo para criar memberships verificadas; conta autenticada sem vínculos exibe estado vazio, não dados de clientes.**
- Teste SQL com rollback confirmou consumo e rejeição do segundo uso; execução direta da RPC pelo papel authenticated negada. Sem criação permanente de agendamento de teste.
- **Faltam antes de lançar portal ao público:** confirmação do template Supabase Auth para código de e-mail (pode estar configurado para magic link), endpoint de vinculação ao cadastro após verificação robusta, políticas/UX de múltiplas empresas, funções de listar/cancelar/remarcar, auditoria de sessão, rate-limit e E2E com contas reais.
- **Limitação de agendamentos:** o fluxo público existente ainda não valida o novo motor de disponibilidade no ato da reserva; evitar afirmar que a integração foi concluída. A deduplicação pública por telefone não confere titularidade e não deve criar vínculo de portal.

## Portal central — ativação de vínculo verificado (20/10/2026)

- Migration `20261020111000_claim_verified_customer_invitation.sql` aplicada no Supabase e versionada: RPC `claim_customer_invitation` exclusiva de service_role exige Auth com e-mail confirmado, convite individual vigente, já consumido num agendamento real, pertencente ao mesmo cliente/tenant, e igualdade com o e-mail verificado. A RPC cria identidade e membership numa transação idempotente.
- Endpoint autenticado `POST /api/portal/claim` recebe apenas slug e token, deriva a identidade do `getUser()` e verifica a empresa antes de chamar RPC. Frontend `/portal` recebe campo para colar convite utilizado após confirmar agendamento.
- Validações: função negada ao papel `authenticated`; cenário sem identidade verificada não cria vínculo; teste SQL revertido. Nenhum cliente foi vinculado artificialmente.
- Pendências: validar e configurar template de código OTP no Supabase Auth, garantir verificação de sessão HTTP E2E e proteção antiabuso, possibilitar ativação de clientes sem convite individual, histórico e agendamento autenticado por tenant, tratamento de expiração e revogação, além de experiência de resgatar convite sem copiar token. O portal ainda não deve ser considerado homologado.

## Portal central — consulta dos próprios agendamentos (20/10/2026)

- Implementados `GET /api/portal/overview` e `PortalOverview` dentro de `/portal`: seleção da empresa, listagem dos agendamentos do cliente autenticado e link público para novo agendamento.
- A API exige usuário autenticado com e-mail verificado; `customer_memberships` restringe exatamente os pares `tenant_id + client_id` a consultar. Nenhum filtro por telefone ou e-mail digitado dá acesso ao histórico. Resultado privado `no-store`.
- O botão de novo agendamento abre o link público existente; **não há ainda preenchimento automático por sessão do portal**. Cancelamento/remarcação e integração dos slots públicos continuam pendentes.
- Nesta etapa não é necessária nova migration; schema `customer_memberships` da etapa anterior reaproveitado. Confirmar CI do último commit, deploy e teste HTTP real multitenant antes de homologar.

## Portal do Cliente — novo agendamento autenticado (20/10/2026)

- Rota `GET/POST /api/portal/bookings` permite ao cliente autenticado consultar serviços/profissionais/slots de empresa com vínculo verificado e criar agendamento sem enviar dados pessoais pelo navegador.
- RPC `create_portal_booking` versionada em `supabase/migrations/20261020112000_create_portal_booking.sql` e aplicada remotamente: valida o par exato identidade/tenant/cliente; busca nome, telefone e e-mail diretamente do cadastro; consulta slots na mesma transação, protegida por advisory lock por empresa/profissional e restrição existente de conflito no banco. Não concede acesso ao portal por telefone ou e-mail digitado.
- UI `PortalNewBooking` integrada a `PortalOverview`: seleção de serviço, profissional opcional, data e slot disponível, com atribuição concreta de profissional no momento da reserva.
- Teste transacional (ROLLBACK): identidade sem vínculo não cria agendamento; papel authenticated sem execução direta da RPC. Não houve reserva real criada.
- Pendências: teste HTTP E2E com identidade/empresa e horários reais, publicação Vercel, política de feriados/DST em fusos, qualidade visual, paginação e rate limiting. A agenda pública e a agenda interna ainda não exigem o novo motor. Alterações/cancelamentos no portal não foram liberados. Não chamar fluxo comercial homologado até E2E.

## Integração gradual do motor — agenda interna e link público (20/10/2026)

- A API pública de consulta `/api/public/slots` aceita `serviceId` e utiliza a RPC central `get_available_slots` quando há expediente da empresa configurado; resposta `engine=true` com profissional e início/fim exatos. Clientes sem expediente seguem no modo legado, sem perda de funcionamento.
- `BookingFlow` público consome slots do motor onde habilitado e passa um profissional concreto em reservas com opção 'qualquer profissional'; na ausência de expediente usa o comportamento anterior.
- Helper `lib/availability-validation.ts` valida tenant, serviço, profissional, início e fim contra os slots remotos. Novos agendamentos em `POST /api/public/bookings` e `POST /api/bookings` recusam slots inválidos em empresas com expediente; indisponibilidade do backend falha de maneira fechada. Banco conserva proteção de conflito concorrente por profissional.
- Nenhuma alteração de schema nesta rodada; foram reutilizadas as RPCs e tabelas de disponibilidade já aplicadas. Não afirmar homologação E2E até executar testes HTTP com clientes reais de teste.
- **Pendências antes de aplicar regras a 100% dos fluxos:** edição/reagendamento `PUT /api/bookings/[id]` ainda não valida o motor; o calendário individual customizado da RPC atual intersecta com horário da empresa e precisa ser adaptado para suportar profissional fora do expediente normal com fechamento global prevalecendo; calendário público ainda tem navegação legada sem domingo; faltam bloqueios adicionais nos dados legados sem expediente, testes de fusos/DST e proteção de rate limit. Considerar validação transacional no banco para evitar troca de disponibilidade entre consulta e gravação.

## Cancelamentos e remarcações — atualização de disponibilidade (20/10/2026)

- O motor consulta `bookings` em tempo real, somente status `pending`/`confirmed` bloqueiam slots: confirmação não libera o slot, cancelamento libera na próxima consulta, remarcação move ocupação sem invalidar histórico.
- Migration `20261020113000_rescheduling_slot_exclusion.sql` versionada/aplicada: função `get_available_slots_for_reschedule`, service_role-only, exclui apenas a reserva sendo editada para impedir falso conflito com ela mesma.
- `lib/availability-validation.ts` aceita `excludeBookingId`; `PUT /api/bookings/[id]` verifica serviço, profissional e novo período com o motor antes de aplicar alteração, mantendo comportamento anterior para empresas sem expediente configurado. Apenas edições de notas/dados do cliente não disparam revalidação.
- Teste SQL transacional revertido: reserva ocupada bloqueou slot, função de remarcação mostrou slot próprio, cancelamento liberou o slot. Nenhuma reserva ou alteração real persistida.
- Pendência técnica para homologação integral: validação e atualização do `PUT` ainda são duas operações distintas; em cenários concorrentes a restrição de exclusão de sobreposição no banco continua garantindo não duplicar profissional, mas bloqueios administrativos criados entre a checagem e gravação exigem futura operação transacional de remarcação. Ajustar horários customizados fora do expediente-base e testar clientes HTTP reais.

## Remarcação atômica e agenda particular independente (20/10/2026)

- Migration `20261020114000_custom_professional_hours_outside_company.sql` versionada e aplicada: profissionais com `mode=custom` usam seus próprios intervalos mesmo fora do expediente-base da empresa; `mode=inherit` segue apenas a grade geral. Bloqueios globais e individuais continuam prevalecendo.
- Migration `20261020115000_atomic_reschedule_booking.sql` versionada/aplicada: RPC `reschedule_booking_atomic` exclusiva de service_role, verifica vínculo de funcionário da empresa, status, serviço e duração, bloqueia transação, recalcula disponibilidade excluindo apenas o próprio agendamento e atualiza reserva com snapshot do cliente numa operação única.
- `PUT /api/bookings/[id]` chama a RPC para edições de horário, serviço ou profissional; atualizações de observações seguem fluxo atual. O horário antigo fica livre e o novo fica ocupado após commit, sem cache persistente.
- Teste transacional revertido: profissional das 14h–18h apesar de expediente geral 08h–12h; remarcação 14h→15h liberou 14h e ocupou 15h. Nenhuma reserva real alterada.
- Pendente: teste HTTP de remarcação com usuário real; revisão de concorrência envolvendo criação de bloqueio administrativo durante a transação; adequação de UI para expediente customizado e validação completa de Vercel; lógica de profissional sem expediente configurado e contrato de ausência de agenda devem ser explicitados antes da homologação.

## Homologação de concorrência — bloqueios e reservas (20/10/2026)

- Auditoria do schema confirmou que gravação/remoção de bloqueio geral não era serializada com validação de agendamento/alteração; havia janela de concorrência com alteração administrativa de disponibilidade.
- Migration `20261020116000_serialize_availability_writes.sql` versionada e aplicada: `save_availability_block`, `delete_availability_block`, `create_portal_booking` e `reschedule_booking_atomic` agora usam `pg_advisory_xact_lock` da mesma empresa antes de ler/alterar disponibilidade. Todas quatro funções inspecionadas e confirmadas remotamente.
- **Limitação:** novas reservas criadas pelas rotas públicas e internas legadas ainda usam INSERT direto, sem adquirir o mesmo lock. Elas contam com a restrição existente de sobreposição por profissional e checagem anterior à inserção; concorrência com bloqueios administrativos não está totalmente resolvida nelas. É necessário migrar criação pública, convites e criação interna para RPCs atômicas, além de concorrência real em múltiplas sessões.
- Nenhuma agenda de cliente foi alterada nesta etapa. Homologação HTTP ponta a ponta, testes DST/fusos e UX do portal permanecem pendentes; não chamar o motor integralmente homologado.

## Criação de reservas unificada em transação (20/10/2026)

- Migration `20261020117000_unify_booking_creation.sql` versionada e aplicada remotamente. RPC `create_booking_checked` compartilha lock transacional por tenant com bloqueios administrativos, verifica tenant, cliente, serviço, duração, profissional, horário e sobreposição. Empresa com expediente configurado exige slot válido retornado pelo motor; sem expediente, mantém retrocompatibilidade operacional.
- A RPC `create_booking_from_invitation` agora invoca `create_booking_checked` e consome o token individual na mesma transação; se a reserva falhar, o convite permanece não consumido.
- `POST /api/bookings` e `POST /api/public/bookings` utilizam a RPC atômica em vez de INSERT direto. A rota do Portal do Cliente já tinha RPC atômica e usa o mesmo lock do tenant, portanto os três canais compartilham coordenação transacional.
- Teste SQL transacional revertido confirmou primeira reserva, recusa de duplicidade de horário e liberação após cancelamento; permissão de execução direta para authenticated negada. Nenhum agendamento de teste persistido.
- Restam homologação HTTP multicanal, rate-limiting público, deduplicação/criação de cliente público dentro de transação, revisão de profissão não escolhida para tenants legados, adaptação de UI e validação com sessões concorrentes reais; CI/Vercel precisam ser confirmados após commit final. Não declarar homologação completa sem esses cenários.

## Reserva pública e criação de cliente atômicas — 20/10/2026

- Migration `20261020118000_atomic_public_client_booking.sql` aplicada e versionada: RPC service_role-only `create_public_booking_atomic` serializa por tenant, preserva a identificação legada pelo telefone e cria lead+agendamento dentro da mesma transação por meio de `create_booking_checked`.
- `POST /api/public/bookings` (sem convite) delega ao novo RPC; não deixa cadastros de lead órfãos quando o slot é inválido ou o agendamento falha. Convite individual segue RPC separada de uso único; portal usa identidade verificada.
- Teste SQL com `ROLLBACK` confirmou falha de reserva com duração inválida sem persistência de cliente e execução direta negada ao papel authenticated. Não foram criados cadastros/agendamentos reais.
- Pendências: execução E2E HTTP autenticada e anônima com teste multitenant; testes paralelos em duas sessões independentes; rate limit por IP em endpoints públicos; proteção e verificação de titularidade de telefone (deduplicação não significa autenticação); revisão de comportamento legado quando profissional não é selecionado; calendário, fuso e templating de OTP; verificação final do CI e deploy.

## Transição de frente — motor de agenda para WhatsApp (20/10/2026)

- Motor de agenda: escopo SQL/CI tecnicamente validado, evidências consolidadas em `docs/AUDITORIA-CONSOLIDADA-AGENDAMENTOS-2026-10-20.md`. **Não homologado E2E**: sem expediente efetivo e sem memberships do Portal nos tenants atuais. Retomar somente no gate de aceite com identidades de teste e sessão HTTP real.
- Frente ativa passa a ser **WhatsApp/Evolution**, P0 do inventário original. Evitar reutilizar número real ou compartilhar credenciais e não executar envios automáticos sem ambiente dedicado.
- Revisão atual de `lib/whatsapp.ts`: outbox registra intenção antes do envio, diferencia `sending`, `unknown`, `accepted`, `reconcile` e `recorded`; estados ambíguos não têm retry automático. Entrada grava mensagem inbound antes de IA e ignora duplicados; **não possui ainda processamento recuperável/lease para falhas após registro inbound**.
- Proteção incremental no webhook `app/api/whatsapp/webhook/route.ts`: após autenticar o segredo, rejeitar corpo maior que 1 MiB (checagem de cabeçalho e tamanho efetivo) com HTTP 413. Não envia mensagens, não altera instâncias e não migra schema.
- **Próximo pacote WhatsApp:** fila persistente de processamento inbound com `pending/processing/done/failed/needs_review`, ID externo idempotente, lease/lock e reconciliação. Não implementar reenvio automático em status de entrega ambígua. Requer testes de concorrência e casos de falha.
- **Critério operacional:** antes de homologar a Evolution, configurar segredo de webhook e instância de QA exclusiva e comprovar HTTP 401/413/200, evento duplicado, falha de IA, falha do provedor e resposta entregue sem histórico, sem tocar números reais.

## WhatsApp — rastreio durável do processamento inbound (20/10/2026)

- Migration `20261020119000_whatsapp_inbound_processing_audit.sql` aplicada/versionada: `whatsapp_inbound_processing` armazena tenant, ID externo único por tenant, referência ao histórico, status `processing/done/needs_review` e etapa técnica de revisão (sem corpo da mensagem). Acesso direto revogado de anon/authenticated, RPCs somente service_role.
- `lib/whatsapp.ts` após gravar inbound registra claim idempotente antes de chamar IA, sinaliza resultado `done` ou `needs_review`. Nenhum reenvio automático é feito. Em erro de persistência do claim, webhook retorna falha e não processa IA; a duplicação inbound já registrada impede nova execução, exigindo revisão operacional.
- Teste SQL em `ROLLBACK`: primeiro claim vence, claim repetido não processa, atualização de estado somente uma vez, estado terminal preservado e acesso direto authenticated negado. Nenhuma mensagem enviada.
- **Limites:** ainda não é uma fila recuperável com leases/workers; falhas após inserção de inbound e antes do claim podem ficar sem rastreamento e precisam de reconciliação; mensagens `processing` antigas requerem triagem humana. Não automatizar retry de mensagens com entrega incerta, pois pode duplicar resposta.
- Para homologar: instância isolada Evolution, segredo configurado, testes de webhook legítimo, duplicidade, processamento IA com e sem resposta, resposta HTTP ambígua e monitoramento de estados. Evitar tocar números reais.

## Roadmap futuro — integração oficial WhatsApp Business Platform (Meta)

- Decisão de produto em 20/10/2026: manter Evolution API por QR Code para homologação atual; planejar integração futura com a **Cloud API oficial da Meta**, onboarding por tenant/WABA, webhooks autenticados, templates, consentimento, tarifação e migração por empresa.
- Cada tenant conecta seu número próprio; a plataforma Kyra Atende não exige um número central. Não reutilizar números de outros sistemas sem plano de transição, e não modificar a integração ativa durante este pacote.
- Esta frente é **roadmap** e não está implementada nesta etapa.

## Ajuste de homologação — primeira mensagem após aprovação de IA

- A fila atual registra só telefone/metadados antes da autorização; por isso aprovar IA não processa o texto original. Solução condicionada a armazenar **somente o ID técnico da primeira mensagem e o JID** e recuperar o texto pela Evolution apenas após a decisão do proprietário.
- Critérios: nunca persistir conteúdo não autorizado no Supabase; identificação exata da mensagem; nenhuma resposta duplicada em decisões concorrentes; preservar integração com outras empresas; falhar fechado e sinalizar pendência se a Evolution não encontrar o evento.
- Não realizar automaticamente reenvio quando o estado da entrega for incerto.

### Aceite funcional informado pelo usuário — 20/10/2026

- **Validado pelo usuário:** cenário da primeira mensagem respondida pela IA após autorização de contato no WhatsApp/Evolution, sem necessidade de reenviar a solicitação.
- O comportamento de colocar contatos desconhecidos na fila de autorização também foi confirmado pelo usuário; um número adicional visto na fila era um contato pessoal distinto, não um problema de identificação.
- Este aceite refere-se ao **fluxo funcional observado**, não encerra a homologação técnica E2E completa da Evolution. Permanecem abertos os testes de eventos duplicados, falha de IA, entrega ambígua, reconciliação, isolamento por tenant e recuperação de processamento.

### Homologação incremental de idempotência WhatsApp — 20/10/2026

- Testes SQL em transação `BEGIN/ROLLBACK` no Supabase, sem envio de mensagens nem persistência de dados de teste.
- `claim_whatsapp_inbound`: primeira reivindicação `true`, repetição do mesmo identificador `false` — **aprovado**.
- `complete_whatsapp_inbound`: transição `processing → needs_review` retornou `true`; segunda tentativa de finalizar o mesmo evento como `done` retornou `false` — **aprovado**.
- **Ainda em aberto:** entrega duplicada real por webhook HTTP, testes de falha real IA/Evolution, validação de saída `unknown/reconcile`, eventual reconciliação de `processing` antigos e testes concorrentes com múltiplas requisições. Nenhum retry automático de saída ambígua.

### Encerramento da rodada WhatsApp e transição — 20/10/2026

- Encerrada **a rodada de verificações solicitada**: autorização de contatos, primeira mensagem autorizada (aceite informado pelo usuário), idempotência de claim e transição terminal (testes SQL com ROLLBACK).
- **Não equivale a homologação E2E completa da Evolution**: webhook duplicado real, falha efetiva de IA/provedor, entrega ambígua, recuperação de processamento e isolamento com múltiplos tenants permanecem sem prova de aceite. Manter esses riscos registrados para rodada dedicada, sem reenvio automático em situação ambígua.
- Próxima frente ativa: **Agenda e Dashboard — homologação funcional dos ajustes publicados**, incluindo agendamentos em datas futuras, dias com bloqueios e consistência de indicadores. Nenhuma mudança no motor de disponibilidade sem novo aceite.

### Aceite funcional da Agenda — 20/10/2026

- **Validado pelo usuário:** os agendamentos de **03/12/2026** aparecem corretamente na Agenda da TDSoft.
- **Validado pelo usuário:** os dias fechados são sinalizados corretamente na interface.
- Esses dois cenários da Agenda estão homologados funcionalmente. Permanecem fora deste aceite os indicadores financeiros e demais dados do Dashboard, ainda a conferir.
- Próxima atividade: homologação dos KPIs e das seções do Dashboard com a empresa de teste.

### Aceite funcional do Dashboard — 20/10/2026

- **Validado pelo usuário:** Dashboard da empresa de teste apresentou corretamente os indicadores e informações revisados.
- Frente **Agenda e Dashboard encerrada no escopo funcional testado pelo usuário**: Agenda em 03/12/2026, dias fechados e Dashboard.
- Este aceite não substitui testes de concorrência, segurança ou E2E de todos os módulos.
- Próxima frente priorizada: **Asaas / cobrança, assinaturas e limites por plano/consumo de IA**.

### Auditoria Asaas, planos e IA — 20/10/2026 (levantamento, sem operações financeiras)

- Revisados `app/api/billing/webhook/route.ts`, `app/api/billing/checkout/route.ts`, `lib/entitlements.ts`, `app/api/ai/chat/route.ts`, `lib/billing-prices.ts` e `apply_verified_asaas_payment`.
- Controles existentes: webhook Asaas autenticado por token, verificação ativa de status/valor/referência pela API Asaas, processamento idempotente de `payment_id`, registro de tentativa de checkout e prevenção de checkout concorrente.
- Snapshot agregado somente leitura no Supabase: 1 pagamento processado, 4 registros de assinaturas, 0 tentativas de checkout e 0 tentativas incertas no momento da leitura. Sem executar novas cobranças ou atualizar planos.
- **P1 — limite do chat IA não aplicado no fluxo legado**: `app/api/ai/chat/route.ts` faz `chat(messages)` sem verificar `ai_chat_monthly_limit`; registra apenas `ai_chat_tokens_used` depois. A configuração monetária só ativa reserva caso `AI_MONETARY_ENFORCEMENT_ENABLED=true`. Corrigir com contabilização por interação e consumo atômico, respeitando o período de cobrança, e testar concorrência/estouro antes de produção.
- **P1 — teste E2E de cobrança não encerrado**: validar em sandbox ciclo completo checkout → confirmação → assinatura → renovação/cancelamento/conciliação e cenários de webhook repetido, sem usar cobranças reais. Checar se o cancelamento no Asaas tem orquestração própria; webhook atual ignora eventos de suspensão/reversão intencionalmente.
- Tabela `PLAN_ENTITLEMENTS` e `PLAN_PRICES` atualmente definidas em código. Revisar aderência aos preços e limites comerciais administráveis antes de publicá-los como dinâmica por tenant.

### Limites IA — homologação técnica e publicação (20/10/2026)

- PR #8 integrado à main (commit `5121d510`): limite de interações do chat interno com reserva atômica por tenant antes da chamada à IA, segregação por mês UTC e proteção contra liquidação duplicada.
- Supabase: migration `20261021024304_ai_chat_quota_claims` aplicada e alinhada ao repositório.
- Teste SQL transacional com ROLLBACK em tenant Cresce: 200 reservas aceitas, 201ª negada, segunda liquidação negada e limite incompatível com plano rejeitado — **aprovado**, sem alterar contadores reais.
- Checks de qualidade e segurança do PR **aprovados**. Ainda pendentes testes HTTP autenticados com cliente de homologação, falhas reais Anthropic, carga concorrente independente e validação do ciclo mensal em virada de período. A reserva fica conservada para falhas ambíguas, exigindo reconciliação posterior.
- Os controles desta entrega aplicam-se ao **chat interno** `/api/ai/chat`; avaliar separadamente consumos do agente WhatsApp e demais recursos de IA.

### Asaas Sandbox — pré-homologação (21/10/2026)

- Vercel: `ASAAS_SANDBOX=true` confirmado no ambiente production, portanto o código de checkout/webhook aponta para endpoints sandbox do provedor. Não foram feitas chamadas de pagamento nem cobrança real nesta rodada.
- Deploy `5121d510` do limite do chat IA confirmado `READY` na produção; houve um deploy exclusivamente documental posterior cancelado, sem impacto funcional.
- Auditoria estática: o webhook valida token e consulta a cobrança no Asaas antes da conciliação, e a RPC `apply_verified_asaas_payment` verifica `payment_id` para impedir processamento duplo; o checkout registra tentativas e as reutiliza.
- Tentativa de simulação SQL transacional de cobrança duplicada **bloqueada pela ferramenta de segurança antes da execução**. Não afirmar E2E aprovado; nenhum teste de pagamento foi executado.
- Necessário ambiente isolado com dados sintéticos (Supabase de staging separado ou integração sandbox acessível) para testar: checkout → link → confirmação → duplicidade → assinatura → renovação, e conciliação após falha. Não simular operações financeiras na base de produção.

### Asaas — homologação transacional autorizada na base atual (21/10/2026)

- Usuário autorizou simulações financeiras no ambiente atual, ainda utilizado para testes. Executados testes SQL transacionais com `BEGIN`/`ROLLBACK`, sem disparo para API Asaas nem emissão de cobrança real.
- **Aprovado — idempotência** de `apply_verified_asaas_payment`: primeira confirmação do mesmo ID aceita, segunda recusada sem reaplicar cobrança.
- **Aprovado — renovações sucessivas**: dois IDs distintos foram aceitos e a segunda confirmação ampliou o vencimento em relação à primeira.
- **Persistência preservada**: após ambos os testes, 1 pagamento processado, 0 pagamentos fictícios com prefixo de QA e 1 evento `asaas.payment.confirmed` existente. Nenhuma alteração de assinatura/financeiro permaneceu após `ROLLBACK`.
- **Pendente — E2E do Asaas Sandbox**: criar link pelo provedor, simular pagamento no provedor, verificar autenticidade do webhook HTTP, conciliar estados e testar cancelamento/reversão. Ainda não executado. Evitar declarar integração ponta a ponta homologada.

### Asaas — verificação de pré-condições E2E (21/10/2026)

- Confirmado no projeto Vercel: variáveis `ASAAS_SANDBOX=true`, `ASAAS_API_KEY` e `ASAAS_WEBHOOK_AUTH_TOKEN` configuradas para produção (valores sensíveis não expostos).
- Deployment do código IA `5121d510` está `READY`; deploys apenas documentais posteriores foram cancelados.
- O ambiente de ferramentas acessível nesta auditoria não oferece cliente HTTP autenticado para executar POST contra a API do Asaas nem sessão autenticada do Kyra Atende para chamar `/api/billing/checkout`. Assim, **nenhum checkout/link/pagamento de sandbox foi criado**; não alegar teste externo realizado.
- Pré-requisitos para E2E externo: cliente autenticado de tenant sintético ou agente de teste com credenciais seguras, teste isolado e temporário de checkout no sandbox, confirmação em sandbox, webhook autêntico e conferência de idempotência. Manter redirecionamento estrito ao domínio `api-sandbox.asaas.com` e nunca inserir chaves em GitHub, logs ou documentação.

### Asaas Sandbox — aceite de contratação ponta a ponta (21/10/2026)

- Usuário confirmou que gerou link, assinou em sandbox e visualizou plano confirmado no Kyra Atende.
- Consulta somente leitura ao Supabase confirmou: um checkout `paid`, tenant plano `cresce`/`active`, assinatura `active`/`monthly`, período vigente e valor da assinatura igual ao do checkout.
- Snapshot agregado: 2 pagamentos processados, 2 eventos de confirmação financeira e 0 checkouts pendentes. Nenhum registro financeiro foi modificado nesta verificação.
- **Aprovado:** cenário de contratação/ativação de plano Cresce mensal no Asaas Sandbox, com persistência coerente.
- **Pendente de homologação E2E:** renovação real pelo provedor, cancelamento, estorno, duplicação HTTP de webhook e reconciliação de falhas externas. Testes SQL transacionais anteriores não substituem esses cenários.

### Ciclo de vida Asaas — auditoria de cancelamento e estorno (21/10/2026)

- Confirmado no código de `app/api/billing/webhook/route.ts`: apenas `PAYMENT_RECEIVED`/`PAYMENT_CONFIRMED` executam conciliação de assinatura; eventos de cancelamento, estorno ou reversão retornam `ignored: true`, sem revogar acessos. Trata-se de proteção contra suspensão indevida, **não de homologação** do fluxo de cancelamento.
- A RPC `apply_verified_asaas_payment` estende o período ao receber outro `payment_id` válido. A renovação por pagamentos distintos foi anteriormente simulada com rollback; **cobrança recorrente automática no Asaas ainda não foi comprovada**.
- Snapshot somente leitura: 3 assinaturas `active`, 1 `trial`; 2 eventos `asaas.payment.confirmed`. Nenhuma alteração financeira foi feita nesta revisão.
- Próxima entrega: desenhar política de cancelamento ao fim do período e estorno com reconciliação autenticada no Asaas, trilha de auditoria, proteção de eventos fora de ordem e idempotência. Testar em sandbox sem interromper a assinatura usada na homologação. Não promover alteração de `plan_status` sem validação das regras comerciais.

### Asaas — implementação de revisão para eventos negativos (21/10/2026)

- PR #9 em homologação: webhook confere na API autenticada do Asaas o status de estorno, chargeback ou exclusão antes de gravar evento na tabela restrita `asaas_lifecycle_events`.
- Registro idempotente por ID de evento, associado somente a pagamentos já conciliados no Kyra Atende; sem suspensão automática de assinatura, sem alterar período contratado ou planos.
- Checks GitHub de qualidade e segurança aprovados no PR. **Ainda não publicar** até validar a migration remota e os formatos/estados efetivamente emitidos pelo sandbox Asaas; possível divergência de estado entre chegada do webhook e consulta atual deve exigir reconciliação.
- Cancelamento solicitado pelo próprio cliente e vencimento ao fim do período contratual demandam política e implementação distintas. Renovação automática do Asaas também não foi demonstrada.

### Encerramento do pacote Asaas de eventos negativos e handoff para roadmap (21/10/2026)

- PR #9 merged, commit `756dc442`, com AUD-01 Quality Gates e Static Security Checks aprovados; deployment Vercel de produção `READY` confirmado. Migration `20261021033613_asaas_lifecycle_events` aplicada, registrada no histórico remoto e alinhada ao Git.
- Teste SQL transacional com ROLLBACK validou idempotência de evento repetido em `asaas_lifecycle_events`; nenhum evento fictício persistiu.
- **Validados nesta fase:** compra via checkout sandbox com plano ativado e registros coerentes; pagamentos sucessivos/idempotência na rotina SQL; fila de revisão de eventos negativos com storage e CI. **Não homologados:** recebimento de webhook efetivo de refund/chargeback, cancelamento solicitado pelo cliente, automação de renovação no provedor e política de estorno/revogação.
- A fila de eventos negativos não suspende plano automaticamente; tratar `PAYMENT_DELETED` sem confirmação por consulta do provedor como pendência de conciliação manual. Não alterar assinaturas a partir de eventos externos não corroborados.
- Roadmap futuro separado em `docs/PROJETO-EVOLUCAO-POS-HOMOLOGACAO.md`: cruza 18 pedidos do arquivo do usuário, P2 existentes, telas e documentação; **nenhuma das melhorias foi iniciada**. Iniciar apenas após término formal dos gates atuais.

### AUD-01 — revisão do Portal e isolamento multitenant (21/10/2026)

- Inspecionadas rotas atuais `/api/portal/overview`, `/api/portal/bookings` (GET/POST) e `/api/portal/claim`. O histórico filtra o par exato `(tenant_id,client_id)` de cada membership; consultas de slots/novo agendamento conferem vínculo com identidade autenticada e tenant antes de chamar RPC. Em consultas de usuário sem vínculo, endpoint devolve 403; sem sessão autenticada e email confirmado, 401 nos fluxos de consulta/agendamento.
- Supabase, consulta somente leitura: `customer_memberships=0`, `bookings` com cliente de tenant divergente = 0, membership com cliente de tenant divergente = 0.
- `authenticated` e `anon` não possuem `EXECUTE` nas RPCs `claim_customer_invitation`, `create_portal_booking`, `get_available_slots`; acesso público autenticado passa pelo backend protegido.
- **Status:** revisão estrutural e integridade aprovadas no escopo inspecionado. **Ainda pendente**: criar identidades/vínculos de homologação para tenant A e B, testar 401/403/201 via HTTP, OTP real, manipulação de tenant ID, concorrência, rate limiting, isolamento GUI e fluxos de cancelamento/remarcação. Sem memberships existentes, não declarar E2E multitenant aprovado.
- Backlog de melhorias pós-auditoria continua em `docs/PROJETO-EVOLUCAO-POS-HOMOLOGACAO.md`, sem executar itens novos agora.

### AUD-01 — pré-condições e integridade estrutural do Portal (21/10/2026)

- Consulta somente leitura: 5 tenants, 0 `customer_identities` e 0 `customer_memberships`. Sem identidade real de homologação, não há como demonstrar E2E com duas empresas.
- Constraints verificadas remotamente: `customer_identities.id -> auth.users.id` (FK), `customer_memberships(identity_id) -> customer_identities(id)` (FK), `customer_memberships(client_id,tenant_id) -> clients(id,tenant_id)` (FK composta), FK de tenant e chave primária `(identity_id,tenant_id,client_id)`.
- Essas constraints impedem vínculo de cliente com tenant divergente e vínculos duplicados exatos no banco; ainda não comprovam sessões HTTP, OTP, permissões/fluxos GUI nem abuso de rate limits.
- Próximo gate E2E: estabelecer duas identidades de QA por fluxos oficiais do Auth, convites verificados e vínculos legítimos a tenants de teste; demonstrar HTTP `401/403/200/201/409` e acesso cruzado negado sem manipular contas reais. Não inserir memberships manualmente ou assumir identidade por email/telefone.

### AUD-01 — entrada pública do Portal e limite do teste HTTP (21/10/2026)
- A revisão de `middleware.ts` identificou `/portal` ausente de `PUBLIC_PATHS`; visitantes sem sessão eram redirecionados para `/login` antes de acessar o formulário de OTP. Corrigido pelo PR #10, commit `491d80f8`, com os dois checks do GitHub aprovados. APIs `/api/portal/*` continuam exigindo autenticação e vínculos verificados nos handlers.
- Tentativa de GET externo sem sessão no domínio público não retornou resposta utilizável pelo acesso disponível; ferramenta de Vercel retornou `deployment_authentication_required`. **Não declarar teste HTTP de 401/403 aprovado sem resposta real.**
- Código das três rotas do Portal não contém rate limiting explícito; verificar camada global/provedor e manter teste de abuso/limites como pendente.
- Consulta somente leitura de estado: `customer_identities=0`, `customer_memberships=0`, nenhuma reserva com cliente de tenant divergente. Teste com duas sessões OTP reais ainda bloqueado.
- PR #10 foi merged; deploy `491d80f8` deve ser confirmado READY antes de marcar publicação.

### AUD-01 — diagnóstico de abuso nas rotas públicas (21/10/2026)
- Revisão de `app/api/public/bookings/route.ts`, `app/api/portal/claim/route.ts` e `app/api/portal/bookings/route.ts`: há validações de payload, sessão, membership e disponibilidade, mas não foi localizado rate limit explícito nos handlers. `middleware.ts` deixa APIs gerenciarem auth individualmente, sem controle global de frequência.
- **P1 em aberto:** definir limitador central com contador atômico e expiração compartilhado (não memória do processo serverless) para POST público de reservas e tentativa de claim; limitar por contexto composto apropriado, sem confiar em `X-Forwarded-For` arbitrário, evitar vazamento de existência de contas, retornar HTTP 429/Retry-After, métricas sem PII e assegurar que fallbacks não abram caminho ilimitado.
- OTP é controlado também por Supabase Auth e requer checagem da configuração efetiva no painel/fluxo real; não afirmar ausência ou presença de limite no provedor a partir do código cliente.
- Pendente de aceitação: prova HTTP sob rajadas controladas com tenant QA e CI/regressão de agendamentos; não disparar rajadas no domínio de produção sem janela de testes e salvaguardas. Sem alterações de dados efetuadas nesta análise.

### AUD-01 — controle atômico de frequência nas rotas públicas (21/10/2026)

- PR #11 merged, commit `32848b7b`: `POST /api/public/bookings` e `POST /api/portal/claim` agora exigem `enforceApiRateLimit` antes de processar a requisição. Política inicial: 8 reservas em 600s e 12 resgates de convite em 600s por IP de borda verificado pela Vercel; sem IP confiável, bucket compartilhado conservador. Resposta 429 com `Retry-After` e `Cache-Control:no-store`; falha no Supabase retorna 503 (fail-closed).
- RPC `claim_api_rate_limit` utiliza UPSERT atômico em tabela com RLS e privilégios restritos; migrations aplicada na produção QA como `20261021040706_api_rate_limit_windows`, nome de arquivo sincronizado com o remoto. CI Quality Gates e Static Security aprovado no PR.
- Teste SQL transacional com ROLLBACK: limite 3/600s, chamadas 1-3 autorizadas, quarta bloqueada com retry_after positivo; zero buckets persistidos após teste. `anon` e `authenticated` não têm EXECUTE na RPC.
- **Pendente antes de homologação E2E:** HTTP 429 real via rede e sessão de QA, verificação de IP da borda em ambiente publicado e configurações de rate limit do OTP Supabase. Planejar limpeza periódica de janelas expiradas para limitar crescimento da tabela; sem rotinas de remoção ainda.
- Merge não equivale a deploy: confirmar Vercel READY para `32848b7b` antes do aceite de publicação.

### AUD-01 — finalização do rate limiter e retenção (21/10/2026)
- Vercel produção commit `32848b7b` confirmado `READY` (o deploy posterior apenas de documentação foi cancelado, sem impacto no app).
- Tabela `api_rate_limit_windows` consultada: 0 janelas e 0 expiradas no momento da inspeção.
- Não existe extensão `pg_cron` instalada; para evitar dependência invasiva foi implementada limpeza oportunista limitada: índice por `window_start`, remoção de até 250 registros com >48h em aproximadamente 1% das chamadas de `claim_api_rate_limit`. **Não é limpeza em hora fixa nem comprovação de execução real sobre janelas vencidas**.
- PR #12 merged, commit `0bb3e024`; Quality Gates e Static Security Check do commit final aprovados. Migration `20261021131221_api_rate_limit_retention` aplicada ao Supabase e timestamp alinhado ao Git; teste transacional com ROLLBACK confirmou limite 2 com terceira tentativa negada, sem contadores persistidos.
- Deploy produção `0bb3e024` estava `BUILDING` na última consulta; preview do commit anterior apresentou ERROR, e deve ser investigado se afetar o deploy final. Não marcar publicação dessa correção como pronta até READY.
- Acessos HTTP diretos permaneceram bloqueados nos meios de teste disponíveis; teste real HTTP 429/Retry-After, confiança do IP na Vercel e configuração efetiva do OTP Supabase continuam pendentes.

### AUD-01 — confirmação de deploy de retenção e regressão de quota (21/10/2026)
- Vercel confirmou `READY` do commit `0bb3e024`, incluindo retenção oportunista dos contadores; commit subsequente de documentação cancelado não compromete a publicação do aplicativo.
- Supabase: 0 contadores de limite, 0 vencidos; execução de função RPC bloqueada a `anon`/`authenticated` (apenas backend service role).
- Regressão SQL transacional com rollback: numa janela de 60 segundos, 3 pedidos permitidos e o 4º negado, com retry_after > 0. Sem contadores persistidos.
- **Pendente:** teste HTTP 429/Retry-After na borda, prova de confiança dos cabeçalhos de IP encaminhados, verificar limites reais de envio e verificação OTP no Supabase Auth e inspeção da retenção após expiração. A limpeza oportunista não garante execução quando não há tráfego; monitorar aumento e considerar agendamento controlado.
- Não confundir sucesso SQL e `READY` com aceite HTTP E2E.

## Continuidade AUD-01 — aceite de cadastro, Portal e próxima frente de segurança (21/10/2026)

- Cadastro com e-mail duplicado: responsável confirmou mensagem explícita e link para `/login` funcionando em produção. **Aceite funcional limitado a este cenário.** Versão app confirmada anteriormente: commit `3f359504` Vercel READY; migration de verificação de duplicidade aplicada.
- Portal: etapa de investigação técnica encerrada com ressalvas a pedido do responsável. Supabase com 0 identidades de clientes, 0 memberships e 4 convites. RLS e grants verificados para tabelas principais; acesso HTTP por ferramentas disponíveis inconclusivo. **P01–P13 não concluídos integralmente; não marcar E2E homologado.** Retomar após clientes vinculados, conforme roteiro específico.
- Próxima frente priorizada: alertas de segurança Supabase. Advisor remoto retornou (a) leaked-password protection desativada (WARN), (b) extensão `btree_gist` instalada em `public` (WARN) e (c) 26 tabelas com RLS ativo e sem policies (INFO). Para tabelas amostradas (`customer_identities`, `customer_memberships`, `booking_invitations`, `whatsapp_outbox`, `api_rate_limit_windows`) grants `SELECT` para `anon`/`authenticated` e `INSERT` para `authenticated` estão revogados, alinhados ao padrão de acesso exclusivo por backend; não criar policy pública para silenciar INFO.
- Alertas WARN permanecem abertos: verificar disponibilidade comercial/técnica de proteção de senhas vazadas e dependências da extensão antes de alterar a infraestrutura. Referências: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection ; https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public . Nenhuma configuração de Auth ou extensão foi alterada nesta verificação.


## AUD-01 — Triagem concentrada de alertas (21/10/2026)

**Objetivo:** fechar a análise do que é verificável sem alterar controles aceitos, separando riscos conhecidos de homologação HTTP não executada.

1. **Password leak protection:** Advisor Supabase aponta `auth_leaked_password_protection` WARN (desativada). Documentação oficial informa disponibilidade no Pro e acima: https://supabase.com/docs/guides/auth/password-security . Necessária configuração no Auth Dashboard se o plano permitir; não foi habilitada, portanto **risco residual aberto**.
2. **Extensão `btree_gist`:** SQL remoto confirmou instalação em `public` e `extrelocatable=true`. Foi encontrada restrição `bookings_no_professional_overlap` do tipo `EXCLUDE USING gist` (tenant, professional_id, intervalo) na tabela `bookings`. Não mover extensão sem auditar operator classes, índices, dependências e ensaiar rollback, pois o bloqueio de conflitos é requisito aceito. O WARN `extension_in_public` permanece **aceito provisoriamente para esta rodada, sujeito a remediação controlada**; não confundir ausência de dependências diretas de constraint no pg_depend com ausência de dependências via opclasses.
3. **26 tabelas RLS sem policies:** Advisor classifica INFO. As cinco tabelas amostradas anteriormente têm RLS ativo e acesso direto SELECT de anon/authenticated e INSERT authenticated bloqueados. Tabelas internas service_role-only podem intencionalmente não ter policies. **Não conceder permissões/policies só para remover aviso**; inventário completo deve ser verificado separadamente antes de encerrar segurança integral.
4. **Portal:** nenhuma identidade ou membership de clientes; investigação técnica encerrada com ressalvas a pedido do responsável, E2E P01–P13 pendente por falta de vínculo. Não criar relações artificiais.
5. **Deploy:** Vercel READY no último commit de aplicação `3f359504`. Deployments dos commits documentais `8bb722ff` e `9b0bb057` foram CANCELED; não declarar código desses commits publicado, mas documentação existe no GitHub main.
6. **Gates que ainda impedem a classificação de AUD-01 como homologação plena:** HTTP/E2E real com sessões distintas de tenants; WhatsApp/Evolution real de homologação e falhas; testes concorrentes HTTP de agendamento; limites reais OTP e de APIs; fluxos de billing Asaas (renovação, cancelamento, estorno/chargeback); IA e cotas em concorrência. Estes continuam **não comprovados**. A conclusão administrativa da rodada pode ser **AUD-01: avaliação técnica encerrada com riscos e testes pendentes**, sem alegar certificação comercial.


## AUD-01 — Verificação focal Asaas (21/10/2026)

- Revisão estática efetuada sobre `app/api/billing/checkout/route.ts`, `app/api/billing/webhook/route.ts`, `app/api/billing/pending/route.ts`, `app/api/superadmin/asaas-payment-reviews/route.ts` e `api/src/billing/scheduler.service.ts`.
- Checkout usa `claim_asaas_checkout`, grava estado da tentativa e reutiliza link anterior quando seguro; evento de confirmação de pagamento consulta a API autenticada do Asaas, verifica referência e valor e usa RPC `apply_verified_asaas_payment`. Eventos negativos são registrados para revisão; não revogam automaticamente na rota webhook analisada.
- Estado de dados consultado somente em contagens: `asaas_processed_payments=2`, `asaas_checkout_attempts=1`, `asaas_lifecycle_events=0`, `asaas_payment_reviews=0`. Não inferir testes de estorno/chargeback pela existência das tabelas.
- Vercel runtime_errors 24h filtrado pelas rotas checkout/webhook: sem grupos de erros; ausência de erros não demonstra sucesso de integração.
- **Achado para avaliação operacional:** `api/src/billing/scheduler.service.ts` contém cron que chama `billing.suspendTenant` depois de sete dias de `subscriptions.status=overdue`. NÃO está demonstrado que o serviço NestJS esteja implantado/ativo; verificar runtime antes de julgar o efeito. Não acionar nem desativar por suposição.
- **Aceite:** checkout inicial Sandbox continua homologado conforme evidência anterior; renovação automática, cancelamento, estorno e chargeback com evento verdadeiro continuam **pendentes de E2E**. Sem mudanças financeiras ou chamadas ao provedor nesta rodada.


## AUD-01 — Verificações autorizadas em produção Sandbox (21/10/2026)

Autorização expressa do responsável para testes em produção, pois o ambiente e clientes são de sandbox/QA. Rodada executada sem disparos externos nem alterações destrutivas.

- Vercel projeto `kyra-atende` identificado como framework Next.js; **não prova** se a pasta `api/` (NestJS) está implantada em outro serviço. No banco `subscriptions`: 3 `active`, 1 `trial`, 0 `overdue`; consulta a logs de Vercel por `suspendTenant` nos últimos sete dias sem entradas. A rotina NestJS que suspende `overdue` após carência existe no código, mas **status runtime não comprovado**, sem cenário real para exercício no momento.
- Integridade de dados: 0 bookings com `client_id` referindo a cliente de outro tenant; esta consulta não substitui teste HTTP/concorrência.
- WhatsApp outbox: 3 registros totais, **0 nos estados** `unknown`, `reconcile`, `sending` ou `accepted` na inspeção. Não constitui prova de reprocessamento em falhas.
- IA: `ai_chat_quota_claims` com 0 registros. Não demonstra comportamento sob concorrência.
- Tentativa HTTP direta ao Portal via ambiente executor falhou por resolução DNS (`Could not resolve host: www.kyraatende.com.br`); não atribuir resposta 401 nem sucesso E2E.
- Pendências dependentes de integração ativa e testes HTTP permanecem abertas. Sandbox permite exercitá-las, mas a conexão usada nesta rodada não forneceu executor HTTP acessível; não inventar evidências.


## AUD-01 — Inspeção focal WhatsApp/Evolution (21/10/2026)

- Revisão de `app/api/whatsapp/webhook/route.ts`, `lib/whatsapp.ts`, `app/api/superadmin/whatsapp-reconciliation/route.ts`.
- Webhook tem comparação de segredo, tamanho máximo 1 MiB, validações básicas de evento/instância e processamento aguardado. Inbound tem exclusão por `external_id`, claim de processamento, fila de permissão e registro `needs_review` para falhas. Outbound cria intenção `sending` antes de chamar Evolution, com `unknown` em falha de rede e `reconcile` em falha de histórico; nenhum retry automático. Interface Superadmin faz somente consulta.
- Banco remoto (somente leitura): `whatsapp_outbox`: 3 linhas todas `recorded`; `whatsapp_inbound_processing`: 3 linhas todas `done`; `whatsapp_contact_permissions`: 1 `ai`, 1 `ignored`. Zero linhas aguardando conciliação na inspeção; nenhuma prova de injeção de falhas/concorrência.
- Consulta de logs unificados por texto `whatsapp/webhook` não encontrou eventos no período consultado. Não inferir ausência de tráfego a partir dessa busca.
- **Status da frente:** implementação e consistência dos registros inspecionados verificadas. E2E externo com Evolution, cenários de falha pós-aceite, duplicidade em concorrência, controle de número QA e reconciliação seguem pendentes; não reenviar automaticamente mensagens ambíguas.
- **Achado de risco para próxima rodada:** `sendMessage` faz checagem de limite de WhatsApp antes do envio, sem reserva atômica visível no caminho, e `incrementUsage` ocorre após o efeito externo. Chamadas paralelas podem ultrapassar o limite sem prova de quota concorrente; testar sem atingir contatos reais.


## AUD-01 — Deduplicação de evidências de cotas (21/10/2026)

- Revisados histórico, implementação atual e RPCs remotas antes de reexecutar validações, conforme orientação do responsável.
- **Já aprovado anteriormente:** PR #8/commit `5121d510`; teste SQL em rollback de `ai_chat_monthly_limit` com 200 reservas, 201ª negada, finalização duplicada negada e limite incompatível rejeitado. `reserve_ai_chat_quota` e `finish_ai_chat_quota` existem no banco e são chamadas por `app/api/ai/chat/route.ts`.
- **Já aprovado em SQL:** reserva monetária com bloqueio por orçamento, liberação e proteção contra dupla liquidação; funções `reserve_ai_monetary` e `finish_ai_monetary` existem. A rota de chat contém a opção de enforcement monetário, mas o valor atual da variável de produção não foi reconfirmado nesta rodada.
- **Já aprovado:** idempotência de claim inbound e estado terminal WhatsApp em transação revertida; validação funcional da primeira mensagem após autorização pelo usuário. Não repetir estes casos sem regressão.
- **Lacuna residual distinta:** `lib/whatsapp.ts` usa `assertWithinLimit` antes do envio seguido de `incrementUsage` após a chamada externa. Não foi evidenciada reserva atômica da quota mensal outbound em envios concorrentes. Restringir eventual correção a este caminho, após desenho seguro contra entregas ambíguas; não mexer no controle validado da IA.
- **Sem prova E2E:** concorrência HTTP independente do chat, falhas reais Anthropic/Evolution, virada de período e quota financeira da IA processada via WhatsApp. Estes itens não invalidam os testes SQL anteriores. Nenhum teste duplicado nem alteração de aplicação foi realizado na rodada de deduplicação.


## AUD-01 — Quota WhatsApp outbound atômica publicada (21/10/2026)

- Após reconfirmar os aceites anteriores de IA e idempotência WhatsApp, foi isolada somente a lacuna de concorrência de quota outbound. **Não foram refeitos ou modificados controles de IA homologados.**
- PR #17 `fix(aud01): reserva atômica de quota WhatsApp outbound` integrado à `main`, merge commit `dbadebc8007346e45bfedf6a406c6e429aa030b7`.
- Migration aplicada no Supabase como `20261021225119_whatsapp_atomic_outbound_quota` e arquivo local sincronizado com o identificador remoto. RPCs `claim_whatsapp_outbound_quota` e `finalize_whatsapp_outbound_quota` restritas a `service_role`.
- Claim adquire lock transacional por tenant, calcula consumo e tentativas pendentes no mês e cria intenção de envio somente se houver vaga. O estado `recorded` e o incremento do contador são liquidados na mesma transação/lock. Eventos `unknown`, `accepted`, `reconcile` e `sending` retêm a vaga até resolução; rejeições liberam a vaga; nunca fazer retry automático em entrega incerta.
- Teste SQL em transação `BEGIN/ROLLBACK`: duas reservas aceitas no limite configurado, terceira negada, primeira liquidação aprovada, segunda liquidação negada, nova tentativa negada até uma reserva rejeitada liberar espaço; executou sem erro e foi revertido sem deixar registros QA. Não equivale a execução concorrente de duas conexões HTTP distintas.
- GitHub: **AUD-01 Quality Gates e AUD-01 Static Security & Quality Checks aprovados** na revisão final da branch.
- Vercel produção: deployment `dpl_9iGTgL6RVrYhih3hRQCph28kg6PR` do commit `dbadebc8` confirmado `READY`.
- **Status:** correção técnica do controle de quota concorrente implantada e validada transacionalmente. Teste HTTP simultâneo, virada mensal do contador e conciliação de situações ambíguas reais permanecem pendentes de E2E; não reabrir aceites SQL anteriores.

## AUD-01 — Gate de virada mensal da quota WhatsApp (21/10/2026)

- Conferência após merge PR #17: RPC `claim_whatsapp_outbound_quota` usa `usage_counters.value` bruto somado a reservas do mês corrente; não confere `reset_at`.
- Banco remoto: existe contador `whatsapp_messages_sent` com `value=4` e `reset_at IS NULL`. Portanto não existe evidência de reset mensal seguro ou de ancoragem do contador a um ciclo mensal.
- O único cron de reset identificado previamente está em `api/src/billing/scheduler.service.ts` (NestJS); deployment principal Vercel é Next.js e execução do NestJS não foi comprovada.
- **Conclusão:** teste SQL de concorrência da quota está aprovado, mas virada mensal **NÃO homologada**. Possível bloqueio indevido no início do próximo mês caso contador não seja zerado; não induzir reset manual em produção.
- Correção sugerida isolada: definir autoridade única do mês UTC no banco, inicialização/reinício atômico sob o mesmo lock do claim, conciliação de mensagens aceitas no ciclo anterior e teste de transição com ROLLBACK, preservando resultados ambíguos. Evitar executar dois resetters simultâneos sem alinhamento.


## AUD-01 — Virada mensal de quota WhatsApp transacional (21/10/2026)

- PR #18 integrado, merge `0788dea96ce8eb6d583a5e43f91aa4839839277a`. Migração remota aplicada como `20261021225918_whatsapp_monthly_quota_cycle` e arquivo local sincronizado.
- RPCs existentes foram alteradas de forma isolada, mantendo o lock por tenant. `claim_whatsapp_outbound_quota`: cria/ancora `reset_at` ao começo do mês UTC; contador legado com `reset_at IS NULL` preserva consumo atual; quando `reset_at` é anterior ao ciclo, zera valor dentro do lock antes de contar reservas pendentes apenas do ciclo atual.
- `finalize_whatsapp_outbound_quota`: liquida registro `recorded` com idempotência; só soma quota mensal se a tentativa foi iniciada no mês corrente. Mensagem de mês anterior não consome saldo novo. Status ambíguos continuam pendentes de conciliação, sem retry automático.
- Teste SQL `BEGIN/ROLLBACK`: saldo legado preservado e ancorado, excedente negado, ciclo anterior simulado e zerado, nova reserva aceita, liquidação única + contador = 1, duplicidade negada; passou sem erro e deixou base original intacta.
- Dois workflows GitHub `AUD-01 Quality Gates` e `AUD-01 Static Security & Quality Checks` no head PR #18 concluíram `success`.
- Deploy de produção `dpl_3EVpXGQHvHGo2yzFKCZpj2mdP9Yy` foi observado **BUILDING** logo após o merge; confirmar `READY` antes do aceite da aplicação publicada.
- Pendente teste operacional na virada calendário real (1º dia UTC) e HTTP de envios externos/concorrência. A correção remove a dependência do cron NestJS para reset do fluxo atual Next.js; não prova ausência de scheduler NestJS paralelo.


## Encerramento formal da rodada técnica AUD-01 — 21/10/2026

**Decisão:** AUD-01 **ENCERRADA COMO AVALIAÇÃO TÉCNICA COM RESSALVAS**, sem alegar homologação integral ponta a ponta ou liberação irrestrita de integração comercial. Consolidar provas existentes e não repetir testes já aprovados sem evidência de regressão.

### Gates confirmados no fechamento
- **Vercel:** deployment production `dpl_3EVpXGQHvHGo2yzFKCZpj2mdP9Yy` da aplicação, SHA `0788dea96ce8eb6d583a5e43f91aa4839839277a` (PR #18), confirmado **READY**.
- **Supabase:** migrations finais remotas `20261021225119_whatsapp_atomic_outbound_quota` e `20261021225918_whatsapp_monthly_quota_cycle` presentes. Testes SQL transacionais com rollback e CI dos PRs #17/#18 aprovados conforme registros anteriores.
- **Cadastro duplicado:** aceite funcional dado pelo responsável em produção, com mensagem explícita e acesso ao login.
- **WhatsApp:** reserva concorrente de quota e ancoragem do ciclo mensal implementadas; SQL transacional aprovado. Ainda sem teste de virada no calendário real e de falha no provedor por HTTP.
- **Agenda, dashboard, segurança SQL e quotas IA:** aproveitar aceites parciais e evidências anteriores explicitamente documentados; não rotular como homologação geral de todos os módulos.

### Riscos residuais / pendências transferidas para gates específicos
1. **E2E HTTP multitenant e Portal:** nenhum vínculo de cliente disponível; testes P01–P13 e acessos cruzados reais pendentes. Reabrir ao existirem identidades QA verificadas.
2. **Evolution/WhatsApp:** duplicidade real de webhook, resposta em falhas/timeout, entrega ambígua, concorrência de chamadas HTTP e reconciliação; não efetuar retries automáticos de mensagens ambíguas.
3. **Asaas:** eventos reais de renovação, cancelamento, estorno e chargeback e seus reflexos no plano; checkout inicial sandbox já aprovado.
4. **IA:** chamadas autenticadas concorrentes, falha/timeout do provedor e orçamento de IA do agente WhatsApp separados do chat; evidências SQL aprovadas.
5. **Segurança Supabase:** advisor atual apresenta `auth_leaked_password_protection` WARN (desativado), `extension_in_public` WARN para `btree_gist` (restrição GiST crítica de agendamento; não mover sem avaliação de dependências) e 26 INFO `rls_enabled_no_policy` (não abrir políticas por cosmética).
6. **Ambiente/scheduler:** serviço NestJS de suspensão por inadimplência não comprovado em runtime; agendador de reset legado potencialmente paralelo ao novo controle transacional requer verificação operacional.
7. **Governança/integrações:** garantir evidências HTTP e reconciliar matriz funcional com escopo original em ocasião apropriada. Não inferir aceite dos itens não comprovados.

### Próximo programa
- Portão G0 da evolução: **consolidação técnica concluída com ressalvas documentadas**, sem dizer que riscos residuais estão homologados. Riscos que afetam decisões comerciais ou segurança precisam de aceite explícito antes de disponibilizar funções correspondentes irrestritamente.
- **Próxima etapa planejada E1 — Fundações de confiança e Design System**, segundo `docs/PROJETO-EVOLUCAO-POS-HOMOLOGACAO.md`, abrangendo identidade visual, login/OTP, padrões de formulários, PWA, acessibilidade, privacidade e termos. Manter **18 pedidos** rastreados no backlog.
- **Não iniciar implementação E1 ainda:** o roadmap v0.1 explicitamente requer aceite do proprietário; preparar apenas escopo e critérios e submeter à aprovação.


## Atualização de transição — 23/10/2026, PR #102
O handoff vigente está em `docs/HANDOFF-NOVO-CHAT-2026-10-23.md`. A fila de funcionalidades **não** se resume às pendências deste inventário: a prioridade de produto permanece **E3/item 12**, com P12.1 e a fundação de P12.2 presentes no repositório após o merge #102. Prosseguir com integração pós-confirmação, respostas/métricas e testes sem reabrir rodadas genéricas de Portal/WhatsApp. Este documento acompanha homologações externas e riscos; não bloqueia automaticamente desenvolvimento aprovado. CI/deploy/migrations do PR #102 e E2E externos não foram conferidos nesta atualização.


## E3/P12.4 — preparação segura (23/10/2026)
- P12.3 integrado no PR #107, produção READY confirmada para o SHA do merge `13871ec2c371f355dc5534a5c4f3f055d58d4dcb`.
- P12.4 estruturada como configuração inicialmente inativa por tenant e outbox sem despacho. Opt-out modelado mas processamento/consentimento não homologados. Não considerar o Item 12 encerrado. Fonte prioritária: `docs/HANDOFF-NOVO-CHAT-2026-10-23.md`.


## E3/P12.4 — opt-out e fila retida (23/10/2026)
- APIs tenant-scoped administrativas criadas para opt-out e inclusão manual de convites elegíveis na outbox `held`. Ainda não existe processamento/despacho automático, ou ativação de canais; revalidação transacional pré-envio e consentimento permanecem bloqueios.
- Fonte de status atual: handoff oficial e Plano Mestre. E2E dois tenants, checks de concorrência e validação do último deploy devem ser evidenciados separadamente.
