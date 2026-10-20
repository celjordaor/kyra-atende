# Kyra Atende

Plataforma SaaS multitenant de atendimento e agendamentos com módulos administrativos, gestão de clientes e profissionais, integração de mensagens WhatsApp/IA e cobrança. **O status de cada módulo deve ser consultado nas evidências**, não inferido da mera existência de código.

## Documentação para desenvolvimento e homologação

- [Plano de continuidade e pendências](docs/PLANO-DE-CONTINUIDADE-E-PENDENCIAS.md) — prioridades, critérios de aceite, itens adiados e limitações documentais.
- [AUD-01 — Evidências de segurança](docs/auditoria/AUD-01-evidencias-rls-componentes.md) — testes de RLS, autorização, integrações, migrations e deploy.
- [Migrations remotas auditadas](docs/auditoria/sql-remoto-aplicado/README.md) — inventário histórico para evitar reaplicações inadequadas.

**Antes de desenvolver:** ler a documentação e verificar se a mudança já foi entregue, se está adiada ou se depende de homologação. Confirmar o projeto Supabase de destino e o histórico remoto de migrations, planejar alterações de banco e manter GitHub sincronizado.

## Stack observada

Next.js 14.2.35 (App Router), React 18, TypeScript, Supabase (Postgres, Auth, RLS), PNPM 9, Vercel, APIs de IA e integrações Asaas/Evolution.

## Execução local

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Qualidade:

```bash
pnpm exec tsc --noEmit --incremental false
pnpm exec next lint --no-cache
```

Workflow: [AUD-01 Quality Gates](.github/workflows/aud-01-quality.yml). Não confundir build Vercel `READY` com aprovação de TypeScript/ESLint.

## Segurança e ambientes

Jamais publicar chaves de `service_role`, segredos de webhook, tokens ou credenciais. A autorização por tenant depende de identidade autenticada e RLS. As operações privilegiadas da plataforma exigem papel Superadmin.

Projeto Supabase de referência de auditoria: `zrszytzlovthyezozqhj`. **Reconfirmar projeto, ambiente e permissões antes de executar migrations, testes ou operações administrativas.** Para homologação, priorizar contas e instâncias descartáveis; não modificar dados reais de clientes.

## Status

AUD-01: **fase técnica passível de encerramento com ressalvas**, sujeita a aprovação responsável; testes HTTP autenticados e comprovação de CI permanecem abertos. Ver plano de continuidade para pendências comerciais, integrações e módulos futuros.
