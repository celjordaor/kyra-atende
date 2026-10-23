# Prompt oficial de retomada — Kyra Atende (23/10/2026)

Continue o desenvolvimento do Kyra Atende com entregas funcionais consolidadas. **Antes de qualquer alteração**, leia no GitHub `celjordaor/kyra-atende`, branch `main`:
- `docs/HANDOFF-NOVO-CHAT-2026-10-23.md`
- `docs/PLANO-MESTRE-E-ORDEM-DE-EXECUCAO-2026-10-23.md`
- `docs/E3-PESQUISAS-POS-AGENDAMENTO-E-ATENDIMENTO.md`
- `docs/PROJETO-EVOLUCAO-POS-HOMOLOGACAO.md`
- Código, migrations e APIs existentes de pesquisas.

**Infra:** GitHub `celjordaor/kyra-atende`, Vercel project `prj_JIxzGtz8u4yvbvSc3GJJLEhbrf4c`, team `team_CKMFW37A7GB9ZJDP9DhmE1N1`, site `https://www.kyraatende.com.br`, Supabase project `zrszytzlovthyezozqhj`. O PR #102, SHA `25f15a543365efc7a1b2a587beb9c1d23feb1ac9`, teve deploy `READY` verificado em 23/10/2026; novos commits documentais foram aplicados à main depois dele. Confirme HEAD, deploy e migrations remotas novamente.

**Prioridade expressa do proprietário:** **E3 / item 12 — pesquisas pós-agendamento e pós-atendimento.** Não retornar a rodadas genéricas de auditoria de WhatsApp/Portal.

P12.1 já existe: templates, perguntas, versões, publicação e pausa, migration `20261023044642_e3_survey_template_foundation.sql`, API `/api/surveys/templates` e tela `/pesquisas`. P12.2 teve fundação implementada no PR #102: migration `20261023132446_e3_survey_invitations_responses_foundation.sql`, APIs `/api/surveys/invitations` e `/api/surveys/respond/[token]`, e página `/pesquisa/[token]`. Convites são manuais, sem envio (`sent:false`). **Não recriar tabelas ou rotas.** Verifique se as migrations foram realmente aplicadas no Supabase, isolamento tenant e regras de resposta única/concorrente.

**Próxima entrega:** completar P12.2 de forma segura, ligando a pesquisa rápida à confirmação de agendamento sem impedir a reserva, com consulta de respostas e métricas iniciais no painel. Não disparar WhatsApp/e-mail automaticamente nem inventar homologação. Depois avançar P12.3 (CSAT pós-atendimento), P12.4 (fila, automação desligada por padrão, relatórios e opt-out), P12.5 (E2E).

**Pendências que continuam abertas:** Portal do Cliente e WhatsApp possuem revisão técnica, mas seus E2E reais não foram homologados; o proprietário testará o Portal depois. E1 ainda requer Design System de modais, painéis e telas e aprovação de textos legais; E2 requer onboarding guiado do usuário/tenant, desativação segura de serviço/profissional e operações de agenda. E4/E5 permanecem no roadmap de 18 itens. Preservar layouts já homologados, isolamento multitenant, RLS, rate limits e idempotência.

**Execução:** ler arquivos antes de editar; trabalhar análise → correções/entrega funcional → verificações de schema, segurança e TypeScript → ambos workflows `AUD-01 Quality Gates` e `AUD-01 Static Security & Quality Checks` no SHA da alteração → PR e merge → verificar Vercel `READY` → atualizar documentação. Use a skill Supabase antes de operações no banco. Não confundir código implementado, CI verde, deploy publicado e E2E homologado. Agrupar atividades para evitar muitas idas e vindas. Começar trabalhando efetivamente em P12.2, não apenas resumindo o projeto.
