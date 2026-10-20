# Auditoria consolidada — disponibilidade e agendamentos
Data: 2026-10-20

## Escopo
Fluxos: reserva interna, link público, convite individual de uso único, Portal central, disponibilidade, confirmações, cancelamentos, remarcação e bloqueios administrativos.

## Evidências desta rodada
- GitHub CI no commit `c6a30cb8`: Quality Gates e Static Security Checks aprovados.
- Supabase remoto: 5 tenants, 4 serviços ativos, 4 profissionais ativos, 9 clientes, **zero registros de expediente da empresa e zero memberships do Portal do Cliente** no momento da inspeção.
- Suite SQL de homologação (transação com ROLLBACK) passou em 12 verificações:
  1. Slot configurado aparece disponível.
  2. Reserva pendente ocupa slot.
  3. Duas reservas no mesmo horário são recusadas.
  4. Confirmação mantém slot ocupado.
  5. Motor de remarcação ignora a própria reserva.
  6. Remarcação libera horário antigo.
  7. Remarcação bloqueia horário novo.
  8. Cancelamento libera horário novo.
  9. Bloqueio administrativo geral torna horário indisponível.
  10. Exclusão do bloqueio reabre horário.
  11. Identidade sem vínculo não consegue reservar no Portal.
  12. Reserva pública com duração inválida é rejeitada na transação.
- Papel `authenticated` não executa `create_public_booking_atomic` diretamente.
- Os dados usados para QA foram revertidos integralmente.

## Status
**Aprovado no escopo de testes SQL de regras transacionais. Não homologado ponta a ponta e não certificado para lançamento comercial.**

## Condições reais que ainda precisam ser validadas
1. Configurar expediente em tenant QA; testar HTTP com frontend público e usuários reais de teste, portal com membership verificada e administração.
2. Testar duas requisições HTTP paralelas para mesmo profissional/horário e bloqueio concorrente.
3. Validar códigos OTP do template Supabase Auth e fluxo de ativação, recuperação de sessão, multiempresa.
4. Implementar e validar rate limiting efetivo para endpoints públicos e OTP.
5. Revisar comportamento legado quando o agendamento não seleciona profissional, pois reservas sem profissional não possuem proteção de conflito por profissional.
6. Verificar fuso local, conversão de datas no navegador, dias de expediente, horários de verão e limites da janela de agendamento.
7. Revisar indisponibilidade personalizada, intervalos simultâneos, regras de vinculação serviço/profissional e regressão de agendamentos existentes.
8. Acompanhar deploy Vercel do commit final para confirmar publicação real.

## Decisão recomendada
Encerrar o desenvolvimento estrutural do motor nesta fase como **base validada por SQL/CI**, mantendo aberto um gate de homologação E2E antes de ativação comercial. As pendências não devem ser marcadas como concluídas até evidência correspondente.
