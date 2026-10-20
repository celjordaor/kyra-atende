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
