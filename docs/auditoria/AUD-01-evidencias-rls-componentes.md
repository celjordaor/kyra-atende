# AUD-01 — Evidências de escrita e componentes (19/10/2026)

## Ambientes confirmados
- Supabase Kyra Atende: `zrszytzlovthyezozqhj`, `ACTIVE_HEALTHY`
- GitHub: `celjordaor/kyra-atende`, branch `main`
- Vercel: `prj_JIxzGtz8u4yvbvSc3GJJLEhbrf4c`

## Correção aplicada ao Supabase
Migration remota: `aud01_restrict_financial_usage_whatsapp_direct_mutations`.
- `subscriptions`, `usage_counters`, `whatsapp_messages`: authenticated com SELECT=true, INSERT/UPDATE/DELETE=false.
- `whatsapp_messages` agora usa política exclusiva de SELECT `tenant_id = current_tenant_id()`.
- Espelho versionado: `supabase/migrations/20261019000800_aud01_lock_billing_usage_whatsapp_writes.sql`.
- Atenção: confirmar se alguma tela cria mensagens pelo client Supabase diretamente. O serviço em `lib/whatsapp.ts` usa admin client (service_role) para gravar mensagens.

## Testes SQL transacionais de autorização
Todos feitos com `SET LOCAL ROLE authenticated`, claim tenant simulada em `request.jwt.claims` e `ROLLBACK`.
- Tenant B tentando UPDATE em `clients` do tenant A: **0 linhas**.
- Tenant B tentando UPDATE em `bookings` do tenant A: **0 linhas**.
- Tenant A fazendo UPDATE sem alteração de valor em 1 cliente seu: **1 linha**, transação revertida.
- Não há efeito permanente das operações de teste.
- Os testes demonstram enforcement RLS no banco sob claims simuladas, não autenticam pessoas reais nem verificam cookies/rotas HTTP.

## Revisão inicial de design system
- Barris `components/atoms/index.ts`, `molecules/index.ts`, `organisms/index.ts`, `templates/index.ts` existem e exportam componentes compartilhados.
- Páginas `app/(dashboard)/clientes/page.tsx` e `app/(dashboard)/servicos/page.tsx` delegam para respectivos componentes Client e exibem conteúdo obtido por `apiGet`.
- Isto comprova existência e uso de alguns componentes por estrutura, **não** comprova reutilização consistente em todas as telas.
- Próxima amostragem: `ClientesClient`, `ServicosClient`, formulários e modais por módulo.

## Itens abertos
1. Revisar todas as rotas server-side que usam `service_role` e verificar autenticação/autorização antes de qualquer alteração.
2. Teste HTTP com credenciais reais de tenants A/B e provas negativas de leitura/escrita.
3. Revisão visual e estática da reutilização de componentes em cada módulo.
4. Integração Evolution/Asaas: secrets ausentes em Vercel, sincronização dos provedores e testes funcionais ainda pendentes.
5. Eliminar a dispensa de validação TypeScript/ESLint no build e confirmar pipelines.

## Revisão adicional de UI/UX — amostragem de código

Verificados diretamente os imports de:
- `app/(dashboard)/clientes/ClientesClient.tsx`: DataTable, Modal, Button, Avatar, FormField e SearchBar compartilhados.
- `app/(dashboard)/servicos/ServicosClient.tsx`: DataTable, Modal, Button, FormField e StatusBadge compartilhados.
- `app/(dashboard)/agendamentos/AgendamentosClient.tsx`: DataTable, Modal, SearchBar, Button, StatusBadge, FormField e Avatar compartilhados.
- `app/(dashboard)/agenda/AgendaClient.tsx`: Button, StatusBadge, Modal, BookingFormModal e CompleteModal compartilhados.
- `components/organisms/BookingFormModal.tsx`: organismo reutilizável, usa Modal, Button, FormField e Avatar.

**Achado:** a lista de estados brasileiros `ESTADOS` está duplicada pelo menos em `ClientesClient` e `AgendamentosClient`; não é uma vulnerabilidade, mas cria risco de divergência de UX e manutenção. Refatoração a acompanhar, sem alterar formulários de produção nesta rodada.

## Evolution — correção do fluxo de webhook e envio

