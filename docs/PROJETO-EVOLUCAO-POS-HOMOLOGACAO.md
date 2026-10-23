# Kyra Atende — Projeto de Evolução Pós-Homologação
**Versão:** proposta v0.1, 21/10/2026  
**Estado:** BACKLOG / NÃO INICIAR A EXECUÇÃO ANTES DA CONCLUSÃO DA FRENTE DE AUDITORIA ATUAL  
**Fonte do pedido:** documento entregue pelo proprietário, `Melhorias Kyra atende.docx` (10 páginas, 18 tópicos).  
**Referências internas:** `docs/PLANO-DE-CONTINUIDADE-E-PENDENCIAS.md`, `docs/MATRIZ-ACEITE-FUNCIONAL-2026-10-20.md`, `docs/AUDITORIA-CONSOLIDADA-AGENDAMENTOS-2026-10-20.md`, rotas e componentes do repositório em `main`.

> **ATUALIZAÇÃO DE GOVERNANÇA — 23/10/2026:** este arquivo registra o roadmap original e sua situação histórica de 21/10. O projeto já avançou além da fase de backlog. A ordem **atual** de execução está em [Plano Mestre](PLANO-MESTRE-E-ORDEM-DE-EXECUCAO-2026-10-23.md). Por decisão expressa do proprietário, a próxima construção é o **item 12, pesquisas pós-agendamento e pós-atendimento** ([especificação E3](E3-PESQUISAS-POS-AGENDAMENTO-E-ATENDIMENTO.md)). As condições de auditoria mencionadas aqui devem ser tratadas como controles/pendências paralelos, e não como bloqueio automático de novas construções aprovadas.

## Regras de governança
1. Esta proposta **não altera escopo e prioridade da auditoria atual**; só iniciar após encerramento formal dos pendentes atuais (inclusive Asaas, E2E e segurança).
2. "Existe" = arquivo/rota localizada; **não implica homologação E2E**. "Parcial" = estrutura relacionada verificada com lacunas. "Não evidenciado" = requer inventário adicional antes de afirmar inexistência.
3. Não alterar motor de disponibilidade, reservas, RLS, identidade do portal, cobranças ou mensagens reais sem especificação, rollback e testes de concorrência/multitenancy.
4. Cada frente exige RFC curta, UX aprovado, especificação SQL/RLS, testes automatizados, CI, staging/QA, testes HTTP/GUI e aceite do responsável; migrations e Git sempre sincronizados.
5. Manter compatibilidade com tenant, plano, limites, fuso, notificações, histórico de agendamentos e LGPD.

