# Kyra Atende — Plano mestre de trabalho e ponto de retomada
**Reconciliado em:** 23/10/2026
**Estado:** diretriz operacional ativa para planejamento; não declara funcionalidades concluídas sem evidência.

## 1. Hierarquia das fontes e regras de continuidade
1. **Escopo de produto:** documento original do proprietário, `Melhorias Kyra atende.docx`, com 18 pedidos, preservado na referência `docs/PROJETO-EVOLUCAO-POS-HOMOLOGACAO.md`. O arquivo DOCX original foi localizado nos arquivos da conversa/projeto, não está versionado neste repositório.
2. **Organização por etapas:** `docs/PROJETO-EVOLUCAO-POS-HOMOLOGACAO.md`. Seu aviso inicial de backlog não deve ser interpretado como proibição perpétua: E1 e partes de E2/E3 foram trabalhadas depois. As decisões mais recentes do proprietário determinam o prosseguimento.
3. **Evidência de execução:** PRs, código, migrations e documentos de aceite. Existência de rota ou CI verde não significa homologação real.
4. **Riscos e homologações:** `docs/PLANO-DE-CONTINUIDADE-E-PENDENCIAS.md`, `docs/E3-REVISAO-CONSOLIDADA-E-ACEITE-2026-10-23.md` e `docs/operacao/WHATSAPP-VALIDACAO-GLOBAL-2026-10-23.md`. São trilhos de qualidade, **não a lista exclusiva de novas entregas**.
5. **Esta página:** índice de retomada. Em conflito de prioridades, seguir a orientação expressa mais recente do proprietário e registrar alteração no plano.

## 2. Diagnóstico do desvio de execução
Após o ciclo de melhorias do Portal, a continuidade passou a gerar pequenos PRs de testes, conexão e rate limit do WhatsApp. Isso não atendia à ordem de construção solicitada: **item original 12 — pesquisas pós-agendamento e pós-atendimento**. O proprietário determinou interromper tal sequência e reorganizar o trabalho. Logo, **não iniciar novas rodadas genéricas de homologação de Portal/WhatsApp sem evidência de defeito crítico**. Homologação real dessas frentes continua pendente e separada do desenvolvimento de novos módulos.

## 3. Matriz completa dos 18 pedidos originais
| Item | Pedido original | Etapa do roadmap | Situação / próxima ação |
|---|---|---|---|
| 01 | E-mails do Supabase | E1 | Estrutura existente; validar templates reais quando em homologação |
| 02 | Login | E1 | Fluxo existente, correções de acesso realizadas; evitar reabrir sem defeito |
| 03 | Refazer landing | E5 | Evolução visual/comercial futura |
| 04 | Cores/layout/Design System | E1 | Componentes e revisões parciais; manter backlog residual |
| 05 | Papel da Kyra IA | E3/E5 | Chat e IA WhatsApp existentes; especificação funcional de papéis pendente |
| 06 | PWA mobile | E1 | Revisões e aceite visual anteriores; E2E final sob demanda |
| 07 | Privacidade/Termos/LGPD | E1 | Avisos existentes; documentos jurídicos definitivos pendentes |
| 08 | Mensagens/diálogos do sistema | E1 | Padrões parciais; homologar conforme telas evoluírem |
| 09 | Desativação de profissional com impacto em reservas | E2 | Construção funcional não comprovada completa; backlog ativo |
| 10 | Desativação de serviço com impacto em reservas | E2 | Construção funcional não comprovada completa; backlog ativo |
| 11 | Onboarding guiado do usuário da empresa | E2 | Diferente do provisionamento Superadmin; módulo a construir |
| **12** | **Pesquisa rápida após agendar + satisfação após atendimento** | **E3** | **PRÓXIMA CONSTRUÇÃO; especificação em `docs/E3-PESQUISAS-POS-AGENDAMENTO-E-ATENDIMENTO.md`** |
| 13 | Agendamento recorrente | E4 | Módulo novo ainda no backlog |
| 14 | Catálogo de integrações | E4 | Discovery/construção; não prometer conectores inexistentes |
| 15 | Remetente de e-mail da empresa | E4 | Depende de verificação de domínio e SPF/DKIM/DMARC |
| 16 | Administração rápida de agendas | E2/E4 | Ações em lote e prévia de impacto a construir |
| 17 | Nova experiência da tela de agendamentos | E4 | Redesenho/protótipo e posterior construção |
| 18 | Portal do Cliente e família Kyra | E3/E5 | Base de portal existente; remarcação/cancelamento e expansão institucional pendentes |

