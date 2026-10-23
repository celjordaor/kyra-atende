# E3 · Item 12 — Pesquisas pós-agendamento e pós-atendimento
> **ATUALIZAÇÃO DE EXECUÇÃO — 23/10/2026, após PR #101:** P12.1 tem fundação SQL `20261023044642_e3_survey_template_foundation.sql`, API autenticada `/api/surveys/templates`, tela `/pesquisas` de modelos e perguntas, versões, publicação/pausa e cópia para revisão. Estas funcionalidades constam no código e o commit `88b130f051308818071da509f440b82cbae696f6` foi observado em deploy Vercel `READY`. **O item 12 não está concluído**: faltam convites, tokens e formulários públicos, respostas, gatilhos pós-agendamento/pós-atendimento, envio manual, automação diária, relatórios e testes E2E. **Próxima entrega: P12.2 — jornada de pesquisa rápida pós-agendamento, em partes funcionais seguras.** Não disparar pesquisas reais sem homologação.

**Fonte primária:** `Melhorias Kyra atende.docx`, página 3, item 12.
**Situação:** próximo módulo a construir; **nenhuma pesquisa completa homologada**.
**Referência de ordem:** `docs/PLANO-MESTRE-E-ORDEM-DE-EXECUCAO-2026-10-23.md`.

## 1. Requisito original: são duas jornadas distintas
### A — Feedback rápido **após efetuar o agendamento**
O proprietário pediu um CSAT curto sobre a facilidade de agendar ("fácil de agendar? +/-"), exibido ao final da jornada de reserva / após utilização do link. O objetivo é medir a **experiência de agendamento**, não a satisfação com o serviço ainda não prestado.

**Fluxo proposto para construção:** agendamento efetivamente criado → convite de feedback na confirmação, ou link específico associado à reserva → pergunta simples de facilidade e comentário opcional → persistência da resposta → relatório por tenant. Não bloquear a conclusão da reserva caso a pesquisa falhe.

### B — Pesquisa de satisfação **depois do atendimento realizado**
O pedido inclui criação e edição de formulário e das perguntas; quando o operador marcar o agendamento como `concluído`, poderá enviar a pesquisa, ou deixar uma **automação diária para pesquisas pós-finalização**. Este fluxo mede o atendimento, separado da jornada de marcação.

**Fluxo proposto para construção:** agendamento muda para concluído → elegível para convite manual ou fila de campanha pós-atendimento → envio conforme canal/política escolhida → formulário associado ao atendimento → armazenamento de respostas e indicadores por tenant/profissional/serviço, respeitando isolamento e privacidade.

## 2. Superfícies do novo módulo
- **Configurações > Pesquisas:** criar, editar, publicar e pausar templates por finalidade, com perguntas e ordem; versões para preservar respostas históricas.
- **Agendamentos > Detalhe:** ação de enviar pesquisa quando concluído, com estado de envio e prevenção de disparo repetido.
- **Configurações > Automações da pesquisa:** ativar/desativar processamento diário pós-conclusão, janela de envio, modelo e canal autorizado.
- **Formulário público do respondente:** acesso com token opaco, expiração, respostas limitadas, acessibilidade e sucesso/erro sem revelar cliente.
- **Relatórios de pesquisas:** enviados, entregues quando houver comprovante, respondidos, satisfação e facilidade por período, sem misturar os dois objetivos.

Esses são **recortes funcionais de implementação propostos**, não afirmações de que as páginas existem.

## 3. Modelo de dados a detalhar antes de migration
Tabelas sugeridas: `survey_templates` (tenant, kind, version, active), `survey_questions` (ordem, tipo, obrigatoriedade), `survey_invitations` (tenant, booking, template/version, canal, token hash, status, validade, idempotency key), `survey_responses` e `survey_answers`, além de configurações de automação e log de envio. Revisar nomes finais contra schema do banco antes de migrar.

Regras indispensáveis: RLS por tenant; autoria/verificação em API; tokens não armazenados em claro; indexação de unicidade para convite por reserva/finalidade/campanha; restrição de alteração em respostas históricas; limite por tenant e rate limit público; não armazenar dados sensíveis desnecessários.

## 4. Gatilhos e limites
- **Pós-agendamento:** somente após reserva criada com êxito; pesquisa opcional e não bloqueante.
- **Pós-atendimento:** somente status `completed` (ou equivalente validado no código). Disparo manual explícito ou processamento diário configurável; não gerar convites para cancelados/pendentes.
- Não presumir que WhatsApp ou e-mail são canais automaticamente autorizados. Verificar origem da permissão, opt-out, templates, limite de envio e regulamentos aplicáveis.
- Idempotência transacional para convites e outbox; sucesso duvidoso do provedor fica para conciliação, nunca reenvio cego.
- Responder a um convite uma única vez ou permitir correção apenas com regra definida e auditável.

## 5. Plano de implementação em blocos de produto
**P12.1 — Fundação:** inventariar schema atual de bookings e canais, definir UX e métricas; migration + RLS + APIs de templates e perguntas + testes de isolamento.

**P12.2 — Pesquisa rápida:** CTA após confirmar reserva, formulário público por token, gravação, tela de consulta de respostas e métricas iniciais; verificar idempotência e falha de link.

**P12.3 — Pesquisa pós-atendimento:** ação manual na conclusão, regras de elegibilidade, convites e histórico de envio; formulário de satisfação configurável.

**P12.4 — Automação diária e relatórios:** agendador, fila/outbox, limites, opt-out, retentativas seguras, métricas, filtros, tratamento de falhas.