## Matriz de rastreabilidade dos 18 pedidos
| # | Pedido original resumido | Constatação baseada nas fontes | Lacuna / entrega futura | Prioridade proposta |
|---|---|---|---|---|
| 01 | Ajustar formulários de e-mails Supabase | Auth com rotas de cadastro, confirmação, nova senha e recuperação; documentos atuais ainda pedem homologação de template OTP | Identidade visual, conteúdo, idioma, expiração, deep links e e-mail verificado no portal; teste real do template | P1 |
| 02 | Tela de login | `app/(auth)/login/page.tsx` existe | Auditoria UX, mensagens, acessibilidade, estados, mobile, recuperação e validações; evitar redesenho sem baseline | P2 |
| 03 | Refazer landing page | Existem rota pública e experiência de contratação, mas escopo da landing não foi homologado visualmente nesta análise | Reestruturar proposta de valor, conversão, prova, preços, comparação, FAQ, SEO e acessibilidade | P2 |
| 04 | Cores e layout do sistema | Templates e componentes reutilizáveis existem; matriz de aceite aponta Design System sem homologação | Design System V2, tokens, tipografia, grids, estados, formulários e auditoria tela a tela | P1 transversal |
| 05 | Função do Kyra IA | `/ia`, `/api/ai/chat`, IA WhatsApp e controle comercial parcial existem | Definir papel/limites da Kyra: copiloto do operador, assistente de agendamento, automações; transparência, consentimento, custo, fallback | P1 produto |
| 06 | Ajustar PWA mobile | `public/manifest.webmanifest` e hooks de push existentes | Auditoria instalação iOS/Android, ícones, offline, atualização, safe area, navegação/responsividade, notificações | P2 |
| 07 | Privacidade, termos, LGPD e link de acesso | Não há comprovação de aceite da jornada legal nos documentos revisados | Política de privacidade, termos, cookies quando aplicável, retenção, base legal, controlador/operador, rodapé e links públicos; revisão jurídica | P1 compliance |
| 08 | Tratar mensagem do sistema (imagem de confirmação no WhatsApp) | Há gestão de conexão/desconexão WhatsApp; a imagem do pedido mostra diálogo nativo de confirmação do navegador | Padronizar diálogos internos de confirmação com modal próprio, consequências, carregamento e feedback, sem suprimir prompts de segurança do navegador | P2 |
| 09 | Desativação de profissional com reservas futuras: cancelar+avisar / transferir+avisar opcional / apenas desativar | Gestão de profissionais, agenda, notificações e regras de disponibilidade existem | Assistente de impacto: consulta das reservas futuras pendentes/confirmadas, simulação, transferência com checagem de serviços/slots/conflitos, cancelamento atômico, aviso e trilha de auditoria; regra padrão segura = somente impedir novas reservas | P1 operação |
| 10 | Desativar serviço: cancelar+avisar / desativar mantendo reservas / transferir para outro serviço | Gestão de serviços e reservas existe | Assistente de impacto com 3 decisões; transferência deve validar preço, duração, profissionais, disponibilidade, contratos e notificação; preservar histórico | P1 operação |
| 11 | Onboarding guiado do **usuário da empresa**, distinto do superadmin | Superadmin e configurações existem; onboarding guiado do tenant não foi demonstrado | Checklist persistente por tenant: empresa/horários → serviços → profissionais → clientes/importação → 1ª reserva/link → WhatsApp → notificações → teste final; progresso, retomada, pular etapa e permissões | P1 ativação |
| 12 | Pesquisas pós-agendamento e pós-atendimento (CSAT/formulário e automação) | Não foram localizados módulos específicos homologados; existem agendamento e notificações | Pesquisa rápida pós-reserva e CSAT pós-conclusão; templates editáveis, gatilhos manuais/automáticos, fila idempotente, janela e limites de envio, opt-out e métricas | P1 retenção |
| 13 | Agendamento recorrente | Motor atômico de agendamentos individuais documentado; módulo de séries não evidenciado | Definir séries semanais/mensais, término/quantidade, exceções, feriados, resolução de conflitos por ocorrência, editar uma/todas, cancelamento e comunicação | P2 funcional |
| 14 | Integrações — avaliar catálogo (imagem mostra Google Calendar, Outlook, Zoom, atendimento, RD Station, Mercado Pago, sites, e-mail, API/Webhooks) | WhatsApp/Evolution e Asaas existem; integração genérica de catálogo não foi evidenciada | Priorizar calendário Google/Outlook com sync bidirecional seguro; depois webhooks/API, Zoom e CRM conforme demanda. Não anunciar conectores não implementados | P2 discovery |
| 15 | Enviar e-mail usando domínio/remetente da empresa em vez de alias Kyra; estudar Postmark/Resend | Templates e convites de e-mail existem; propriedade/verificação do domínio por tenant não evidenciada | Subdomínio/domínio do tenant com SPF, DKIM, DMARC, verificação, fallback Kyra e controles antiabuso; NUNCA aceitar remetente livre sem domínio verificado. Estudar Resend existente antes de adicionar Postmark | P2 |
| 16 | Administração rápida de agendas (ações em lote, bloqueios, horários, cancelamentos) | Agenda e disponibilidade/bloqueios já existem e foram parcialmente aceitos | Console de operações com prévia de impacto, bulk seguro, auditoria, confirmação de consequências e filas de aviso; reusar motor atômico | P2 |
| 17 | Redesenhar tela de agendamentos (imagem de formulário em seções) | `/agendamentos` e formulários existentes | Jornada progressiva, datas, cliente, serviço, profissional, participantes, notificações, preço e resumo; protótipo e testes de usabilidade antes de mexer no fluxo | P2 |
| 18 | Portal do Cliente com acesso, agenda, entrada para família Kyra e e-mail de convite | **Base existente:** `/portal` com OTP de e-mail, memberships verificadas, visão de reservas e criar agendamento; documentação aponta pendências de homologação, remarcação/cancelamento e vinculação | Completar jornada de convite e ativação, visualizar/remarcar/cancelar, multiempresa com isolamento, acessibilidade e descoberta da família Kyra em espaço separado. **Evitar envio de senha temporária em texto por e-mail**: preferir OTP/magic link seguro e expiração | P1 evolutivo |

**Observação sobre as imagens do documento:** screenshots (páginas 1, 3–10) são **referências visuais de terceiros**, não evidência de funcionalidades implementadas no Kyra Atende. O item 8 apresenta diálogo de confirmação do navegador; 11 refere-se ao assistente de onboarding; 13 traz editor de recorrência; 16 contém ações em lote; 17 mostra o formulário seccionado; 18, email de convite e portal.

## Alinhamento com o backlog atual / P2 já previsto
- **P0 e P1 antes de começar este programa:** testes HTTP/GUI multitenant e RLS, autenticação/OTP do Portal, proteção antiabuso de APIs públicas, reconciliação de WhatsApp e Asaas, consumo/limites IA em chamadas autenticadas, governança de migrations e deploy.
- **P2 já mapeado:** Design System/UX, homologação dos módulos de onboarding/notificações/relatórios, concorrência de templates e revisão de disponibilidade/agenda. Não duplicar histórias: esta matriz detalha e agrupa os P2, sem marcar automaticamente como concluídos.
- A Agenda em 03/12, dias fechados e o Dashboard receberam aceite funcional do usuário, **não licença para trocar regras transacionais**.

