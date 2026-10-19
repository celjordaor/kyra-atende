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


## AUD-01 — Comparação semântica e proteção de migrations (19/10/2026)

- Comparação dos seis arquivos em `supabase/migrations` com as cópias do SQL executado arquivadas em `docs/auditoria/sql-remoto-aplicado`: identificadas correspondências de propósito e conteúdo para os cinco mirrors históricos (`000600→20261019033514`, `000700→20261019033935`, `000800→20261019034252`, `000900→20261019040412`, `001000→20261019040630`), e para o mirror da fila (`181500→20261019181854`). Os prefixos locais abreviados são horários diferentes dos registros remotos, não versões efetivamente aplicadas.
- Inspeção somente leitura em `pg_constraint` confirmou as 8 restrições de integridade tenant dos relacionamentos (4 UNIQUE e 4 FKs) e a exclusão `bookings_no_professional_overlap` ativa. Esse inventário confirma **presença** dos objetos, não equivalência de todo o estado do schema.
- Criado `scripts/check-migration-lineage.mjs` (commit `973c9107`), com hashes Git blob dos 6 arquivos-base e limite de versão `20261019181854`. O script falha se um mirror conhecido for alterado/removido ou novo arquivo reutilizar versão do histórico remoto. Ele é um **guard de baseline**, não uma reconciliação do histórico e não substitui revisão SQL.
- Workflow `.github/workflows/aud-01-static-checks.yml` atualizado para executar o guard junto a TypeScript/ESLint (commit `2433f924`). Execução e exigência como check obrigatório ainda precisam de comprovação. Enquanto isso, `next.config.mjs` ainda não bloqueia erros estáticos no deploy.
- **Nenhum DDL ou reparo do histórico do Supabase** nesta etapa; para reconciliar definitivamente, avaliar scripts remotos sem mirror, regras de bootstrapping, schema esperado e estratégia de baseline em ambiente seguro antes de mudar a tabela `supabase_migrations.schema_migrations`.


## AUD-01 — Controle de transição na conclusão de agendamentos (19/10/2026)

- Último baseline documental `894717e2` verificado `READY` antes da alteração.
- Consulta somente leitura confirmou estados em uso: `pending`, `confirmed`, `completed`, `cancelled`.
- Falha funcional encontrada em `POST /api/bookings/[id]/complete`: o `UPDATE` filtrava por ID e tenant, **não por estado**; reenvios poderiam alterar dados financeiros de agendamentos `completed` ou reabrir agendamentos `cancelled` como `completed`, gerando push novamente.
- Commit `5d899396`: acrescentado filtro atômico `status IN ('pending','confirmed')` na atualização. Se nenhuma linha for atualizada, a API distingue ID inexistente (404) de estado já concluído/cancelado (409), sem retornar erro bruto de SQL. Validação financeira anterior permanece.
- Sem DDL e sem alteração retroativa em agendamentos. Homologação E2E do novo comportamento e verificação de deployment ainda pendentes.
- A implementação evita reaplicação concorrente da conclusão via API; não equivale a um controle transacional de todos os efeitos externos do fluxo.


## AUD-01 — Transições de estado de agendamentos (19/10/2026)

- **Confirmação:** `POST /api/bookings/[id]/confirm` não filtrava por estado anterior e podia reabrir agendamentos cancelados/concluídos como confirmados. Commit `a2c81480` limita o UPDATE atômico a `status='pending'` e distingue 404 (ausente) de 409 (transição proibida).
- **Cancelamento:** `POST /api/bookings/[id]/cancel` também não filtrava estado e utilizava joins relacionais ambíguos `clients(name)`/`professionals(name)`. Commit `6d3f6bac` limita o UPDATE a `pending/confirmed`, usa chaves estrangeiras explícitas nos joins e distingue 404 de 409. Evita push repetido por duplo cancelamento.
- **Edição geral:** `PUT /api/bookings/[id]` aceitava `status` arbitrário e permitia alterar dados de agendamentos encerrados. Commit `fdb0aac1` proíbe mudar status pelo PUT e limita alterações comuns a `pending/confirmed`. Estados passam exclusivamente pelos endpoints específicos confirm/cancel/complete.
- **Exclusão:** `DELETE /api/bookings/[id]` ainda permite exclusão física de registros por ID + tenant; revisar política funcional de retenção, rastreabilidade financeira e eventual arquivamento/cancelamento lógico antes de modificar. Não realizar exclusões retroativas.
- **Evidências:** consultas estáticas ao GitHub confirmaram filtros condicionais nos três endpoints; última publicação anterior `8006e095` estava READY. Os deployments das novas alterações ainda não tiveram READY confirmado. Regressões funcionais e consumo pelo frontend precisam de E2E.
- **Banco:** nenhuma migration, DDL ou alteração de dados aplicada nesta rodada. Fluxo WhatsApp continua com teste E2E adiado conforme decisão.


## AUD-01 — Reagendamento, exclusão e integridade de intervalos (19/10/2026)

- O PostgreSQL possui a constraint `bookings_no_professional_overlap` que proíbe intervalos sobrepostos de um profissional, inclusive entre inserções concorrentes, para agendamentos não cancelados. Check constraints de `status` e de `payment_method` também estão presentes.
- Em `PUT /api/bookings/[id]`, datas podiam ser alteradas sem verificação de intervalo. Commit `4906af74`: a API exige início/fim em conjunto, datas válidas e futuras, fim posterior ao início e duração até 8 horas. Restrição de status `pending/confirmed` segue vigente.
- **Exclusão física permanece pendente:** `DELETE /api/bookings/[id]` continua removendo dados por ID + tenant, inclusive potencialmente registros concluídos. A proteção de retenção foi analisada, mas **não foi implantada nesta etapa**; decidir regra de retenção, exclusão lógica ou arquivamento e verificar dependências antes de modificar.
- Sem DDL nem alterações em dados existentes. Testes E2E ainda pendentes para reagendamento e para o webhook WhatsApp; deployment da validação precisa ser confirmado.