Em `lib/whatsapp.ts` a configuração de novas instâncias passou a usar `webhookByEvents: false` e um objeto `webhook.headers['x-kyra-webhook-secret']`, derivado de `EVOLUTION_WEBHOOK_SECRET` no servidor. Falta validar o schema da versão Evolution instalada e reconfigurar as instâncias já criadas. Sem segredo de webhook (mínimo 32 caracteres), `connectInstance()` retorna `webhook_not_configured` em vez de gerar conexão que não receberá eventos.

`sendViaEvolution` agora lança exceção se `EVOLUTION_API_URL` ou `EVOLUTION_API_KEY` estiverem ausentes, em vez de descartar silenciosamente uma mensagem e aparentar sucesso.

**Risco ainda aberto:** a deduplicação grava a mensagem antes da resposta da IA; se o processamento falhar após a inserção, um reenvio pode ser tratado como duplicado. Uma fila com estados `pending/processing/done/failed` e reprocessamento controlado é necessária para entrega resiliente.

## Deploy
Commits recentes no `main` exigem verificação READY antes de considerá-los ativos. Não há homologação de webhook ponta-a-ponta, nem validação de build com TypeScript e ESLint sem dispensas.

## Autorização de sessão por perfil — 19/10/2026
- `lib/route-helpers.ts` agora verifica `profiles.tenant_id = user.app_metadata.tenant_id` para requisições normais autenticadas, usando a RLS do próprio perfil, além da validação do JWT por `auth.getUser()`.
- Auditoria dos perfis: 3 administradores com claims coerentes; superadmin da plataforma sem claim de tenant; uma conta Auth ainda não provisionada. O superadmin usa autorização própria nas rotas administrativas.
- Teste SQL transacional com JWT simulado para o próprio administrador: leitura do perfil retornou **1 linha**, sem alteração de dados.
- A validação da nova API em sessão real e o comportamento de usuários com claim antiga ainda exigem teste E2E.

## Auditoria de autenticação — ajustes posteriores

- Rota `/auth/callback` liberada no middleware para fluxo de confirmação por e-mail sem cookie.
- Dashboard consulta `tenants.id = user.app_metadata.tenant_id`, permitindo que membros não proprietários visualizem a empresa.
- Recuperação de senha: `resetPasswordForEmail` redireciona por `/auth/callback?next=/nova-senha`; middleware permite `/nova-senha`, cuja tela consulta `auth.getUser()` depois do callback PKCE. Elimina dependência exclusiva de `PASSWORD_RECOVERY` que pode não chegar à página já montada.
- Login e callback rejeitam parâmetro `next` externo, com barras duplas, contrabarras ou caracteres de controle.
- **Evidência**: arquivos inspecionados e mudanças versionadas no `main`; testes de navegação reais com links Supabase ainda pendentes.
- **Atenção**: não utilizar teste de recuperação com senha real sem uma conta dedicada de testes.

## Diagnóstico oficial Supabase e divergência do histórico — 19/10/2026

Projeto confirmado: `zrszytzlovthyezozqhj`. `get_advisors(type=security)` antes da correção revelou dois alertas `function_search_path_mutable` em `current_tenant_id()` e `set_updated_at()`. Ambas foram corrigidas por `ALTER FUNCTION ... SET search_path = ''` (migration remota `20261019040630`, `aud01_pin_function_search_paths`); a segunda execução do diagnóstico **não retornou** esse alerta. A definição das funções foi inspecionada antes, e `pg_proc.proconfig` confirmou a configuração depois.

Outros avisos de segurança oficiais **ainda abertos**:
- `extension_in_public`: `btree_gist` no schema `public`. A consulta ao catálogo encontrou 264 entradas de dependência para a extensão; não mover sem plano de impacto, porque há restrições GiST de agendamento.
- `auth_leaked_password_protection`: proteção contra senhas comprometidas desabilitada no Supabase Auth; demanda configuração e validação específicas no painel.
- `rls_enabled_no_policy`: `asaas_processed_payments` possui RLS ativo e nenhuma política, comportamento **intencional** para tabela restrita ao backend. Não abrir política para retirar o aviso.

Avisos de desempenho oficiais: 14 chaves estrangeiras sem índices auxiliares e 12 políticas RLS com sugestões de `(select auth.func())`. São recomendações de tuning, não evidência de vazamento. Priorizar conforme carga e planos de execução.

