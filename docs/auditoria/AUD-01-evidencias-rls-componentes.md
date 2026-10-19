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
