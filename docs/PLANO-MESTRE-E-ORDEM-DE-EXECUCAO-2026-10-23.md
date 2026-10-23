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