**Bloqueio de governança identificado:** todas as migrations AUD-01 foram aplicadas com timestamps gerados remotamente, distintos dos prefixos dos arquivos SQL versionados em `supabase/migrations`. Por exemplo, o arquivo `20261019001000_aud01_pin_function_search_paths.sql` corresponde à execução remota `20261019040630`. O mesmo desalinhamento já existia nas nove migrations anteriores. **Não executar `supabase db push` cegamente:** conciliar a tabela de histórico de migrations e os nomes dos arquivos, por procedimento controlado, antes da próxima entrega via CLI. Não foi feita alteração manual em `supabase_migrations.schema_migrations` nesta etapa.

**CI:** o workflow GitHub Actions está commitado, mas o conector utilizado não retornou execuções associadas ao commit consultado; status combinado lista somente Vercel. `READY` de Vercel ainda não comprova `tsc --noEmit` nem `next lint`, porque `next.config.mjs` ignora as verificações.

## Asaas Sandbox — integração 19/10/2026

- Domínio oficial configurado na Vercel: `www.kyraatende.com.br`. Endpoint do webhook: `https://www.kyraatende.com.br/api/billing/webhook`.
- Variáveis em Production confirmadas por presença: `APP_URL`, `ASAAS_API_KEY`, `ASAAS_WEBHOOK_AUTH_TOKEN`, `ASAAS_SANDBOX` (= `true` quando configurado). O valor dos segredos é protegido e **não** foi lido ou divulgado.
- Nova implantação com variáveis iniciada; versões novas requerem status READY antes de considerá-las operacionais.
- Checkout `app/api/billing/checkout/route.ts`: endpoint oficial `https://api-sandbox.asaas.com/v3`, campos obrigatórios `name` e `chargeType: DETACHED`, validação de payload e resultado, remoção da pré-criação desnecessária de customer.
- Webhook `app/api/billing/webhook/route.ts`: mesmo host oficial. Para cobrança com `paymentLink`, consultar o link por ID e obter `externalReference` autoritativa do Asaas; validar referência, tenant/plano/período e valores, mantendo `apply_verified_asaas_payment` idempotente.
- Evidência de consulta SQL no banco: `asaas_processed_payments=0`, `billing_events=6`, `subscriptions=3`. A contagem é fotografia no momento da auditoria, não significa que houve cobrança real processada.
- Teste HTTP pela origem pública não pôde ser executado porque o ambiente de execução não resolveu DNS externo; consulta de logs de runtime filtrada por billing não retornou eventos recentes.
- **NÃO HOMOLOGADO:** falta testar uma transação integral no Sandbox (geração de link → pagamento simulado → evento recebido → conciliação RPC → mudança da assinatura), conferir token configurado no Asaas, logs de entrega e ausência de duplicidade em reenvio do mesmo evento.


## Continuidade AUD-01 — evidências após pagamento PIX Sandbox (19/10/2026)

