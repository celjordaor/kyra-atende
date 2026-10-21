# E1 — Início autorizado e primeira entrega
**Data:** 21/10/2026  
**Estado:** E1 iniciada; primeira entrega em revisão via PR; não equivale à conclusão da E1.

## Fonte de escopo
`docs/PROJETO-EVOLUCAO-POS-HOMOLOGACAO.md` — E1 abrange identidade visual/Design System, autenticação e templates de e-mail, componentes/formulários, experiência responsiva/PWA, acessibilidade, termos/privacidade e UX de confirmação. A AUD-01 foi encerrada com ressalvas e seus gates externos continuam rastreados no plano de continuidade.

## Inventário inicial comprovado
- Design System existente em `app/globals.css` identificado como v3.2; tokens de marca atualmente azuis.
- Átomos reutilizáveis `components/atoms/Button.tsx` e `components/atoms/FormField.tsx`; layout `components/templates/AuthLayout.tsx`.
- Rotas já existentes: `/login`, `/cadastro`, `/recuperar-senha`, `/nova-senha`, `/cadastro/confirmar` e `/cadastro/concluir`.
- Ponto de atenção de conteúdo: AuthLayout exibia depoimento com pessoa e métrica de 80% não comprovados — retirar para evitar prova social fictícia.
- Preservar regras já homologadas de login, cadastro duplicado, RLS, sessão, e-mail e redirecionamento; não modificar APIs, migrations nem funções financeiras nesta primeira entrega.

## Sequência E1
1. **E1.1 — Baseline de confiança e acessibilidade do Auth:** retirar alegações não verificadas; revisar linguagem dos textos promocionais e legibilidade; checks CI e preview.
2. **E1.2 — Tokens visuais V2:** paleta diferenciada laranja/lilás/cinza (evitar azul/verde na identidade principal), superfícies e contraste; protótipos do login e AppShell; validar identidade em desktop/mobile antes de aplicar globalmente.
3. **E1.3 — Formulários e feedback:** inventário de máscaras, erros, carregamento, CTA, foco e estados; padronizar componentes sem regressão de cadastro/OTP.
4. **E1.4 — E-mails e autenticação:** textos/templates, idioma e entrega dos fluxos existentes, inclusive recuperação; validar links/código reais em sandbox.
5. **E1.5 — Mobile/PWA/acessibilidade:** navegação, componentes em resoluções móveis, instalação/ícones, teclado, leitura assistiva e contrastes; preservar comportamento.
6. **E1.6 — Termos, privacidade e LGPD:** mapear textos, links, consentimento e retenção; submeter conteúdo jurídico à revisão humana antes da publicação.

## Critérios mínimos de saída
- CI TypeScript/lint/build e testes automatizados relevantes aprovados em cada PR.
- Preview visual para UX; testes reais com contas QA para mudanças de auth.
- Não alterar o motor de agendamento, WhatsApp, Asaas ou IA por efeito colateral.
- Documentar status real: preparado, testado em CI, publicado, homologado visualmente, pendente.
- Manter 18 pedidos rastreados no roadmap; não antecipar as etapas E2–E5.

## Primeira entrega E1.1
Mudança exclusivamente de texto informativo em AuthLayout: substituir testemunho não verificado por informação neutra sobre os recursos, sem prometer métrica ou pessoa inexistente. Sem alteração funcional.
