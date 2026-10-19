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
