# Kyra Atende — Handoff oficial para novo chat
**Data de verificação:** 23/10/2026
**Objetivo:** preservar estado real e decisões; NÃO iniciar auditorias repetitivas quando o próximo épico de produto já está priorizado.

## 1. Repositório, produção e fonte de verdade
- GitHub: `celjordaor/kyra-atende`, branch `main`.
- Vercel: projeto `prj_JIxzGtz8u4yvbvSc3GJJLEhbrf4c`; equipe `team_CKMFW37A7GB9ZJDP9DhmE1N1`; site `https://www.kyraatende.com.br`.
- Último commit de `main` e deploy `READY` verificados na preparação deste handoff: `88b130f051308818071da509f440b82cbae696f6`, PR #101. Este documento será integrado em commit posterior; na retomada, **reconsultar HEAD e deploy** em vez de usar o SHA histórico como HEAD atual.
- Supabase do Kyra Atende: projeto `zrszytzlovthyezozqhj`. Confirmar projeto/scope antes de toda migration; consultar histórico remoto e não reaplicar versão já registrada.
- CI que deve passar para cada alteração: `AUD-01 Quality Gates` e `AUD-01 Static Security & Quality Checks`. Só fazer merge com ambos `completed/success` no SHA do PR. Checar deploy `READY` para o SHA final.

## 2. Ordem de prioridade, expressamente definida
A matriz de 18 pedidos está em `docs/PROJETO-EVOLUCAO-POS-HOMOLOGACAO.md`, com ordem vigente em `docs/PLANO-MESTRE-E-ORDEM-DE-EXECUCAO-2026-10-23.md`.
- **AGORA: E3, item 12 — Pesquisas pós-agendamento e pós-atendimento**.
- **Estado observado até PR #101:** P12.1 fundação de modelos e perguntas já implementada (migration `20261023044642_e3_survey_template_foundation.sql`, API `app/api/surveys/templates/route.ts`, tela `app/(dashboard)/pesquisas/SurveyTemplatesClient.tsx`). Criação de rascunho, versões, publicar/pausar e nova revisão no código. Existe deploy READY, mas não há prova de E2E com dois tenants.
- **PRÓXIMO BLOCO: P12.2 — pesquisa rápida pós-agendamento**: contrato de convites/token opaco e expiração, formulário público que não revela cliente/reserva, escrita idempotente de resposta, disponibilidade após confirmação da reserva, sem bloquear o agendamento, acesso administrativo às respostas e métricas iniciais. Validar banco remoto/migrations antes de criar schema. Entregar blocos substanciais, sem disparar emails/WhatsApp reais.
- **P12.3:** pesquisa de satisfação **após atendimento concluído**, configurável, com envio manual elegível.
- **P12.4:** automação diária desligada por padrão, fila/outbox, limites, opt-out e relatórios. Sem ativação real sem aprovação.
- **P12.5:** homologação multitenant/E2E. Nunca confundir deploy READY ou CI com homologação.
- **RETORNAR a E1/E2 depois conforme checkpoints do Plano Mestre:** Design System visual de modais, painéis laterais e telas; documentos legais definitivos; onboarding guiado do tenant; desativação segura de serviços e profissionais; administração de agenda. E4/E5 ficam no backlog rastreado.

## 3. Estado de Portal e WhatsApp
- Portal: PRs #63–#72 e consolidação #71 com checks; existe histórico técnico em `docs/E1-PORTAL-VALIDACAO-CONSOLIDADA-2026-10-22.md`. O usuário decidiu realizar **homologação funcional do portal posteriormente**. Não reabrir sem defeito evidenciado.
- WhatsApp/Evolution: PR #73 e rodadas posteriores de auditoria; checklist consolidado em `docs/operacao/WHATSAPP-VALIDACAO-GLOBAL-2026-10-23.md`. Existência dos controles no código **não comprova E2E com mensagem real**; testes externos exigem número isolado de homologação. Não reiniciar ciclos genéricos de WhatsApp salvo incidente crítico ou ordem expressa.
- E1 LGPD: avisos técnicos e páginas provisórias; política e termos finais ainda dependem de dados formais do controlador e revisão jurídica. Não apresentar textos pendentes como aprovados.
- E1/E2 não foram declaradas encerradas; preservar decisões e aceites visuais já dados.

## 4. Regras não negociáveis de execução
1. Sempre **ler o arquivo relevante antes de desenvolver ou corrigir**; usar Plano Mestre, especificação atual e este handoff.
2. Trabalhar em **análise -> implementação/ajustes -> testes reais disponíveis -> CI -> PR/merge -> verificação Vercel**, mantendo migrations e Git alinhados.
3. Agrupar correções de um fluxo em uma rodada consolidada; evitar inúmeros PRs cosméticos, doc-only ou revisões da mesma tela sem evidência.
4. Isolamento multitenant e RLS, papéis owner/admin, rate limits, transações e idempotência; não publicar service role nem dados pessoais em respostas públicas.
5. Não disparar mensagens, pesquisas ou cobranças reais nem mexer em números/instâncias compartilhados sem homologação/autorização específica.
6. Não alterar visual homologado incidentalmente; identidade principal diferenciada (laranja/lilás/cinza; evitar azul/verde).
7. Relatar separadamente **implementado**, **CI aprovado**, **deploy READY**, **teste E2E feito** e **homologado pelo proprietário**.
8. Usuário quer ritmo acelerado, entregas prontas e continuidade sem repetir perguntas já resolvidas.

## 5. Roteiro exato do novo chat
1. Ler este handoff, `docs/PLANO-MESTRE-E-ORDEM-DE-EXECUCAO-2026-10-23.md` e `docs/E3-PESQUISAS-POS-AGENDAMENTO-E-ATENDIMENTO.md`.
2. Consultar HEAD da branch `main`, deploy da Vercel, migrations e schema relevantes do Supabase; reconciliar qualquer commit posterior ao PR #101.
3. Examinar a base de templates e perguntas já criada antes de estender schema. Evitar duplicar tabelas ou recadastrar migrations.
4. Entregar **P12.2** em um PR funcional, com API e formulário público protegidos, testes de token inválido/expirado, resposta duplicada e tenant cruzado; não bloquear reserva nem ativar disparo de comunicação.
5. Após CI verde, fazer merge e verificar `READY`; registrar estado e próxima ação no Plano Mestre e na especificação E3.
6. Manter checklist de homologação real do Portal e WhatsApp pendente para o proprietário/teste isolado, sem dizer que passou.

## 6. Limites de comprovação deste handoff
Esta transição consultou repositório e Vercel, **não executou testes E2E autenticados, mensagens reais, provas de envio de pesquisas, nem inspeção SQL remota do estado atual**. O próximo chat deve confirmar as condições que dependem do estado remoto em vez de inferi-las da existência de migrations.