## Benchmark: práticas de produtos de mercado (referências externas, não requisitos copiados)
- **Fresha**: calendário/recursos, perfis de clientes, notificações, formulários e waitlist; aproveitar padrão de visão de impacto e comunicação no agendamento. Fonte: https://www.fresha.com/for-business/features
- **SimplyBook.me**: login de cliente, histórico, remarcar, app e customização de comunicações. Fonte: https://help.simplybook.me/wiki/Custom_Features/en
- **Calendly**: automações de lembrete, confirmação, feedback e follow-up. Fonte: https://calendly.com/help/automations-overview
- **Cal.com**: formulários guiados de roteamento, integração por webhooks e incorporação; avaliar somente a UX relevante a fluxos de serviços. Fonte: https://www.cal.dev/scheduling/feature/routing-forms

## Programa proposto — execução sequencial APÓS auditoria atual

### Portão G0 — Encerrar validações atuais, sem atalhos
**Saídas:** estado do Asaas (checkout, renegociação, eventos negativos em revisão, cancelamento ainda pendente), Evolution e IA registrados; riscos abertos aceitos explicitamente; GitHub CI/produção/Supabase coerentes, documento de pendências assinado. Não abrir sprint visual enquanto riscos de isolamento e cobrança estiverem indefinidos.

### Etapa E1 — Fundações de confiança e Design System (P1 transversal)
**Abrange:** itens 01, 02, 04, 06, 07, 08; UX acessível e estágios de erro/sem dados; política de cores e tokens; padrões de campos e máscaras; linguagem amigável.
**Entregas:** inventário de telas/componentes, biblioteca e tokens V2, protótipos desktop/mobile, legal completo com revisão jurídica e autenticação validada. **Critérios:** nenhuma regressão de auth; WCAG orientativa 2.2 AA; lint/build; e-mail OTP validado; 2 resoluções móveis e desktop com aceite visual.

### Etapa E2 — Onboarding e operação segura (P1)
**Abrange:** 09, 10, 11, 16.
**Entregas:** wizard inicial por tenant; prévia de reservas afetadas; ações atômicas de desativar/transferir/cancelar; console de bloqueio e horário em lote; comunicados com rastreamento. **Critérios:** não perder histórico, conflito retorna 409, sem afetar outro tenant, falha de aviso vira pendência, nenhum envio duplicado.

### Etapa E3 — Relacionamento e Portal (P1)
**Abrange:** 05, 12, 18.
**Entregas:** definição funcional da Kyra IA, pesquisas por gatilho, jornada Portal central com identidade verificada e remarcação/cancelamento. **Critérios:** cliente só acessa seus dados, sem vínculo implícito por celular/e-mail, consentimento de comunicações, reenvio seguro, teste de IA e quotas.

### Etapa E4 — Agendamento avançado e integrações (P2)
**Abrange:** 13, 14, 15, 17 e complemento 16.
**Entregas:** design novo de formulário, agendamento recorrente com exceções, integrações prioritárias, remetente customizado verificável. **Critérios:** séries não quebram bloqueios/duração/profissionais, sync deduplicado, OAuth por tenant, audit trail, verificação de domínio de email e DMARC.

### Etapa E5 — Marca e expansão comercial (P2)
**Abrange:** 03 e aspectos institucionais de 05/18.
**Entregas:** nova landing Kyra Atende, SEO/conversão, integração de navegação com a família Kyra, storytelling comercial sem prometer módulos em desenvolvimento.
**Critérios:** métricas de conversão, LGPD, performance móvel, teste A/B somente após baseline, acessibilidade, textos revistos.

## Trilhos operacionais para cada épico
1. **Descoberta:** histórias e critérios mensuráveis, fluxos as-is/to-be, dependências, matriz de dados e riscos. O usuário aprova o recorte.
2. **UX:** wireframes + protótipos em componentes reais; revisão em desktop/mobile e consulta à documentação do projeto.
3. **Engenharia:** branch pequena por entrega, migration revisada, RLS, logs e idempotência, limites por plano e testes; sem mudança crítica incidental.
4. **Homologação:** CI, deploy preview, SQL com rollback, HTTP com duas empresas e usuários, sandbox de provedores, checks visuais e aceite.
5. **Publicação:** merge condicionado aos gates, alinhamento Git/Supabase, rollback, changelog interno, monitoramento, encerramento do item no plano.

## Decisões de produto que precisam de aprovação antes de detalhar histórias
- Na desativação de profissional/serviço, quem pode transferir/cancelar reservas e se é necessário aceite do cliente?
- Recorrência: antecipar toda a série ou criar em janela contínua? limites por plano e regras para feriados.
- Pesquisas: consentimento e canal permitido; prazo de retenção e perguntas padrão.
- Portal central: convite/verificação por OTP, política de acesso multiempresa e se haverá senha (padrão recomendado: sem senha provisória por e-mail).
- Integrações: priorizar Google Calendar/Outlook ou outros provedores conforme demanda real.
- Remetente próprio: modelo de domínio verificado e responsabilidade pela reputação.

## Resultado e próximo passo
O projeto fica **preparado para planejamento futuro, não autorizado para implementação imediata**. Abrir E1 somente após G0 e aceite explícito deste roadmap. Registrar dependências e evitar reabrir performance de build suspensa por decisão do usuário.
