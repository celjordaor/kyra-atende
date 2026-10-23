# E2 — IA: validação consolidada dos limites e reconciliação (23/10/2026)

## Evidências verificadas no repositório
- `reserve_ai_chat_quota`: trava transacional por tenant, valida plano e contabiliza reservas concorrentes, inclusive pendentes.
- `finish_ai_chat_quota`: liquida ou libera reserva explicitamente.
- `reserve_ai_monetary`: trava transacional por tenant e soma custo liquidado e reservas abertas.
- `finish_ai_monetary`: registra custo real de tokens, incrementa contador e liquida reserva numa transação.
- `/api/ai/chat`: valida payload, reserva interação antes da chamada ao provedor e, quando `AI_MONETARY_ENFORCEMENT_ENABLED=true`, reserva também o orçamento antes de enviar à Anthropic.
- Painel `/api/superadmin/ai-budgets`: lista reservas em aberto e sinaliza as com mais de 15 minutos; limita resultados a 10 mil e indica truncamento.

## Correções desta rodada
1. Timeout da Anthropic de 20 segundos e `maxRetries:0` para impedir repetição automática de chamadas potencialmente cobradas pelo provedor.
2. No modo legado (sem bloqueio monetário), falha ao persistir lançamento financeiro deixa a reserva de interação pendente e retorna 503. Não concluir silenciosamente consumo sem lançamento.

## Limites de comprovação e pendências
- **O bloqueio monetário depende da variável `AI_MONETARY_ENFORCEMENT_ENABLED=true` e de taxa de câmbio válida.** Não foi confirmado o valor configurado na produção; não afirmar que o teto financeiro está ativo.
- **IA WhatsApp:** o wrapper de geração gera resposta, mas o caminho analisado não demonstra integralmente reserva/liquidação monetária por chamada. A homologação de limites financeiros para IA WhatsApp permanece pendente.
- **Reconciliação:** reservas pendentes são visíveis, mas não foram verificadas execução de limpeza ou conciliação automática com a fatura real da Anthropic. Não liberar reservas de resultado incerto automaticamente; pode ter ocorrido cobrança.
- **Taxa cambial e preço do modelo:** valores no código demandam revisão periódica contra contratos de cobrança do provedor. Não considerar precisão financeira homologada sem esta conferência.
- **Testes concorrentes autenticados:** não executados contra banco real nesta rodada. CI verde não substitui disputa real entre sessões e tenants distintos.
- **Conciliação manual:** revisar claims de interação e reservas financeiras pendentes, verificar no provedor quando possível e registrar decisão antes de liberar/resolver.

## Matriz de teste final E2
1. N chamadas simultâneas ao último crédito: só chamadas dentro do limite podem atingir o provedor.
2. Orçamento mensal próximo do teto: reserva bloqueia extrapolação por concorrência.
3. Falha de rede antes/depois do aceite da Anthropic: claim deve permanecer para conciliação, sem retry automático.
4. Falha na escrita do ledger após resposta: não concluir silenciosamente a reserva.
5. Falha na liquidação monetária: reserva aberta e sinalização visível.
6. Limite zero, plano ilimitado, virada mensal e dois tenants diferentes.
7. Resposta vazia e tokenização real vs. estimativa reservada.
8. IA WhatsApp: contabilização completa por tenant antes de liberar limite financeiro geral.

**Status:** análise e correções pontuais executadas; validação técnica de CI sujeita ao PR; aceite E2 financeiro completo depende de execução dos casos E2E, configuração de produção e reconciliação real.