**Atenção:** o nome `docs/E2-IA-LIMITES-FINANCEIROS-VALIDACAO-2026-10-23.md` é um documento técnico de controles de IA; **não redefine a Etapa E2 do roadmap original**, que trata onboarding e operação segura. Similarmente, revisões parciais da E3 não concluem o item 12.

## 4. Sequência de execução corrigida
**Agora — E3/12: pesquisas**: desenhar, construir e testar os dois fluxos distintos descritos no pedido original; entregar módulo de templates/perguntas, formulário público, persistência e disparo seguro. Preservar etapa por etapa até homologação funcional.

**Na sequência — concluir o restante dos módulos abertos da E3**: papel de Kyra IA e evoluções autorizadas do Portal, evitando refazer funcionalidades homologadas. Trabalhar em ordem definida junto ao proprietário, sem absorver automaticamente toda pendência técnica de infraestrutura.

**Depois — E2 remanescente e E4**: onboarding guiado do tenant; desativação segura de profissional/serviço; operações de agenda; recorrência; integrações; remetente por domínio; redesenho de agendamentos. **E5** contempla nova landing e família Kyra. A ordem relativa entre esses épicos após pesquisas deve ser explicitada no plano, não inferida de PRs anteriores.

**Trilho paralelo:** segurança, WhatsApp/Evolution, IA financeira, Asaas, LGPD e testes reais. Tratar defeitos críticos quando identificados, mas não usar checklists de homologação como substitutos das entregas de produto.

## 5. Disciplina de execução daqui em diante
- Antes de escrever código, ler **este documento, o roadmap de 18 itens e a especificação do épico atual**.
- Cada ciclo deve entregar uma parte utilizável da **funcionalidade planejada** (schema/RLS, APIs, UI, automação, testes), agrupando análise, correção, CI e commit; evitar PRs triviais sem incremento de produto.
- Dados e fluxos de pesquisas devem isolar tenants, usar link/token não enumerável, não revelar dados de cliente e obedecer limites/opt-out dos canais.
- Não criar envios reais nem ativar automação para clientes até aprovação funcional, legal e de comunicação.
- Separar claramente: `planejado`, `implementado`, `CI aprovado`, `publicado`, `homologado E2E`.
- Para cada entrega, atualizar o estado do item do roadmap e a próxima ação. Não retomar por iniciativa própria a auditoria do WhatsApp quando o próximo item aprovado for pesquisa.


## 6. Retorno obrigatório a E1/E2 e redefinição visual (decisão de 23/10/2026)

**Decisão expressa do proprietário:** a continuidade da E3 **não encerra E1 nem E2**. Depois das entregas de produto já priorizadas, há uma etapa obrigatória de retomada para construir o que permaneceu ausente e homologar o que estiver apenas parcialmente implementado. Não marcar itens como concluídos apenas por CI, existência de rota ou documentação.

### E1 — pendências a retomar
- Identidade visual e **Design System revisado**, inclusive padrões de **modais centrais, painéis laterais, confirmações e formulários em tela**, com componentes reutilizáveis;
- Definir dimensões, espaçamentos, tipografia, tokens, badges, seções, estados de carregamento/erro, foco/teclado, acessibilidade, responsividade e comportamento mobile; prototipar e obter aceite visual **antes** de aplicar amplamente;
- Rever telas prioritárias do sistema contra o padrão aprovado, evitando alterações fragmentadas em produção;
- Finalizar textos legais de Termos, Privacidade/LGPD, contatos e processos pendentes somente após revisão competente;
- Validar templates de e-mail e pontos residuais de autenticação/PWA em ambiente adequado.

### E2 — pendências a construir
- Onboarding guiado **do usuário da empresa/tenant**, distinto do provisionamento de Superadmin;
- Desativação de profissionais e de serviços com avaliação do impacto nas reservas, opções seguras, avisos e auditoria;
- Operações administrativas de agenda e outros itens E2 que a matriz de 18 pedidos classificar como incompletos;
- Testes de isolamento multiempresa, concorrência, permissões e regressão em cada implementação.