- Pagamento Sandbox confirmado por inspeção direta de `public.asaas_processed_payments`: 1 pagamento, plano `expande`, período `monthly`, valor R$ 149,00. Não registrar identificadores de pagamento ou usuário nesta documentação pública.
- `tenants.plan='expande'` / `plan_status='active'`; `subscriptions.plan='expande'`, `status='active'`, `billing_cycle='monthly'`, `amount=149.00`.
- Uma linha em `asaas_processed_payments` e um evento `asaas.payment.confirmed`. Intervalo de assinatura `2026-11-02T14:22:27Z` a `2026-12-02T14:22:27Z`, alinhado ao fim do trial de 14 dias, mas **política comercial de crédito do trial após pagamento antecipado exige aceite**.
- Teste real de idempotência da RPC: chamada de `public.apply_verified_asaas_payment` com os argumentos exatos do pagamento já processado, dentro de transação com `ROLLBACK`, retornou `false` (`duplicate_applied=false`). Consulta posterior confirmou ainda 1 pagamento, 1 evento e vigência inalterada. Esse teste prova o caminho de duplicidade de pagamento na RPC, **não** uma nova entrega HTTP autenticada do webhook.
- Auditoria de privilégios: `has_function_privilege('anon', ...,'EXECUTE')=false`; `authenticated=false`; `service_role=true`, restringindo conciliação à identidade de serviço.
- Webhook Asaas: logs Vercel mostram rejeição antiga `422 missing_or_malformed_reference` para evento externo; após commit `8a4f07e5`, novas entregas produziram `evento externo ignorado / unassociated_reference`. Confirmar sucesso HTTP no painel do Asaas para encerrar alerta operacional.
- Security advisor atual: `auth_leaked_password_protection` WARN (habilitar e verificar via configuração Auth); `extension_in_public` WARN para `btree_gist` (não mover sem plano de dependências); `rls_enabled_no_policy` INFO em `asaas_processed_payments` é intencional.
- Performance advisor: 14 avisos de FKs não indexadas e 12 de otimização de políticas RLS. Requer plano de índices sem travar tabelas ativas e benchmark antes/depois.
- Ainda não validados: cancelamento, estorno, pagamento não confirmado, renovação, concorrência de eventos, testes reais de HTTP cross-tenant, build rigoroso TS/ESLint, Evolution WhatsApp, configuração Auth de senhas vazadas, convergência do histórico de migrations.
- Governança: histórico remoto e nomes dos arquivos de migrations seguem divergentes. Não usar `supabase db push` sem reconciliação controlada.


## AUD-01 — Revisão Evolution e Auth, continuação de 19/10/2026

- Conferência em Vercel Production: `EVOLUTION_API_URL` e `EVOLUTION_API_KEY` presentes; `EVOLUTION_WEBHOOK_SECRET` **ausente**. `connectInstance()` exige segredo com >=32 caracteres e URL HTTPS, retornando `webhook_not_configured` na ausência. A rota `POST /api/whatsapp/webhook` também responde 401 sem segredo; não implantar segredo unilateralmente sem configurá-lo nas instâncias da Evolution.
- Correção GitHub `591ab20c`: processador `handleWebhook` normaliza `messages.upsert` e `MESSAGES_UPSERT`; controle `fromMe` e deduplicação por identificador permanecem. Exige confirmação READY e teste real antes de considerar WhatsApp homologado.
- Risco de entrega: `handleWebhook` persiste mensagem de entrada antes de processar IA; no catch da IA dispara alerta, mas não cria estado reprocessável, então deduplicação pode impedir novo processamento. Requer desenho de fila/estados confiáveis, não alterar apressadamente em produção.
- Avisos Supabase security advisor continuam `auth_leaked_password_protection`, `extension_in_public`, e `rls_enabled_no_policy` intencional. A proteção contra senhas vazadas não foi habilitada nesta etapa porque não há ação Auth configurável nos conectores disponíveis.


## AUD-01 — Continuidade: auditoria de performance, push e releases (19/10/2026)

- Deploy do último ajuste de identidade visual `79e4dff3` confirmado `READY` na Vercel; a correção libera `/kyra-icon.png` e `/kyra-ai.png` no middleware e restaura a logo original. Falta reteste visual após limpar o cache.
- Supabase Security Advisor: 1 INFO (`rls_enabled_no_policy`, tabela de conciliação restrita), 2 WARN (`extension_in_public` para `btree_gist` e `auth_leaked_password_protection`). Não mover extensão sem avaliação das constraints de agendamento nem habilitar Auth sem acesso à configuração.
- Supabase Performance Advisor: `unindexed_foreign_keys` 14, `auth_rls_initplan` 12, `unused_index` 10, `multiple_permissive_policies` 48, `duplicate_index` 2. O número 48 conta avisos por combinação de role/operação, **não 48 políticas distintas**.
- Índices duplicados confirmados via `pg_indexes`: `public.bookings`: `bookings_status` e `bookings_tenant_status`, ambos btree `(tenant_id,status)`. `public.subscriptions`: `idx_subscriptions_asaas_link` e `subscriptions_asaas_link`, ambos btree parcial `(asaas_payment_link_id)` onde valor não nulo. A remoção de índice redundante exige migração coordenada, revisão de dependências e sincronização do histórico divergente.
- `push_subscriptions`: 1 registro, zero divergências entre proprietário do tenant e `user_id`. Políticas RLS verificam `user_id=auth.uid()`, porém existe FK composta `push_subscription_user_same_tenant` entre `(user_id,tenant_id)` e `profiles(id,tenant_id)`. Essa constraint também impede associação cruzada. Não há evidência de acesso cross-tenant no achado; não aplicar migração RLS baseada só na leitura isolada da policy.
- Logs recentes incluem erros anteriores de carregamento de agendamentos em deployments antigos; correções das relações ambíguas já foram publicadas. Validar funcionalmente após cada release e rastrear erros novos isoladamente.
- Nenhuma alteração de dados, tabelas, políticas ou índices executada nesta etapa.