## AUD-01 — Exclusão física substituída por cancelamento lógico (19/10/2026)

- `DELETE /api/bookings/[id]` eliminava fisicamente qualquer registro do tenant, inclusive agendamentos `completed` com preço, desconto e forma de pagamento. Inspeção de `pg_constraint` não encontrou FKs apontando para `bookings`, mas isso não autoriza apagar histórico financeiro.
- Commit `4a9676d5`: a rota DELETE agora **atualiza o status para `cancelled` somente se estiver `pending` ou `confirmed`**, usando uma transição atômica e mantendo o contrato HTTP 204 em caso de sucesso. IDs inexistentes retornam 404; agendamentos concluídos ou já cancelados retornam 409. Não há operação física de DELETE nessa rota.
- **Desalinhamento de interface:** `app/(dashboard)/agendamentos/AgendamentosClient.tsx` continua exibindo botão `Excluir` e removendo o registro do estado local após DELETE; é necessário renomear a ação `Cancelar agendamento`, explicar que histórico será preservado, e manter o registro como cancelado após sucesso. A tentativa de atualização deste arquivo grande não foi aceita pela ferramenta; **não declarar frontend corrigido** até commit verificado.
- **Outras lacunas:** `handleStatusChange` nesse cliente tenta usar PUT genérico para status fora de `confirmed/cancelled`, que agora rejeita alterações de status; revisar UX dos botões e usar exclusivamente endpoints dedicados, incluindo `complete`. Validação de datas do reagendamento exige início e fim juntos.
- Nenhum dado do Supabase foi modificado pela auditoria; corrigir frontend e homologar exclusão lógica antes de encerrar o item.


## AUD-01 — Validação final da exclusão lógica e pendência de interface (19/10/2026)

- Release `c97efa8e` verificado `READY` na Vercel, incluindo backend de cancelamento lógico `4a9676d5`.
- Conferência independente do endpoint `app/api/bookings/[id]/route.ts`: método HTTP DELETE executa `UPDATE status='cancelled'`, condicionado a `pending/confirmed`, mantendo o registro persistido. Nenhuma operação de DELETE físico nessa rota.
- Conferência independente da UI `app/(dashboard)/agendamentos/AgendamentosClient.tsx`: botão no modal ainda rotulado **Excluir**, `handleDelete` ainda filtra/exclui o agendamento do estado local, e `handleStatusChange` ainda contém fallback `api.put(..., {status})`, incompatível com o bloqueio de edição direta do status.
- **Bloqueio operacional:** a ferramenta GitHub não aceitou atualização do componente grande; nenhuma alteração neste arquivo foi confirmada. NÃO apresentar interface como corrigida nem simular commit.
- Correção necessária: exigir confirmação clara de cancelamento lógico; mostrar botão `Cancelar agendamento` somente para `pending/confirmed`; preservar item no estado local com status `cancelled`; remover fallback PUT de mudanças de status e usar somente endpoints dedicados; expor erro ao operador.
- Testes funcionais pendentes: a interface deve preservar histórico e manter filtros corretos, e o backend deve retornar 409 para tentativas em estados encerrados. O WhatsApp segue sem E2E por decisão anterior.


## AUD-01 — Interface de desmarcação sem confundir o botão Cancelar (19/10/2026)

- Decisão de UX: o botão **Cancelar** do modal continua exclusivamente fechando a edição **sem salvar**. O antigo botão destrutivo **Excluir** passa a ser **Desmarcar horário**, com confirmação de que o registro permanecerá no histórico como cancelado. Nenhum segundo botão com nome Cancelar foi criado.
- Commit `e2997ac0` atualizou `app/(dashboard)/agendamentos/AgendamentosClient.tsx`: a ação de desmarcação só aparece para `pending/confirmed`, exige confirmação, chama DELETE (agora cancelamento lógico), e preserva o item local com status `cancelled` em vez de removê-lo da lista. O botão de fechamento `Cancelar` foi mantido.
- `handleStatusChange` deixa de fazer fallback `PUT { status }` na rota genérica; ações de confirmar/cancelar usam apenas endpoints dedicados e conferem o estado no cliente, além dos guards atômicos do backend.
- Inspeção independente do código confirmou presença das mudanças e ausência do antigo fallback e remoção local. O deployment `e2997ac0` estava BUILDING na última consulta; **teste E2E da interface ainda pendente**.
- Observação: o botão lateral **Cancelar agendamento** nas ações da tabela continua com esse nome, mas não fica no modal e portanto não concorre visualmente com seu botão **Cancelar**. Revisar mensagens de erro na tabela e a UX de edição de horários passados em rodada futura.


## AUD-01 — Consistência do formulário e dos intervalos de agendamento (19/10/2026)

