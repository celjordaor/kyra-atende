# Portal do Cliente — validação consolidada (22/10/2026)

## Escopo inspecionado
- Sessão não autenticada, código OTP, sessão com e-mail confirmado;
- Nenhuma empresa vinculada, empresa única, múltiplas empresas e troca de empresa;
- Convite individual: origem, token, validade, vínculo e erros de rede;
- Histórico, carregamento, nova consulta, preservação da empresa selecionada;
- Serviços, profissionais, datas e horários, inclusive dois profissionais no mesmo horário;
- Registro de agendamento, conflito de disponibilidade, timeout e possível duplicidade.

## Evidências e controles
- A API valida o usuário e o vínculo com o tenant antes de consultar/agendar.
- A função SQL `create_portal_booking` usa trava por tenant/profissional e reconfirma disponibilidade antes do INSERT (código versionado); não foi feita nova migration.
- A UI bloqueia envios concorrentes no cliente, mas **não há idempotência persistente por chave de requisição**. Após falha de rede, não se deve reenviar automaticamente.
- Confirmação de rede inconclusiva fecha o formulário, atualiza histórico e mostra aviso. Se o agendamento não aparecer, o usuário deve confirmar com a empresa.
- Consultas de disponibilidade obsoletas são abortadas e a data de consulta é validada como data do calendário.
- As páginas jurídicas são provisórias e não equivalem a homologação LGPD.

## Testes automatizados desta alteração
Os workflows `AUD-01 Quality Gates` e `AUD-01 Static Security & Quality Checks` são requisitos para integração. Sua aprovação demonstra validação de código/segurança disponível no CI; **não equivale a teste E2E autenticado com mensagens de e-mail reais**.

## Cenários de homologação funcional ainda necessários
1. Conta sem vínculos: mensagem e convite, sem vazamento de empresas.
2. Conta com um vínculo: histórico e agendamento exibidos corretamente.
3. Conta com múltiplos vínculos: alternância não mistura dados ou formulários.
4. OTP válido, inválido, expirado e falha de rede.
5. Convite válido, inválido, expirado e de origem diferente.
6. Consulta de serviços/slots sem disponibilidade e com falha de rede.
7. Dois profissionais no mesmo horário: preservar duas opções distintas.
8. Conflito concorrente: agendamento duplicado não deve ser registrado.
9. Resposta de confirmação indisponível: conferir histórico sem novo POST automático.
10. Confirmar a publicação do commit exato como `READY` na Vercel.

Esses cenários não devem ser marcados como executados apenas porque o CI está verde.
