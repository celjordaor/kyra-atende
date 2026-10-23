# Kyra Atende — Handoff oficial para novo chat
**Atualização:** 23/10/2026 (reconciliação após PR #102)  
**Fonte de verdade:** código e histórico de `main`, Plano Mestre, especificação E3 e evidências de CI/deploy/Supabase. Este documento não equivale a homologação E2E.

## Identificadores
- GitHub: `celjordaor/kyra-atende`, branch `main`.
- HEAD observado: `25f15a543365efc7a1b2a587beb9c1d23feb1ac9` — merge PR #102 (pesquisas, convites e respostas). **Reconsultar HEAD antes de qualquer edição.**
- Vercel: projeto `prj_JIxzGtz8u4yvbvSc3GJJLEhbrf4c`, equipe `team_CKMFW37A7GB9ZJDP9DhmE1N1`, domínio `https://www.kyraatende.com.br`. **Deploy de #102 não verificado nesta reconciliação.**
- Supabase **Kyra Atende**: `zrszytzlovthyezozqhj`. Confirmar escopo, migrations e schema remoto antes de migração; nunca utilizar outro projeto Kyra por engano.
- Workflows exigidos: `AUD-01 Quality Gates` e `AUD-01 Static Security & Quality Checks`. **Resultado dos checks no SHA #102 não revalidado nesta reconciliação.**

## Prioridade atual definida pelo proprietário
**E3, item 12 — duas pesquisas diferentes: facilidade após agendar e satisfação após atendimento concluído.** NÃO substituir por outra rodada genérica de auditoria de Portal/WhatsApp. As pendências E2E externas continuam registradas e só interrompem a evolução por defeito crítico ou orientação expressa.

### O que existe no repositório
- **P12.1** modelos/perguntas versionados, administração e publicação/pausa: `supabase/migrations/20261023044642_e3_survey_template_foundation.sql`, `app/api/surveys/templates/route.ts`, `app/(dashboard)/pesquisas/SurveyTemplatesClient.tsx`.
- **P12.2 (fundação adicionada no PR #102)**: `supabase/migrations/20261023132446_e3_survey_invitations_responses_foundation.sql`, `app/api/surveys/invitations/route.ts`, `app/api/surveys/respond/[token]/route.ts`, `app/pesquisa/[token]/page.tsx` e `SurveyRespondClient.tsx`.
- **Não afirmar conclusão de P12.2 ainda**: o merge comprova arquivos/código, não prova ativação de CTA após agendamento, integração de todos os caminhos de reserva, métricas administrativas, migration aplicada remotamente, checks/deploy no SHA #102 ou E2E com contas reais.

### Próxima execução funcional, sem reabrir escopo
1. Ler este arquivo, `docs/PLANO-MESTRE-E-ORDEM-DE-EXECUCAO-2026-10-23.md`, `docs/PROJETO-EVOLUCAO-POS-HOMOLOGACAO.md` e `docs/E3-PESQUISAS-POS-AGENDAMENTO-E-ATENDIMENTO.md`.
2. Confirmar HEAD, PR #102/CI, deploy Vercel e versões de migration no Supabase correto. Inspecionar as novas APIs/tabelas e garantir tenant, autorização, token opaco/expiração, idempotência e tratamento seguro de erros.
3. Concluir **P12.2** como funcionalidade utilizável: disponibilizar CTA opcional de pesquisa **após reserva confirmada** nos fluxos aplicáveis (sem bloquear agendamento), entregar visualização administrativa de respostas e métricas iniciais; reusar infraestrutura existente, sem duplicar tabelas/rotas.
4. Validar token inválido/expirado, resposta repetida/concorrente, convites duplicados, ausência de vazamento de dados, tenant A/B, fluxo de reservas e acessibilidade/mobile. Rodar testes locais disponíveis e os dois gates de CI; PR/merge e checar deploy `READY` do SHA exato. Se indisponíveis, registrar bloqueio — jamais inventar teste.
5. Seguir **P12.3** (satisfação pós-atendimento com ação manual elegível), **P12.4** (automação diária desligada por padrão, outbox, opt-out, limites e relatórios) e **P12.5** (homologação E2E). **Não disparar mensagens, pesquisas ou cobranças reais sem autorização e ambiente apropriado.**
6. Atualizar a especificação E3, este handoff, o Plano Mestre e a matriz dos 18 itens **na mesma entrega funcional**, preservando o histórico de status e as evidências.

## Frentes paralelas que não devem sumir
- **AUD-01:** encerramento técnico com ressalvas; HTTP com identidades reais de dois tenants e demais testes externos não presumidos.
- **Portal:** consolidação prévia; homologação funcional final foi adiada pelo proprietário. Não reabrir sem motivo novo.
- **Evolution/WhatsApp:** revisão técnica global em `docs/operacao/WHATSAPP-VALIDACAO-GLOBAL-2026-10-23.md`; E2E real exige número/instância isolados; não executar envios reais em números compartilhados.
- **IA monetária/Asaas:** limites/configuração de produção e testes externos devem ser verificados em trilho próprio.
- **E1:** Design System, modais e painéis laterais, LGPD/textos legais definitivos, autenticação/PWA e visual ainda requerem retomada conforme Plano Mestre.
- **E2 do roadmap:** onboarding guiado por tenant, desativação segura de profissionais/serviços, operações de agenda; não confundir com documento técnico chamado E2 sobre IA.
- **E4/E5:** recorrência, integrações, remetente verificado, nova UX de agendamentos e landing preservados no backlog.

## Disciplina obrigatória
- Ler arquivos relevantes antes de desenvolver; conferir contexto atualizado em GitHub/Supabase/Vercel.
- Agrupar **análise + correção + validação + commit + revisão + documentação** numa rodada por funcionalidade; não multiplicar PRs cosméticos ou doc-only.
- Manter migrations e Git sincronizados, RLS, autorização, isolamento, idempotência, logs sem PII e secrets fora do cliente.
- Respeitar identidade visual aprovada e componentes reaproveitáveis; preferir laranja/lilás/cinza, não azul/verde como marca principal.
- Distinguir **código implementado / teste automatizado aprovado / migration remota verificada / deploy READY / E2E executado / homologação do proprietário**. Nada disso é sinônimo.
- Não confundir esta reconciliação documental com execução de build, teste, CI, deploy ou validação SQL: apenas HEAD e arquivos GitHub foram conferidos neste trabalho.

## Verificação adicional para a nova conversa (23/10/2026)
- O PR #102 (SHA `25f15a543365efc7a1b2a587beb9c1d23feb1ac9`) foi confirmado como deploy `READY` na Vercel. A branch `main` teve commits documentais depois disso; na nova sessão verificar HEAD atual e deploy do SHA exato.
- A fundação P12.2 já contempla migration `20261023132446_e3_survey_invitations_responses_foundation.sql`, API de convites `app/api/surveys/invitations/route.ts`, consulta/resposta pública `app/api/surveys/respond/[token]/route.ts` e formulário `app/pesquisa/[token]`.
- Os convites são gerados manualmente por owner/admin e a resposta informa `sent:false`; **não há evidência de disparos automáticos**. Confirmar execução da migration no banco remoto antes de avançar.
- Próximo incremento de produto: conexão não bloqueante da pesquisa com o sucesso do agendamento, consulta administrativa de respostas e métricas, segurança de token/tenant/concorrência. Depois P12.3 pós-atendimento. Portal e WhatsApp conservam homologação E2E pendente, sem refazer auditorias genéricas.
- Prompt de retomada pronto para copiar: `docs/PROMPT-NOVO-CHAT-KYRA-ATENDE-2026-10-23.md`.


## Execução em andamento — P12.2, branch funcional
- Branch `feat/e3-p122-survey-results`: integração de feedback opcional e não bloqueante após reserva pública confirmada; link público com token opaco gerado no servidor e não enviado automaticamente; página de resultados administrativos com métricas e escopo por tenant.
- Conferido: `main` HEAD anterior à branch `3d21d2a529f9de83f217e12b13be3ec9215f260a` (`READY` no Vercel). Supabase `zrszytzlovthyezozqhj` `ACTIVE_HEALTHY`, migrations `20261023044642` e `20261023132446` registradas e tabelas presentes.
- Os arquivos em branch ainda precisam de CI/PR, merge/deploy e QA/E2E. O fluxo não envia mensagens. Continuar em P12.2 até validar e então P12.3.


## Continuidade P12.3 — 23/10/2026
- PR funcional em preparação: ação **Pesquisa** em agendamentos concluídos no desktop/mobile; modal de seleção do modelo `service_satisfaction` publicado; criação manual de convite e cópia de link. Nenhuma comunicação é disparada automaticamente.
- Último deploy confirmado: PR #106, commit `d793919d27cd499e65287117af5c5cc8096cf15a`, Vercel `READY`; P12.2 CI aprovado. P12.3 exige CI/merge/deploy próprios e E2E de tenants e links.
- Próximo: P12.4 automação diária inicialmente desligada, outbox, opt-out, métricas; P12.5 homologação externa.


## Continuidade P12.4 — estado mais recente (23/10/2026)
- P12.3 consolidada em PR #107 / main `13871ec2c371f355dc5534a5c4f3f055d58d4dcb`; deployment verificado READY. Nenhum envio externo.
- Branch `feat/e3-p124-safe-survey-automation` prepara configuração por tenant, opt-out e outbox retida. Arquivo SQL `supabase/migrations/20261023160723_e3_survey_automation_safe_foundation.sql`; interface e API `GET/PATCH /api/surveys/automation`. Restrição `enabled=false`, `send_channel=disabled`, sem worker ou cron. Conferir migration remota, CI, PR e deploy antes de dizer publicado.
- P12.4 incompleta: falta processamento elegível/opt-out efetivo, outbox idempotente, monitoramento e relatórios; P12.5 exige homologação de dois tenants e comunicações somente após aprovação.

- Migration P12.4 aplicada remotamente no Supabase Kyra Atende como versão `20261023160723`, mantendo arquivo Git sincronizado; envio permanece bloqueado.


## P12.4 — incremento de elegibilidade, opt-out e fila retida (23/10/2026)
- PR #108 integrado em `476ae01fd9c35d688666bf0cf47fc92ab2f9b28a`; migration `20261023160723` aplicada no Supabase correto. Deploy do #108 ainda requer confirmação `READY` (última consulta BUILDING).
- Incremento atual em `feat/e3-p124-optout-held-queue`: `GET/POST /api/surveys/opt-out` para owner/admin gerir preferências por cliente tenant-scoped; `GET/POST /api/surveys/outbox` para registrar **manualmente** convites existentes após validar reserva, modelo, prazo, estado, finalidade e opt-out. Outbox só aceita `held`, sem processador.
- Próximos gates: CI, PR/merge, deploy exato, QA E2E dois tenants e testes de concorrência; P12.4 continua parcial (consentimento, operação de opt-out pelo próprio cliente, retentativas e delivery, relatórios e ativação). Nenhum canal real habilitado.