- Último baseline `e60dabe9` verificado **READY**. O ajuste do modal `e2997ac0` também estava READY; mantém `Cancelar` como fechamento sem salvar e `Desmarcar horário` para o cancelamento lógico.
- **Falha encontrada:** formulário `AgendamentosClient.tsx` enviava `start_at/end_at` em toda edição, mesmo ao mudar somente notas. Como o backend exige início futuro para reagendamento, edições comuns de agendamentos antigos pendentes/confirmados podiam falhar.
- Commit `00a20484`: frontend envia datas na edição apenas se diferirem das datas do agendamento original; valida início anterior ao fim, máximo de 8 horas e início futuro quando houve mudança de horário. Mantém campos originais em operações sem reagendamento.
- Commit `fa7388a2`: API `POST /api/bookings` passa a validar intervalo futuro, início anterior ao fim e duração máxima de 8 horas, em linha com o PUT. O conflito de sobreposição SQLSTATE `23P01` retorna HTTP 409 com mensagem clara, sem expor o SQL bruto.
- Commit `314a10d6`: API `PUT /api/bookings/[id]` passa a tratar SQLSTATE `23P01` como 409; distingue 404 para registro ausente e 409 para registro encerrado, mantendo segurança do status. Erros internos retornam mensagem genérica e registram apenas código e tenant.
- **Validação estática:** inspeção dos commits no GitHub confirmou os trechos alterados. Deploy mais recente `314a10d6` estava BUILDING na última consulta, portanto os ajustes novos ainda não foram homologados funcionalmente. Nenhuma migration, alteração de dados ou teste WhatsApp nesta rodada.
- **Pendência:** regras de criação e reagendamento ainda precisam de teste E2E positivo, teste de conflito de profissional e avaliação de limite máximo de oito horas frente ao catálogo de serviços e agenda do tenant. Também permanece pendente linha de base independente de CI TypeScript/ESLint.


## AUD-01 — Nova frente: APIs e controle de consumo de IA (19/10/2026)

**Escopo explicitamente adiado:** horários disponíveis, horário de funcionamento/comercial, cálculo de slots e validações de duração máxima serão definidos por mecanismos futuros. A validação atual de intervalo de 8h não é critério definitivo de homologação. Não alterar o módulo de disponibilidade enquanto o novo desenho não estiver definido.

**Revisão do chat interno IA:**
- `POST /api/ai/chat` validava apenas presença de messages; sem validar roles, estrutura de dados, tamanho por mensagem, quantidade de turnos ou volume total antes da chamada Anthropic.
- Commit `ae2c59dc`: exige array de 1 a 30 mensagens com role user/assistant e texto não vazio, máximo de 4.000 caracteres cada e 20.000 no total, último turno user; normaliza objetos ao shape esperado e rejeita entrada inválida com HTTP 400. A autenticação/tenant continua pela sessão.
- Commit `f9120c07`: página `/ia` limita texto a 4.000 caracteres e restringe o histórico enviado a até 30 mensagens/20.000 caracteres, priorizando as mais recentes; o histórico visual anterior não é apagado.
- **Risco de custo ainda aberto:** `getUsage` consulta saldo, a chamada Anthropic ocorre em seguida e `incrementUsage` é disparado em background sem transação de reserva; requisições simultâneas podem ultrapassar limite e falhas do incremento podem não ser observadas. Requer desenho de quota/reserva atômica, conciliação e testes concorrentes. Não alegar bloqueio financeiro rigoroso pela implementação atual.
- **Outros endpoints examinados:** webhook Asaas exige token e reconfirma cobrança no provedor antes de RPC idempotente; cron reset counters exige segredo; `GET /api/public/slots` expõe apenas intervalos ocupados sob tenant fornecido e será revisitado na evolução de horários. Observações derivadas da leitura de rotas, não de teste E2E.
- **Pendente:** comprovar GitHub Actions TypeScript/ESLint, revisão de permissões superadmin, rate limiting e testes de inputs malformados; release dos commits novos precisa de READY.


## AUD-01 — Superadmin, permissões do perfil e templates (19/10/2026)

- Decisão de escopo: validação de horário comercial, slots e duração permanece **adiada para motor de disponibilidade futuro**; nenhum teste de WhatsApp nesta rodada.
- `PATCH /api/superadmin/tenants/[id]/status` verifica usuário autenticado e `profiles.role='superadmin'` consultado com service role, aceita campos `status/plan/expires_at` em allowlist e filtra tenant de destino por UUID. `PATCH/DELETE /api/superadmin/email-templates/[key]` também exige superadmin; a autorização de template usa consulta autenticada ao perfil, sujeita ao RLS.
- Consulta somente leitura em `pg_attribute` confirmou `has_column_privilege('authenticated','public.profiles','role','UPDATE')=false`, idem `tenant_id=false`, enquanto `name=true`. Isto dá suporte à confiança no papel no banco, mas **não substitui testes de acesso com usuários reais e claims corretos**.
- Templates de e-mail permitiam strings sem limite ou tipagem obrigatória. Commit `5139c897`: exige chave alfanumérica em minúsculas com hífen/underscore (até 100 caracteres), subject não vazio até 250 caracteres, HTML não vazio até 100.000 caracteres e `isActive` booleano, quando enviado. Consulta de nomes de templates existentes confirmou nomes compatíveis. Não foi alterado nenhum template persistido.
- Commits `8585b02f` e `eed0c024`: mensagens 500 genéricas na API sem retorno do erro bruto do banco, logs restritos ao código do erro em vez do objeto inteiro.
- **Pendências:** testes de autorização cross-tenant com múltiplos usuários; revisão de limites/rate limiting; auditoria de HTML de templates e rastreabilidade de alterações administrativas; quota atômica do chat IA; comprovação de TypeScript/ESLint. Todos são controles a verificar, não homologações concluídas.


## AUD-01 — Continuidade e revalidação independente do Superadmin (19/10/2026)

