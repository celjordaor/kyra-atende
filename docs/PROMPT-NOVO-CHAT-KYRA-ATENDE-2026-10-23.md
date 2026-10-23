# Prompt de início — novo chat Kyra Atende (23/10/2026)

Continue o desenvolvimento do **Kyra Atende** a partir do estado real do GitHub e da Vercel, sem reiniciar auditorias concluídas nem confundir implementação com homologação.

**Leia obrigatoriamente, antes de alterar código, na branch `main`:**
1. `docs/HANDOFF-NOVO-CHAT-2026-10-23.md`
2. `docs/PLANO-MESTRE-E-ORDEM-DE-EXECUCAO-2026-10-23.md`
3. `docs/E3-PESQUISAS-POS-AGENDAMENTO-E-ATENDIMENTO.md`
4. `docs/PROJETO-EVOLUCAO-POS-HOMOLOGACAO.md` (matriz de 18 pedidos)
5. As migrations e rotas já implementadas do módulo de pesquisas.

**Infra:** repositório `celjordaor/kyra-atende`; branch `main`; Vercel `prj_JIxzGtz8u4yvbvSc3GJJLEhbrf4c`, equipe `team_CKMFW37A7GB9ZJDP9DhmE1N1`; produção `https://www.kyraatende.com.br`; Supabase `zrszytzlovthyezozqhj`. Em 23/10/2026 o merge do PR #102, SHA `25f15a543365efc7a1b2a587beb9c1d23feb1ac9`, estava `READY`; reconfirme o HEAD, o deploy e o histórico remoto das migrations.

**Prioridade autorizada:** avançar **E3 / item 12 — Pesquisas pós-agendamento e pós-atendimento**. P12.1 (templates/perguntas) está no código. O PR #102 iniciou P12.2 com `survey_invitations`, `survey_responses`, geração manual de convite tokenizado, API e formulário público de resposta. **Não recriar essas estruturas.** Próxima entrega: conferir migration remota e segurança (tenant, token inválido/expirado, resposta única/concorrente); conectar pesquisa rápida à confirmação efetiva da reserva de modo opcional e não bloqueante, e expor respostas/indicadores iniciais ao administrador. Não enviar mensagens automaticamente nem ativar canais reais. Em seguida, P12.3 pós-atendimento, P12.4 automação/relatórios desligados por padrão e P12.5 homologação real.

**Regras de execução:** analisar → corrigir/construir incremento funcional → validar esquema/RLS/limites → checks `AUD-01 Quality Gates` e `AUD-01 Static Security & Quality Checks` no SHA exato → PR/merge → deploy READY → atualizar documentação. Agrupar trabalho em PRs substanciais, evitar idas e vindas. Git e migrations sempre coerentes. Usar a skill Supabase antes de qualquer operação de banco. Não modificar UI homologada ou tenant/números WhatsApp ativos sem necessidade. Não publicar termos jurídicos provisórios como finais.

**Pendências preservadas:** Portal do Cliente tem revisão consolidada, mas o proprietário fará homologação funcional depois; WhatsApp/Evolution tem auditoria técnica, mas testes reais com número isolado ainda faltam. E1 não terminou: Design System de modais/painéis e textos jurídicos. E2 não terminou: onboarding guiado do tenant, desativação segura de serviços/profissionais e operações de agenda. Backlog E4/E5 conforme Plano Mestre. Não transformar essas pendências em ciclos genéricos que adiem a E3.

**Status devem ser distintos:** código implementado, checks aprovados, deploy publicado, teste E2E executado e homologado pelo proprietário. Não afirmar testes reais não executados.

**Comece efetivamente pela leitura e verificação, siga para uma entrega de produto da P12.2, não apenas um relatório ou nova pergunta de confirmação.**
