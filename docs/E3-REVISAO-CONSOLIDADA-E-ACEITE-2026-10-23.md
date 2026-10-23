# E3 — Revisão consolidada e condições de encerramento

> **Correção da ordem de execução (23/10/2026):** a E3 permanece **incompleta** enquanto o item 12 não estiver construído. Próxima etapa funcional: [pesquisas pós-agendamento e pós-atendimento](E3-PESQUISAS-POS-AGENDAMENTO-E-ATENDIMENTO.md), conforme [Plano Mestre](PLANO-MESTRE-E-ORDEM-DE-EXECUCAO-2026-10-23.md). A transição técnica parcial para E4 registrada abaixo não constitui autorização para pular a pesquisa.\n\n
**Data:** 23/10/2026  
**Fonte de escopo:** `docs/PROJETO-EVOLUCAO-POS-HOMOLOGACAO.md`, Etapa E3 (itens 05, 12 e 18).

## Entregas já localizadas no código
- **Portal:** OTP por e-mail, vínculo por convite e RPC, separação de tenant/cliente, histórico e criação de agendamento; logs e falhas de rede tratados. O endpoint de vínculo agora exige e-mail confirmado explicitamente.
- **Kyra IA:** chat interno `/api/ai/chat`, limite mensal reservado atomicamente e opção de orçamento monetário controlada por configuração. Resposta de IA com `Cache-Control: private, no-store`.
- **Mensageria:** processamento WhatsApp com autorização por contato e controles de quota e auditoria existentes. **Isso não configura por si só pesquisa de satisfação/CSAT.**

## Cobertura de cenários técnicos revisados
1. Portal anônimo ou e-mail não confirmado: não deve ter acesso a histórico, agendamentos ou vínculo de convite.
2. Portal com uma/múltiplas empresas: consultas por vínculos validados e preservação do tenant selecionado; aviso de confirmação inconclusiva não deve acompanhar a troca de empresa.
3. Confirmação de agendamento: trava cliente, verificação de conflito no banco e consulta atualizada; sem alegar idempotência transacional universal.
4. Chat de IA: sessão/tenant, limite de corpo e histórico, reserva de interações, reconciliação e erro de quota; resposta sem armazenamento em cache compartilhado.
5. Cookies/privacidade: páginas legais ainda em revisão; nenhum consentimento de comunicação presumido a partir da autenticação.

## Pendências que impedem marcar E3 integralmente concluída
- **Pesquisa pós-agendamento e CSAT:** não foi encontrado fluxo completo de formulário, templates, gatilhos, fila de disparo idempotente, opt-out, armazenamento de respostas e métricas. Exige desenho funcional e schema/RLS por tenant antes de publicar.
- **Portal — remarcação e cancelamento:** indisponíveis por decisão de segurança até definir elegibilidade, antecedência, conflitos, auditoria, notificações e transações atômicas. Não introduzir UPDATE direto pela API.
- **Kyra IA — escopo do produto:** separar claramente copiloto interno, mensagens automáticas no WhatsApp e agendamento por IA, com políticas de fallback, transparência e despesas homologadas por fluxo.
- **Homologação real:** contas com e-mail confirmado, dois tenants, envios de OTP/WhatsApp, concorrência de agenda e limites de IA dependem de ambiente de teste autorizado. Checks de TypeScript/lint/segurança **não são** execução E2E.

## Decisão de transição para E4
A E3 pode receber **encerramento técnico parcial, com pendências explícitas**, após CI verde e deploy READY do commit exato. Ela **não** pode ser marcada como produto completo ou homologado sem as funcionalidades acima. A E4 deve começar sem ativar cancelamento/remarcação e pesquisas automaticamente, preservando segurança e consentimento.