- Continuidade do bloco anterior, sem reiniciar AUD-01. A documentação existente já registrava a verificação de papel e tenant no perfil, as validações dos templates e a supressão de erros brutos; este bloco acrescenta resultados reconsultados diretamente no Supabase.
- Consulta `has_column_privilege` nesta rodada reconfirmou para `authenticated`: UPDATE em `profiles.role=false`, `profiles.tenant_id=false`, `profiles.name=true`. Evidência de permissão de coluna; não substitui testes com sessão JWT de usuário nem revisão de caminhos usando service role.
- Política `profiles_own_r` concede SELECT para `id=auth.uid()` e `profiles_tenant_rw` usa `tenant_id=current_tenant_id()`. `current_tenant_id()` lê o identificador de `auth.jwt()->app_metadata->tenant_id` e não de `user_metadata`. Validar revogação/troca de tenant e tokens ainda válidos.
- `email_templates` possui SELECT para templates ativos por usuário autenticado e ALL condicionado ao papel service_role; privilégios explícitos e ações administrativas via API devem ser tratados separadamente. Conferência do schema: `name`, `subject`, `body_html`, `variables`, `is_active`, `is_system`, `created_at`, `updated_at`; ausência de coluna de autor/editor para trilha administrativa na própria tabela. Verificar logs externos antes de concluir inexistência de auditoria.
- Inventário de triggers do schema public: sete triggers de `updated_at` em bookings, clients, professionals, profiles, services, subscriptions e tenants. Não foi identificado trigger de auditoria dedicado a email_templates nessa listagem; verificar rastreabilidade de criação/alteração/remoção nas rotas e logs.
- Supabase Security Advisor em 19/10: `asaas_processed_payments` e `whatsapp_contact_permissions` têm RLS habilitado sem policy (pode ser bloqueio intencional); extensão `btree_gist` em public; leaked-password protection desabilitada. Tratar como achados classificados, não como prova automática de vulnerabilidade.
- Avaliação do Supabase Performance Advisor: avisos de FKs sem índices, reavaliação de auth nas políticas e permissive policies sobrepostas; otimizar apenas após medição e análise de impacto.
- Release de produção Vercel `dpl_28Tw3tpF1ffCruNHFo7Gm97qEnjg` reportou READY com commit `28509f18925706e6493dafb390574a9ee55310f5`, correspondente ao registro anterior da AUD-01. Não houve alterações em runtime ou dados nesta revalidação.
- Permanecem pendentes: teste real multiusuário/cross-tenant, revisão de todos os endpoints de superadmin, inspeção de sanitização/renderização de HTML, autorização de alterações em templates, trilha imutável das ações, proteção contra repetição/rate limiting, CI TypeScript/ESLint e quota atômica de IA.
- Escopo adiado mantido: motor futuro de disponibilidade/slots/duração e testes E2E de WhatsApp. Esta rodada não realizou DDL, alteração de dados nem testes invasivos.


## AUD-01 — Revisão complementar de rotas administrativas e privilégios (19/10/2026)

**Evidência direta (somente leitura):**
- `PATCH app/api/superadmin/tenants/[id]/status/route.ts`: `auth.auth.getUser()` obrigatório (401 sem sessão), leitura autoritativa de `profiles.role` via `createAdminClient()` (403 se diferente de superadmin), UUID validado, allowlist de `status`, `plan`, `expires_at`, update condicionado a `tenants.id`. Não foi visto rate limiting ou registro explícito de evento de auditoria na rota. O catch de erro do update registra `console.error(..., error)` com objeto bruto de erro; priorizar logging de código e correlação, sem conteúdo sensível.
- `PATCH/DELETE app/api/superadmin/email-templates/[key]/route.ts`: consulta `getUser()` e depois perfil via cliente de sessão, aceita somente papel `superadmin`; retorna 401 também para autenticado sem privilégio (sem diferenciar 403); chave validada via expressão regular; PATCH valida assunto, HTML, `isActive` e faz UPSERT via cliente privilegiado; DELETE faz exclusão por chave. Erros internos devolvidos ao cliente são genéricos e logs incluem apenas código. Não há no corpo dessas rotas trilha administrativa persistente nem rate limiting visível.
- SQL `has_table_privilege/has_column_privilege`: `authenticated` NÃO pode atualizar `tenants` nem as colunas `plan`, `plan_status`, `trial_ends_at`, `owner_id`. Para `email_templates` existem GRANTs de INSERT/UPDATE/DELETE a authenticated, mas a policy de escrita ALL exige `auth.role()='service_role'`: GRANT isolado não representa permissão efetiva; confirmar via sessão real. Evitar remover grants sem avaliar contratos de SELECT e RLS.
- Inventário de `public` não encontrou tabelas com nome semelhante a `audit`; tabela `email_templates` possui datas de criação/atualização, mas não identidade de ator. Ausência no schema public e nas duas rotas verificadas não exclui outros coletores/logs externos.
- A API permite conteúdo HTML; validação de tipo e tamanho não é sanitização. Revisar pontos de renderização, escape das variáveis, pré-visualização, política CSP e tratamento de links/recursos remotos antes de homologar HTML.
- Testes ainda NÃO executados: sem sessão -> 401; usuário comum -> 403/401; superadmin -> operação autorizada; alteração cross-tenant; payloads malformados e limites; registros de auditoria e rate limiting. Evitar POST/PATCH/DELETE de teste em produção com dados reais.
- Prioridades sugeridas: **alta** implementar/comprovar trilha de mudanças administrativas; **média** restringir detalhes de log na rota de tenant, verificar sanitização/preview HTML e rate limiting. Status: análise estática + privilégios, não homologação E2E.


## AUD-01 — Isolamento entre tenants: revisão de USING, WITH CHECK e integridade (19/10/2026)