## AUD-01 — Revisão de fluxos públicos e conclusão de serviços (19/10/2026)

- A rota `POST /api/public/bookings` enviava notificações por uma implementação local e antiga de `web-push`, com URL relativa `/agendamentos`, ignorando a correção de domínio aplicada a `lib/push.ts`. Commit `b9c2d5b2`: substituída pela função central `dispatchPush`, que gera URL do domínio canônico `https://www.kyraatende.com.br`. Nenhuma mudança na criação do agendamento, idempotência ou validações do banco.
- A rota `POST /api/bookings/[id]/complete` exigia somente `payment_method`, permitindo enviar `price_charged` inválido, desconto superior ao preço ou método arbitrário diretamente à API. Commit `3b8dde10`: valida valores numéricos finitos, não negativos, duas casas decimais no preço, desconto até o valor cobrado e enum de métodos compatível com o componente `CompleteModal`. Dados financeiros e agendamentos existentes não foram modificados.
- O handler WhatsApp armazena evento inbound antes do processamento de IA e captura falhas sem registrar estado reprocessável. Não implementar retentativa ingênua, pois a deduplicação por `external_id` bloqueia nova execução e retentativas após envio de resposta podem duplicar respostas. Projetar estado transacional/fila/outbox e teste end-to-end antes de alterar.
- Os commits foram enviados à main e acionaram deployments Vercel; confirmação de READY e testes E2E específicos permanecem necessários.


## AUD-01 — WhatsApp e estabilidade de eventos (19/10/2026, etapa adicional)

- Último release anterior `f9c5b305` verificado `READY` em Production na Vercel; o commit da validação financeira `3b8dde10` foi cancelado como deployment individual, mas seu conteúdo permanece no histórico da `main` e está incluído em deployments posteriores. Não inferir homologação de API sem teste funcional.
- Revisão do fluxo Evolution -> webhook -> `whatsapp_messages` -> IA: há índice único `whatsapp_inbound_external_event_unique` em `(tenant_id, external_id)` para mensagens `inbound`, protegendo contra repetição concorrente do mesmo evento.
- Erro de contexto identificado: `handleWebhook` insere a mensagem inbound antes de `processWhatsappMessage`; a busca de últimas mensagens incluía essa mesma entrada e a função ainda a acrescentava como último turno, duplicando a mensagem para o Claude.
- Commits `f12f03df` e `4a39ae1c`: o processamento passa o `messageId`; `getRecentMessages` remove do histórico o registro de `external_id` igual ao evento atual e o acrescenta uma única vez como último turno. Nenhuma alteração no histórico persistido ou nos índices.
- Falha da IA / Evolution após persistência: ainda não há fila ou estado de processamento que permita reexecução segura; a camada `lib/ai.ts` também captura erros da Anthropic e retorna `null`. Exige desenho de outbox, estado por mensagem, lock e idempotência de envio antes de habilitar retentativas.
- Deploy dos commits de WhatsApp foi solicitado automaticamente pelo push à `main`; validar `READY` e tráfego real antes de homologar esta mudança.


## AUD-01 — WhatsApp: falha de IA e recuperação manual (19/10/2026)