### Ordem e checkpoints
1. **Agora:** E3 / item 12, começando por P12.1 (fundação de pesquisas), depois jornadas, relatórios e homologação conforme a especificação.
2. **Checkpoint após o item 12:** atualizar matriz dos 18 pedidos com status e evidências; decidir a ordem relativa dos demais itens E3 e o retorno a E1/E2, sem perder nenhum item.
3. **Retomada formal de E1/E2:** realizar a construção pendente por épicos completos, com o **Design System de modais e telas como frente transversal definida antes da reformulação visual em lote**.
4. **E4/E5:** manter recorrência, integrações, remetentes, agendamento redesenhado e landing no backlog, respeitando dependências e prioridade explicitamente acordada.

**Regra de proteção:** não considerar a auditoria de WhatsApp, Portal, E1 ou E2 encerrada funcionalmente sem evidências de homologação real; isso também não deve bloquear indefinidamente o avanço das novas funcionalidades aprovadas.

## 7. Ponto de retomada atualizado — 23/10/2026, PR #101
- **Último commit `main` observado:** `88b130f051308818071da509f440b82cbae696f6` (merge PR #101 — ciclo de vida dos modelos de pesquisas). **Deploy `READY`**, verificado em 23/10/2026. Revalidar o estado na próxima sessão antes de escrever.
- **Implementado no código:** migration `20261023044642_e3_survey_template_foundation.sql` com modelos/perguntas versionados; `app/api/surveys/templates/route.ts` GET/POST/PATCH com checagem de autorização; `app/(dashboard)/pesquisas/SurveyTemplatesClient.tsx` e rota de página; criar rascunho, publicar/pausar e copiar perguntas para nova versão. A existência da migration não substitui conferência do estado remoto.
- **Próxima execução de produto:** continuar o **item 12** com **P12.2 — pesquisa rápida após agendar**, incluindo convites/token seguro, resposta pública, persistência e visualização básica, de forma incremental com RLS/isolamento, sem bloquear a reserva.
- **P12.3–P12.5 pendentes:** pesquisa pós-atendimento, envio manual, automação diária (desligada até aceite), relatórios e homologação E2E real; não declarar E3 completa.
- **E1 e E2 seguem abertas** para retomada conforme seção 6. Não substituir o desenvolvimento do item 12 por auditorias repetitivas de Portal e WhatsApp. Essas frentes têm checklist E2E externo pendente.
- **Disciplina:** a fonte prioritária da próxima sessão é `docs/HANDOFF-NOVO-CHAT-2026-10-23.md`, seguida deste plano e da especificação E3. Confirmar estado `main`/Vercel/Supabase antes de alterações, executar os dois workflows de CI e só então fazer merge. Não inventar resultados de testes com usuários reais.


## 8. Reconciliação de continuidade após PR #102 (23/10/2026)
- Novo HEAD observado antes desta atualização documental: `25f15a543365efc7a1b2a587beb9c1d23feb1ac9`, merge PR #102. PR #103 havia incorporado o handoff anterior; por isso referências a PR #101 como último HEAD são históricas.
- P12.1 continua presente no código. **P12.2 avançou tecnicamente:** migration `20261023132446_e3_survey_invitations_responses_foundation.sql`, APIs de convite/resposta e formulário público `/pesquisa/[token]` adicionados pelo #102.
- **Próximo passo:** integrar experiência opcional de feedback à confirmação de reserva, administrar respostas/métricas iniciais e validar segurança e testes da fundação. Não presumir migração aplicada remotamente, deploy READY, CI verde ou E2E do #102 sem consulta explícita.
- P12.3–P12.5, retorno a E1/E2 e os demais itens dos 18 pedidos mantêm prioridade e condições descritas nas seções anteriores.
- Ponto de entrada operacional atualizado: `docs/HANDOFF-NOVO-CHAT-2026-10-23.md`. Seção 7 e outras menções a “próxima construção P12.1/P12.2 fundação” descrevem estados históricos e ficam substituídas por esta reconciliação.