- Reconsulta somente leitura de `pg_policies`: `bookings_tenant_rw`, `clients_tenant_rw`, `professionals_tenant_rw`, `services_tenant_rw` e `profiles_tenant_rw` têm `USING (tenant_id = current_tenant_id())` e `WITH CHECK (tenant_id = current_tenant_id())`. As políticas cobrem comando ALL; o controle é dependente das claims de app_metadata do JWT.
- `profiles_own_r` concede somente SELECT do próprio perfil (`id=auth.uid()`). Permissão UPDATE direta sobre `profiles.id` e `profiles.tenant_id` está negada para `authenticated`; `role` também já foi verificado como bloqueado nas etapas anteriores.
- `push_subscriptions` usa controles de `user_id=auth.uid()` e possui FK composta `(user_id,tenant_id)->profiles(id,tenant_id)`. Registrar que há políticas permissivas sobrepostas e que o comportamento efetivo deve ser testado em sessão de usuário.
- Constraints compostas encontradas em `bookings`: `bookings_client_same_tenant`, `bookings_service_same_tenant` e `bookings_professional_same_tenant`. Elas vinculam o tenant dos relacionamentos. Há constraint adicional `push_subscription_user_same_tenant` vinculando inscrição push ao perfil do tenant.
- `has_column_privilege('authenticated', ..., 'tenant_id','UPDATE')` é true em `bookings`, `clients`, `professionals`, `services` e `push_subscriptions`; a barreira contra troca de tenant é formada por RLS/constraints, e não por GRANT de coluna. Isso não indica bypass, mas merece testes negativos reais.
- Limites da evidência: foi feita inspeção de definição de políticas, grants e constraints, SEM autenticar usuários de dois tenants e SEM alterações de registros. Ainda não está homologada a resistência a BOLA/IDOR nas APIs com service_role, nem a atualização/expiração de claims JWT após mudança de vínculo.
- Plano de testes recomendado em ambiente isolado: obter sessões reais de usuário A/tenant A e B/tenant B; testar SELECT, INSERT, UPDATE e DELETE cruzados em IDs controlados de cada tabela; tentar migrar tenant_id e referenciar entidades de outro tenant; repetir por endpoints backend; verificar respostas HTTP, ausência de efeitos colaterais e logs sem PII. Testes destrutivos somente com fixtures descartáveis, nunca sobre dados de clientes.


## AUD-01 — Testes transacionais com identidades de contas de teste existentes (19/10/2026)

Autorização recebida para utilizar contas de teste existentes. Ensaios executados **no PostgreSQL**, com `BEGIN`, `SET LOCAL ROLE authenticated`, configuração local de `request.jwt.claims` com `sub`, `role=authenticated` e `app_metadata.tenant_id`, seguidos de `ROLLBACK`. **Não foram emitidos tokens reais de login**, não foram alteradas senhas nem feitas requisições autenticadas HTTP. Este procedimento verifica o comportamento RLS sob claims simuladas, não todo o processo de autenticação.

- Inventário: 5 tenants e 5 perfis; 1 perfil superadmin e 4 administradores de tenant. Não registrar e-mails ou dados pessoais dos testes no documento.
- Conta de teste A (`tenant_id=1c893b9a-5574-47ab-a99b-c5833d6e42f8`): `auth.uid()` e `current_tenant_id()` refletiram a identidade/tenant esperados. SELECT retornou 8 clientes, 32 agendamentos, 3 serviços próprios; clientes do tenant B retornaram **0**.
- Conta de teste B (`tenant_id=ae22a6ba-256c-4e91-8f3f-9acad8cd9de1`): SELECT retornou 1 cliente, 1 agendamento, 1 serviço próprio; consultas direcionadas ao tenant A para clientes, agendamentos e perfis retornaram **0**.
- Conta de teste C (`tenant_id=c6faf7c1-3200-47b7-8030-346c9b76ba97`): consultas próprias retornaram 0 (tenant sem esses registros); consultas ao tenant B para clientes, agendamentos e perfis retornaram **0**.
- Sob a identidade simulada do tenant A, tentativa `UPDATE public.clients SET name=name WHERE id=<cliente existente do tenant B>` retornou **0 linhas atualizadas**. Tentativa `DELETE FROM public.bookings WHERE id=<agendamento existente do tenant B>` retornou **0 linhas excluídas**. Ambas executadas em transação com rollback; nenhuma alteração persistida. IDs-alvo omitidos deste resumo.
- Evidência positiva de isolamento RLS em SELECT, UPDATE e DELETE para os cenários específicos acima, com sessão de banco simulada. Não classificar como homologação total: faltam INSERT cruzado, troca de `tenant_id`, fluxos com `service_role`, autenticação real/refresh de JWT, testes HTTP e operações concorrentes.
- Recomendação de continuação: desenvolver suíte automatizada de autorização com contas de teste e fixtures descartáveis, validar rotas com sessão real e checar que o superadmin não permita acesso transversal inadvertido fora das operações explícitas.


## AUD-01 — Testes INSERT e troca de tenant_id (19/10/2026)