- Em produção, release `bccd379c` verificado `READY` antes das alterações desta etapa.
- Inspeção direta `public.whatsapp_messages`: 1 registro outbound e **0 inbound** na ocasião. A conexão WhatsApp ter sido realizada **não comprova** recebimento por webhook autenticado. Teste real inbound e confirmação de payload/headers permanece bloqueador de homologação.
- A camada `lib/ai.ts` capturava falhas da Anthropic e retornava `null`, indistinguível da ausência legítima de resposta; não gerava alerta ao operador. Commit `fb49bc4d`: erro registrado em log estruturado sem corpo da mensagem ou credencial e propagado ao chamador.
- `lib/whatsapp.ts` passa a enviar push de atendimento manual quando a IA falha ou não retorna resposta, sem disparar outra resposta WhatsApp automaticamente. Commits `2cee511c` e `bbab3ebf`. Falhas de push são registradas sem invalidar o webhook que já persistiu o inbound.
- **Limite declarado:** ainda não existe fila/outbox nem estado `pending/processing/sent/failed` por mensagem; também não há retentativas seguras de envio. Se Evolution receber pedido e a conexão cair antes da confirmação, não é seguro repetir sem idempotência comprovada. Esta fase só melhora a observabilidade e o fallback humano.
- Após deploy, validar recebimento, histórico, resposta IA, alerta de falha e não duplicidade por reenvio do mesmo evento. Não modificar instâncias Evolution/Prontim/n8n compartilhadas.


## AUD-01 — WhatsApp misto: fila de solicitações com privacidade por padrão

**Decisão de produto aprovada:** números WhatsApp podem ser pessoais e profissionais; contatos ainda não autorizados entram na fila **somente com telefone e metadados**. Texto de mensagens desconhecidas não deve aparecer nem ser salvo no histórico. IA é opt-in por contato.

**Implementação em etapas (19/10/2026):**
- Migration `whatsapp_contact_privacy_queue` aplicada no projeto Supabase Kyra Atende e versionada como `supabase/migrations/20261019181500_whatsapp_contact_privacy_queue.sql`. Tabela `whatsapp_contact_permissions`: chave única `(tenant_id,phone)`, status `pending/ignored/manual/ai`, RLS ativada, privilégios removidos de anon/authenticated, service_role apenas. Histórico remoto das migrations anteriores já possui divergência de nomes: não executar `supabase db push` cegamente.
- `lib/whatsapp.ts`: antes de persistir inbound ou chamar IA, verifica autorização; sem cadastro insere apenas telefone/status pending com `ignoreDuplicates`, sem conteúdo; `ignored` ou `pending` retorna sem armazenar, `manual` armazena e alerta o responsável, `ai` armazena e só executa IA se entitlement permitir. Falha na verificação de permissões não libera processamento.
- API `/api/whatsapp/requests`: GET e PATCH exigem sessão com tenant verificado e correspondência com `tenants.owner_id`; consulta/alteração por service-role e filtro obrigatório de tenant. PATCH aceita somente `ignored`, `manual`, `ai`; não recebe textos de conversas.
- Interface `WhatsappRequests` integrada à tela `/whatsapp`: fila pendente, ações Ignorar/Atendimento manual/Autorizar IA e contatos com decisão.
- A autorização não recupera conteúdo de mensagens anteriores: novas mensagens autorizadas serão processadas a partir da próxima entrada. Mensagens de grupos seguem ignoradas.
- **Testes de aceite pendentes:** 1) número não cadastrado envia texto, fila mostra número mas nenhuma mensagem no histórico; 2) repetir mensagem pendente não cria item duplicado; 3) ignorar impede captura; 4) liberar manual registra somente mensagens futuras sem IA; 5) autorizar IA responde somente se habilitada no plano; 6) usuário de outra empresa não vê nem decide contatos; 7) validar fluxo de `@lid` no Evolution v2 e matching de telefone, antes de comercializar.
- **Pendência de privacidade:** mensagens antigas já armazenadas antes da mudança não são apagadas retroativamente. Necessária política de retenção, exclusão e consentimento para conversas profissionais.
- **Limite de segurança operacional:** a conexão Evolution webhook real ainda não está homologada; não afirmar funcionamento E2E antes de teste com celular externo. Nenhuma instância da VPS, Prontim ou n8n foi alterada.


## AUD-01 — Reconciliação de migrations e qualidade de CI (19/10/2026)