**P12.5 — Homologação:** testes com tenants isolados, confirmações reais em ambiente QA, duplicidade, expirado, sem consentimento/canal, concorrência e falhas de integração; ativação em produção de modo controlado.

## 6. Critérios de aceite do item 12
1. Pesquisas de **agendamento** e de **atendimento** têm perguntas, gatilhos e indicadores separados.
2. Criar/editar/publicar template por tenant e preservar versão respondida.
3. Responder pelo link público sem fazer login, sem acessar reserva ou dados de outro cliente.
4. Um mesmo agendamento não gera envio duplicado para a mesma finalidade/campanha.
5. Formulário não bloqueia nem desfaz agendamento concluído.
6. Pesquisa pós-atendimento só fica elegível após conclusão, com opção manual e automação diária desligada por padrão até homologação.
7. Contagem e indicadores por tenant, respeitando privacidade, opt-out e limites.
8. CI, build, testes de isolamento/concorrência e deploy do commit publicados com evidências; E2E real separado do CI.

## 7. Pontos a definir antes de ativar envios reais
Escalas e perguntas padrão, prazo de convite, canal (e-mail/WhatsApp), validade/retificação de resposta, política de retenção e opt-out. Essas decisões **não bloqueiam o início do modelo técnico e da UX**, mas impedem que disparos sejam ativados em produção sem revisão.

**Próxima ação única:** iniciar **P12.1**. Não abrir outra série de tarefas de testes do Portal ou WhatsApp sem defeito crítico ou ordem explícita.


## 8. Início técnico de P12.1 — dependências verificadas em código (23/10/2026)
A implementação do módulo seguirá o plano mestre, sem disparos externos até aprovação.

**Referências encontradas no repositório:**
- `supabase/migrations/20261020117000_unify_booking_creation.sql`: `public.create_booking_checked` retorna o UUID de `bookings`, aceita os estados iniciais `pending` ou `confirmed` e faz validação transacional de disponibilidade.
- `supabase/migrations/20261020118000_atomic_public_client_booking.sql`: `public.create_public_booking_atomic` cria a reserva pública e retorna seu UUID; não acoplar o sucesso da reserva à disponibilidade da pesquisa.
- `app/api/public/bookings/route.ts`: entrada pública já possui validações e rate limit; convite para pesquisa somente após confirmação do resultado de reserva, nunca antes da persistência.
- Portal e agendamentos autenticados possuem caminhos próprios; criar serviço compartilhado de emissão de convites, evitando implementar a pesquisa apenas na rota pública.
- Nenhum módulo de pesquisas foi identificado no inventário nominal do repositório; confirmar schema remoto, políticas e nomes antes da migration.

**Contrato para construção do primeiro bloco funcional:**
1. Tabelas tenant-scoped para templates versionados e perguntas ordenadas, com `kind` imutável por versão (`booking_experience` ou `service_satisfaction`).
2. Convites vinculados a tenant + booking + versão, armazenando apenas hash do token; expiração, estados e unicidade por reserva/finalidade/campanha.
3. Respostas vinculadas ao convite válido e às perguntas da versão publicada; impedir gravação duplicada e acesso cruzado; revogação e expiração sem expor dados da reserva.
4. Administração permitida apenas a membros autorizados do tenant; leitura pública exclusivamente por token opaco; nunca publicar a chave service role ao navegador.
5. Começar por templates + APIs + RLS + testes, antes de acrescentar CTA na confirmação e automação. Sem emails, WhatsApp ou mensagens disparadas neste bloco.
6. Testes obrigatórios: tenant A não lê/escreve tenant B; token inválido/expirado; dupla resposta concorrente; criação repetida do convite; template alterado não altera respostas históricas.

**Checkpoint E1/E2:** após o item 12, voltar ao Plano Mestre, seção 6, para priorização do Design System de modais/painéis e das construções operacionais ainda pendentes. Não interpretar o andamento de P12.1 como conclusão da E1 ou da E2.


## 9. Atualização de implementação após PR #102 (23/10/2026)
**Código incorporado a `main` no commit `25f15a543365efc7a1b2a587beb9c1d23feb1ac9`:**
- P12.1: modelos/perguntas versionados, editor e endpoints administrativos (já descritos acima).
- P12.2, fundação: `supabase/migrations/20261023132446_e3_survey_invitations_responses_foundation.sql`; `app/api/surveys/invitations/route.ts`; `app/api/surveys/respond/[token]/route.ts`; `app/pesquisa/[token]/page.tsx` e `SurveyRespondClient.tsx`.

**Próxima entrega funcional:** verificar regras reais desses arquivos e fechar a integração opcional após reserva confirmada, com visualização administrativa e indicadores iniciais; testar token inválido/expirado, resposta duplicada/concorrente, tenant cruzado, UI móvel e falha não bloqueante da pesquisa. Depois avançar a P12.3 (atendimento concluído), P12.4 (envio manual/automação desligada por padrão, outbox, opt-out e relatórios) e P12.5 (E2E/homologação).

**Rigor do status:** esta atualização confirmou o merge e os arquivos via GitHub. Não confirmou o estado das migrations no Supabase, dois workflows de CI para o SHA, deploy READY, envio real ou teste E2E. Nenhum disparo real está autorizado por este documento. Instruções anteriores que diziam “próxima ação P12.1” ou “iniciar P12.2 criando convites” são históricas; seguir esta seção e o handoff atualizado.