- Autorização de uso das contas de teste existentes mantida. Simulação em sessão SQL do `authenticated` com `request.jwt.claims` da identidade do tenant A, transações `BEGIN` e encerramento `ROLLBACK`, sem emissão de JWT verdadeiro ou chamada HTTP.
- **INSERT cruzado em clients**: tentativa de inserir cliente com `tenant_id` do tenant B foi rejeitada pelo PostgreSQL com SQLSTATE `42501`: `new row violates row-level security policy for table "clients"`. Sem registro criado.
- **UPDATE de tenant_id em clients**: tentativa de migrar cliente existente do tenant A para tenant B foi igualmente rejeitada com SQLSTATE `42501`. A instrução falhou e não persistiu alterações.
- **Controle positivo de INSERT próprio**: cliente descartável com `tenant_id` do tenant A foi aceito (`inserted=1`) dentro da transação, seguida por rollback; nenhum dado de teste permaneceu.
- Isso amplia a cobertura já documentada de SELECT, UPDATE e DELETE cruzados: as regras de `USING` e `WITH CHECK` se comportaram como esperado nos casos verificados.
- Limitações: testes feitos na camada de banco com claims simuladas; ainda não abrangem autenticação real via HTTP, API com service_role, atualização/expiração de JWT, todos os perfis, nem todas as tabelas. Não afirmar homologação E2E ou ausência geral de vulnerabilidades.


## AUD-01 — Backend privilegiado e redução de exposição nos logs (19/10/2026)

- Inspeção estática de `lib/supabase/admin.ts`: `createAdminClient()` usa `SUPABASE_SERVICE_ROLE_KEY` do ambiente servidor, com sessão não persistida. Como service_role ignora RLS, qualquer rota que o utilize exige autorização e escopo explícitos; não foi realizado teste HTTP de autenticação real nesta etapa.
- `app/api/superadmin/tenants/[id]/status/route.ts`: verifica sessão via `auth.getUser()`, papel `superadmin` recuperado no banco, UUID e allowlist de campos; a atualização é restrita pelo identificador do tenant alvo. Correção pontual commit `f3c90cbc`: substitui `console.error(..., error)` por log do código `error.code`; mensagem retornada ao cliente permanece genérica. Código pós-commit relido e confirmado.
- `app/api/superadmin/email-templates/[key]/route.ts`: PATCH/DELETE exigem papel superadmin antes de operações privilegiadas, e logs de erro já se limitam a código. Seguem pendentes trilha imutável de mudanças, rate limiting e revisão de conteúdo HTML.
- `app/api/bookings/route.ts` e `app/api/bookings/[id]/route.ts`: exigem `requireSession()`, usam o cliente de sessão e restringem consultas/alterações por `tenant_id`; no cancelamento lógico a atualização depende também de status permitido. Há retorno de `error.message` bruto na falha de GET de bookings; revisar exposição e padronizar erros sem mascarar o diagnóstico interno.
- Estado do deployment após o commit `f3c90cbc` na consulta: **BUILDING**, não declarar READY nem homologado em produção até confirmação. Precedente `ac336cf2` encontrava-se READY.
- Escopo desta rodada: revisão estática e alteração de log; nenhuma alteração de dados ou migrations. Testes HTTP reais por sessões de usuários e operações service_role continuam pendentes.


## AUD-01 — Retomada do backend e proteção de erros na listagem (19/10/2026)

- Revisão de `lib/route-helpers.ts`: `requireSession()` valida token com `auth.getUser()`, extrai `tenant_id` de `user.app_metadata` e reconfirma o vínculo na tabela `profiles` sob RLS, retornando 403 em caso de divergência. O código suporta Bearer e cookie, mas não houve teste HTTP real neste bloco.
- Revisão de `app/api/bookings/route.ts`: GET exige sessão, utiliza cliente autenticado e `.eq('tenant_id',tenantId)`. Identificada exposição de `error.message` bruto do Supabase na resposta HTTP 500.
- Commit `f6fdc1f4`: GET agora retorna mensagem genérica para cliente e registra somente `tenantId` e `error.code` no servidor. Fonte relida antes da atualização. Sem alteração de contrato de sucesso nem de dados.
- A observação anterior sobre regras de disponibilidade, duração e slots mantém-se adiada para mecanismo futuro, não é escopo desta rodada.
- Na consulta inicial à Vercel: `fb8f5386` estava QUEUED, `f3c90cbc` BUILDING e `ac336cf2` READY. O novo commit requer nova confirmação de deployment e testes de integração; não afirmar homologação só pelo commit.
- Não foram feitos testes HTTP com sessões reais nesta rodada. Continuam pendentes provas de autenticação dos diversos perfis via HTTP, revisão das rotas privilegiadas restantes e eventuais controles de auditoria administrativa.


## AUD-01 — Estado dos deploys e distinção entre logs de Auth e auditoria administrativa (19/10/2026)

- Vercel verificada novamente: commit `f3c90cbc` (redução de detalhes nos logs da rota Superadmin tenant status) alcançou **READY**; o commit `f6fdc1f4` (erro genérico na listagem de bookings) estava **QUEUED**, e o commit documental `60a01648` em **BUILDING** no momento da consulta. Não atribuir deploy READY a commits ainda pendentes.
- Inventário adicional localizou `auth.audit_log_entries` com colunas `instance_id`, `id`, `payload`, `created_at` e `ip_address`. É uma tabela do subsistema de autenticação; não é evidência suficiente de rastreamento de mudanças de plano, suspensão de empresa ou edições de templates via API.
- Revisões anteriores não encontraram tabela `public.*audit*` nem gravação de trilha de auditoria persistente nas rotas Superadmin verificadas. Não concluir que inexiste outra telemetria de aplicação/infraestrutura.
- Proposta de controle: trilha de auditoria administrativa de somente acréscimo, acesso restrito ao backend privilegiado, com ator autenticado, ação, tipo e ID do recurso, data e ID de correlação; registrar apenas diferenças não sensíveis/permitidas. Exigir que o registro tenha comportamento de falha definido, sem permitir operações administrativas não auditadas. Não criar schema nem rotas antes de projetar e testar atomicidade e proteção de privilégios.
- Pendentes: autenticação HTTP com usuários reais, testes dos endpoints privilegiados, validação de deploys pendentes e testes de emissão/persistência dos eventos administrativos. Nenhum dado de cliente ou migração foi alterado nesta rodada.