**Snapshot remoto:** `Supabase zrszytzlovthyezozqhj` contém 12 registros de migration:
- `20261019025856` aud01_restrict_privileged_rpc_profile_updates_public_policies
- `20261019030717` aud01_restrict_tenant_billing_and_owner_updates
- `20261019031431` aud01_billing_events_append_only_backend
- `20261019032003` aud01_booking_overlap_and_whatsapp_message_dedup
- `20261019032033` aud01_atomic_idempotent_signup
- `20261019032120` aud01_asaas_verified_payment_reconciliation
- `20261019033514` aud01_revoke_truncate_profile_tenant_mutation_public_catalog
- `20261019033935` aud01_enforce_same_tenant_relational_integrity
- `20261019034252` aud01_restrict_financial_usage_whatsapp_direct_mutations
- `20261019040412` aud01_revoke_client_schema_modification_privileges
- `20261019040630` aud01_pin_function_search_paths
- `20261019181854` whatsapp_contact_privacy_queue

**Snapshot local:** `supabase/migrations` na branch main contém seis arquivos:
`20261019000600_aud01_restrict_table_destruction_and_public_catalog.sql`,
`20261019000700_aud01_same_tenant_relational_integrity.sql`,
`20261019000800_aud01_lock_billing_usage_whatsapp_writes.sql`,
`20261019000900_aud01_revoke_client_schema_privileges.sql`,
`20261019001000_aud01_pin_function_search_paths.sql`,
`20261019181500_whatsapp_contact_privacy_queue.sql`.

**Interpretação:** versões/nomenclaturas não correspondem 1:1; os 11 passos históricos de hardening e o passo novo precisam ser reconciliados por conteúdo e ordem, não apenas por nome. Não fazer `supabase db push`, `migration repair`, reaplicação nem exclusão sem preservar o DDL exato e confirmar equivalência. Os arquivos SQL fora de `supabase/migrations` também não constituem histórico de migrations aplicado.

**Qualidade de CI:** `.github/workflows/aud-01-static-checks.yml` define `pnpm install --frozen-lockfile`, `pnpm exec tsc --noEmit` e `pnpm exec next lint`. Entretanto `next.config.mjs` tem `typescript.ignoreBuildErrors=true` e `eslint.ignoreDuringBuilds=true`: Vercel READY não comprova qualidade estática. Consulta de status do commit `0188e66f` retornou apenas `Vercel: success`; consulta de workflow runs associados não encontrou execuções PR; **isso não prova ausência de todos os runs push**. Verificar execução do job AUD-01 e publicar comprovação antes de liberar gate de build. Não endurecer `next.config.mjs` antes de um baseline de falhas e correções.

**Segurança atual:** Security Advisor 2 INFO (`rls_enabled_no_policy`, incluindo tabela de fila intencionalmente inacessível a papéis públicos), 2 WARN (`btree_gist` no schema public; leaked-password protection desativado). Tabela da fila tem 0 solicitações pendentes; não houve teste de inbound.

**Próximas ações:** (1) obter SQL exato/assinaturas das 12 migrations aplicadas e conciliar inventário local; (2) executar CI estático com logs e corrigir erros de maneira incremental; (3) só então tornar checks bloqueantes; (4) observar produção após retestes E2E. Nenhum DDL, alteração de Auth, índice ou configuração de Vercel executado nesta revisão.


## AUD-01 — Preservação do SQL histórico remoto e baseline de CI (19/10/2026)

- Consulta somente leitura de `supabase_migrations.schema_migrations` recuperou os `statements` completos das **12 migrations** aplicadas em produção no projeto `zrszytzlovthyezozqhj`.
- Os 12 scripts foram arquivados integralmente em `docs/auditoria/sql-remoto-aplicado/`, com cabeçalhos de procedência e manifesto `README.md` (commit `17cc12a1`). O histórico local executável continua com seis arquivos sob `supabase/migrations`; **não foi reconciliado ou reparado automaticamente**.
- O diretório de arquivo é apenas evidência, deliberadamente fora do pipeline de migrations; nenhuma alteração de banco foi executada na exportação. Próxima etapa: comparação por efeitos e ordenação, escolha de baseline sem reaplicação.
- Workflow `.github/workflows/aud-01-static-checks.yml` existe e declara TypeScript/ESLint, mas o status combinado GitHub do release `0188e66f` mostrou somente `Vercel: success`. Não foi obtida prova de resultado dos checks estáticos; não inferir que passaram. Não remover os bypasses de `next.config.mjs` até baseline de erros e checagem de branch protection.
