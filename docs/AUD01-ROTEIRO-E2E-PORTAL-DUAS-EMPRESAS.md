# AUD-01 — Roteiro E2E Portal com duas empresas
Status: aguardando contas QA com OTP verificado (21/10/2026).

## Evidência
- Supabase: 5 tenants, 6 usuários auth, 0 customer_identities, 0 customer_memberships.
- Portal usa signInWithOtp e verifyOtp.
- claim_customer_invitation exige e-mail confirmado, convite ativo consumido em agendamento e e-mail correspondente.
- Acesso ao histórico é filtrado por pares tenant_id/client_id do usuário.
- Não inserir identidades ou memberships diretamente via SQL.

## Preparação
1. Duas contas de e-mail QA acessíveis a responsáveis, para receber códigos de login. Jamais armazenar OTP, senhas ou tokens em documentos.
2. Duas empresas de homologação A/B, com respectivos clientes e serviços de teste.
3. Gerar e consumir convites legítimos de agendamento, autenticar cada identidade e vincular no Portal.

## Matriz de testes
| ID | Teste | Esperado |
|---|---|---|
| P01 | Overview sem sessão | 401 |
| P02 | Bookings sem sessão | 401 |
| P03 | Claim sem sessão | 401 |
| P04 | Login de QA A com OTP | Sessão confirmada |
| P05 | QA A acessando empresa B sem vínculo | 403 |
| P06 | QA A resgata convite consumido de A | Vínculo com A |
| P07 | QA A consulta overview | Apenas dados de A |
| P08 | QA B tenta reservar na empresa A | 403 |
| P09 | QA A cria reserva válida em A | 201 |
| P10 | Mesma reserva em horário indisponível | 409 |
| P11 | Convite expirado ou e-mail diferente | Negado |
| P12 | OTP incorreto e rate limiting | Negado e limitado |
| P13 | Consulta final de integridade multitenant | 0 vínculos/reservas cruzadas |

## Gate
Sem identidades verificadas e testes HTTP reais, não marcar E2E como aprovado. Manter itens P2 de experiência/Design System no backlog.

## Empresas homologadas pelo responsável (21/10/2026)

- **A:** `babi-moda-plus-s35o` — 0 clientes, 0 serviços/profissionais ativos, 0 reservas, 0 convites, 0 memberships.
- **B:** `tdsoft-btqu` — 4 clientes, 3 serviços/profissionais ativos, 39 reservas, 4 convites, 0 memberships. Dos convites, 1 consumido e válido, 3 não consumidos e válidos. Um convite consumido válido corresponde a cliente com e-mail cadastrado.
- O responsável autorizou usar as duas empresas para homologação, não autorizou envio para contatos reais. Próximo passo: obter duas caixas QA acessíveis e executar autenticação OTP pelo frontend, gerar configuração mínima da Babi pelos fluxos oficiais, convite/booking teste com e-mails QA, sem persistir identidades artificiais por SQL.
- Até autenticação real e vinculação comprovada, o teste de isolamento entre duas sessões continua **bloqueado por pré-requisito**, não reprovado nem aprovado.

## Atualização da empresa Babi — 21/10/2026
- O responsável inseriu dados via sistema; conferência somente leitura: Babi tem 1 cliente, 1 serviço ativo, 1 profissional ativo e 1 agendamento. TDSOFT continua com 4 clientes, 3 serviços, 3 profissionais, 39 agendamentos.
- Nas duas empresas, 0 agendamentos com cliente, serviço ou profissional referenciados em tenant diferente. Este resultado é integridade de dados existentes, **não prova HTTP E2E com sessões distintas**.
- Babi permanece sem convite individual e sem vínculo Portal; as duas empresas têm zero memberships. Para o fluxo E2E, usar convites legítimos e caixas QA acessíveis para OTP; não criar memberships artificialmente.