## AUD-01 — Tentativas HTTP não destrutivas e estado do release (19/10/2026)

- Teste de leitura HTTP usando recurso de acesso a deployment da Vercel, **sem credenciais de cliente e sem operações mutáveis**.
- `GET /api/superadmin/tenants/<uuid>/status` no deployment `f3c90cbc`: recebeu HTTP **405 Method Not Allowed**, consistente com a rota que implementa somente PATCH. **Este 405 não testa a autorização PATCH**.
- `GET /api/bookings` no mesmo deployment: ferramenta encontrou HTTP 401 `deployment_authentication_required` após redirecionamento; acesso barrado na camada de proteção do deployment. Não foi possível verificar o comportamento da API ou autenticação de usuário. Não interpretar como resposta 401 da própria API.
- Última inspeção Vercel: `f3c90cbc` READY, `f6fdc1f4` QUEUED, `60a01648` BUILDING e `3a787fd8` QUEUED. Nenhuma confirmação de READY dos commits mais novos neste instante.
- Próxima verificação exigida para homologação HTTP: sessão legítima de administrador de tenant A, tenant B e superadmin; executar requisições controladas nos métodos suportados, assegurando ausência de efeitos colaterais sobre registros não descartáveis. Preferir ambiente/fixtures exclusivos de homologação. Sem autenticação HTTP válida não foi possível homologar a matriz de permissões.
- Nenhuma escrita ao banco, alteração de tenant, migration ou mudança de código funcional nesta etapa; apenas atualização documental.


## AUD-01 — Inspeção de templates e verificação de release consolidado (19/10/2026)

- Release `60a01648` confirmado **READY** na Vercel. Este commit inclui o ajuste anterior de erros da listagem de agendamentos (`f6fdc1f4`), embora o deployment isolado `f6fdc1f4` tenha sido cancelado pela fila de deploys. O commit seguinte `3a787fd8` também estava READY; `db7dd1b7` estava BUILDING na consulta. O estado READY prova a conclusão do build/deploy, não execução de testes de autorização HTTP.
- Revisão da rota `app/api/superadmin/email-templates/[key]/route.ts`: `assertSuperAdmin` valida sessão e papel antes de PATCH/DELETE; não recebe credenciais HTTP artificiais nem executa operação sem autenticação. Testes HTTP com sessão legítima continuam pendentes.
- **Achado funcional/segurança de configuração:** o PATCH executa UPSERT com `is_active: body.isActive ?? true`. Portanto, uma alteração de assunto/HTML que omita `isActive` pode **reativar** silenciosamente um template já desativado. Tratar como falha provável de integridade da configuração; requer confirmação de chamadas do frontend e correção que preserve estado atual quando campo não for enviado, incluindo proteção contra concorrência.
- **Achado de consistência HTTP:** a rota devolve 401 tanto para ausência de sessão quanto para usuário autenticado sem papel superadmin. Diferenciar 403 para perfil não autorizado melhora clareza de contrato, mas não implica bypass de autorização.
- **Pendente alto:** controle de trilha de auditoria das alterações realizadas por superadmin; não confundir `auth.audit_log_entries` com log de operações do negócio.
- **Ação desta rodada:** inspeção estática e consolidação de achados, sem escrever em banco, alterar templates existentes ou tentar autenticação real por credenciais de terceiros. Próxima correção deve verificar impacto no frontend e ser validada com teste de PATCH mantendo `is_active=false`.


## AUD-01 — Correção de estado de templates e códigos HTTP (19/10/2026)

- Commit `326ccff2` ajustou `PATCH/DELETE app/api/superadmin/email-templates/[key]/route.ts`: verificação de papel agora diferencia ausência de sessão (HTTP 401) e perfil autenticado não-superadmin (HTTP 403).
- UPSERT de template agora inclui `is_active` somente se `body.isActive !== undefined`. Evita o antigo `is_active: body.isActive ?? true` que reativava templates em atualizações de assunto/HTML com campo omitido. O banco confirma `email_templates.is_active DEFAULT true NOT NULL` para criação sem status explícito.
- Inspeção estática do arquivo após commit confirmou a nova lógica; nenhum registro de template foi alterado manualmente. O efeito em conflito de UPSERT deve ser coberto por teste integrado com template previamente desativado, inclusive quando `isActive=false` explícito.
- Vercel apontava o deploy do commit `326ccff2` como `QUEUED`; build/produção e testes HTTP permanecem pendentes. Trilha administrativa, sanitização de HTML e rate limiting ainda não estão homologados.


## AUD-01 — Teste de preservação de status e correção adicional do UPSERT (19/10/2026)

- Testes SQL transacionais com registros descartáveis e rollback: atualização que omite `is_active` preservou `false`; simulação de INSERT ON CONFLICT atualizando `is_active=EXCLUDED.is_active` resultou em `true`, pois a coluna possui default true. Isso mostrou que retirar o campo do payload de UPSERT não bastava para garantir ausência de reativação.
- Commit `f15f3081`: rota PATCH de templates deixou de usar UPSERT genérico. Agora consulta pelo nome via cliente privilegiado, faz UPDATE parcial por ID quando existente (omitindo `is_active` se não informado) ou INSERT para template novo (usando o default do banco). Releitura pós-commit confirmou ambos os caminhos. A API mantém 401/403 separados.
- Limite: consulta seguida de UPDATE/INSERT não é operação atômica; duas criações simultâneas para a mesma chave podem gerar erro de unicidade, e mudanças concorrentes continuam necessitando política definida. Nenhum teste HTTP real realizado. Para garantia rigorosa, evoluir para operação atômica em banco com `ON CONFLICT DO UPDATE` que modifique somente colunas explicitamente enviadas; testar concorrência e permissões.
- Deploy do commit `f15f3081` ainda não homologado neste registro. Testes não deixaram dados persistidos; atualização apenas no código e documentação.


