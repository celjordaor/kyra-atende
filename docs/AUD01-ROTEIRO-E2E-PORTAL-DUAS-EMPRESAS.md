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