## AUD-01 — Concorrência em criação/edição de templates (19/10/2026)

- O fluxo prévio `SELECT` seguido de `INSERT` pode sofrer corrida quando duas requisições criam a mesma chave. A chave única de `name` protege a integridade dos registros, mas a segunda requisição recebia erro interno genérico.
- Commit `cde70f5b`: quando a tentativa de INSERT retorna PostgreSQL `23505` (conflito de unicidade), a rota tenta UPDATE por `name`, usando exclusivamente `templateValues` — portanto, sem atualizar `is_active` quando o campo foi omitido. Se a linha desapareceu novamente, retorna HTTP 409 com mensagem de conflito. Preservados os retornos 401/403 e o log mínimo de erro.
- Validação estática após commit confirmou o fallback condicional. **Não houve teste HTTP de concorrência ou prova de linearizabilidade**; outras corridas (`DELETE` simultâneo, edições concorrentes de conteúdo) permanecem. Para atomicidade forte futura, considerar RPC privilegiada em transação única com contrato de atualização parcial e audit trail.
- Deploy ainda necessita confirmação de READY e teste integrado. Nenhum template persistido foi modificado nesta rodada.


## AUD-01 — Rodada consolidada: backend, concorrência, privilégios e releases (19/10/2026)

**Verificações realizadas:**
- Código `GET /api/bookings` relido: não devolve mais `error.message` bruto; resposta de erro genérica com logging do código interno.
- Revalidação no banco: `authenticated` não pode alterar `public.profiles.role` nem `public.profiles.tenant_id` por UPDATE de coluna. Proteção comprovada em privilégios; testes HTTP reais continuam pendentes.
- Inspeção dos templates existentes: oito chaves listadas na consulta de inventário, todas ativas naquele instante; nenhum template foi alterado pela auditoria.
- `app/api/superadmin/email-templates/[key]/route.ts`: commit `19bc7f51` fez o UPDATE de template existente solicitar o ID gravado e devolver HTTP 409 se a linha não existir mais (corrida DELETE entre SELECT e UPDATE). Confirmação estática do código após commit. Fallback anterior para INSERT concorrente `23505` preservado. **Não declarar comportamento concorrente homologado sem teste HTTP real**.
- Na inspeção anterior de Vercel, `326ccff2` estava READY, mas `d5b13c33` BUILDING e `cde70f5b`/demais deploys posteriores ainda QUEUED. O status de publicação dos últimos commits depende de verificação separada.
- A operação de template continua sujeita a corrida de conteúdo (última gravação prevalece); para garantia forte de consistência e auditoria, planejar update atômico com controle de versão/etag, proteção de trilha de alterações e casos de teste automatizados.
- Não foram criadas sessions reais de Auth; as avaliações SQL anteriores com claims simuladas não equivalem a chamadas HTTP autenticadas. **Não homologar a AUD-01 integralmente sem esses testes**.
- Nesta rodada: um ajuste de código, verificação de permissões e atualização documental. Sem migrations nem modificações de dados reais.


## AUD-01 — Rodada agrupada: liberação, checagens automáticas e pendências finais (19/10/2026)

- Vercel: na consulta desta rodada, o commit `00c4b9f6` (documentação do tratamento de concorrência) alcançou READY; o commit `3378eeb0` ainda BUILDING e `19bc7f51` QUEUED. O estado dos deploys muda; considerar apenas a última verificação e não confundir READY com teste funcional.
- `email_templates` ainda utiliza `service_role` apenas após conferência de superadmin por sessão; PATCH diferencia 401/403 e atualiza sem trocar `is_active` omitido; trata conflito de INSERT 23505 e linha removida entre SELECT e UPDATE como HTTP 409. Revisão estática reconfirmada; teste HTTP de perfis e concorrência segue pendente.
- `GET /api/bookings` foi relido: resposta HTTP 500 não expõe mais `error.message` bruto.
- Supabase: consulta `has_column_privilege` reconfirmou `UPDATE=false` para `authenticated` em `profiles.role` e `profiles.tenant_id`. RLS de leitura e escrita intertenant foi exercitada em rodadas anteriores com transações revertidas, sem vulnerabilidade comprovada nos cenários exercitados.
- **Novo controle de regressão:** commit `03134e8b` criou `.github/workflows/aud-01-quality.yml` para executar `pnpm install --frozen-lockfile`, `tsc --noEmit --incremental false` e `pnpm lint -- --no-cache` em push de main e PRs. Arquivo GitHub relido e confirmado. **Execução/resultado de GitHub Actions ainda não confirmado**, portanto não alegar qualidade aprovada.
- **Bloqueadores de encerramento:** testes HTTP com sessões legítimas de superadmin/administradores de diferentes tenants (inclusive negação 401/403); confirmação de resultado verde de CI; prova de integridade de templates via rota com mudanças reais; trilha de auditoria administrativa durável e protegida para alterações de tenant/template.
- Controles com acompanhamento pós-AUD-01: proteção de abuso/rate limiting, sanitização/preview HTML e política definida para edições simultâneas de conteúdo (last-write-wins vs controle de versão). Não há evidência suficiente para os marcar como corrigidos.
- Nesta rodada, não houve DDL, migrations, alterações em dados de clientes ou templates; apenas criação de workflow CI e documentação consolidada.
