# E1 — LGPD, cookies e armazenamento: inventário inicial (22/10/2026)

## Constatado no repositório
- `middleware.ts` verifica presença de cookies de sessão Supabase SSR.
- `lib/supabase/client.ts` instancia `createBrowserClient` do Supabase SSR.
- Não foram identificados no inventário nominal de arquivos componentes próprios de banner de cookies ou gestor de consentimento.
- O `app/layout.tsx` e a landing `app/page.tsx` não exibiram chamadas diretas de pixel/analytics/gtag na inspeção pontual. **Isto não comprova ausência de cookies de terceiros nem equivale a varredura completa de rede.**
- As páginas de Termos e Privacidade são avisos de documento pendente (PR #40), não textos jurídicos vigentes.

## Medida implementada
- Rota pública `/cookies` com informação provisória sobre sessão, escopo de revisão e distinção entre mecanismos necessários e cookies opcionais.
- Links na landing e rodapé da autenticação.
- **Nenhum banner de consentimento fictício e nenhum rastreador novo.**

## Bloqueios de homologação LGPD/cookies
1. Auditoria real das requisições e do armazenamento no navegador sem login, com sessão e no PWA instalado; listar nome, origem, categoria, propósito, duração e terceiros.
2. Revisar outras superfícies (portal, agendamento público, checkout Asaas, WhatsApp, integrações, push/SW), webviews, domínio e subdomínios.
3. Validar controlador e operador por finalidade/tenant, contatos e canais de direitos dos titulares, política de retenção, compartilhamentos, transferências internacionais e tratamentos de crianças, se aplicáveis.
4. Definir hipóteses legais por finalidade com análise jurídica. Não equiparar concordância com Termos ao consentimento para cookies ou ao tratamento de todos os dados.
5. Se houver cookies opcionais baseados em consentimento, implementar bloqueio prévio e painel de escolhas granular, rejeição tão acessível quanto aceitação e revogação, com versão e evidência; teste de rede antes/depois.
6. Revisar e aprovar Política de Privacidade, Termos e conteúdo definitivo sobre cookies antes de apresentar como vigentes.
7. Homologar links e viewport móvel; teste de que cookies de autenticação continuam funcionando sem aceitar categorias não necessárias.

## Referência oficial
ANPD, Guia orientativo Cookies e proteção de dados pessoais: https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia_orientativo_cookies_e_protecao_de_dados_pessoais

**Status:** transparência provisória e links implementados; conformidade jurídica e inventário dinâmico ainda não homologados.

## Homologação de interface — 22/10/2026

O proprietário confirmou a homologação visual/funcional do popup de cookies após a correção de contraste do PR #43. O commit `13d6ae2c0198188d5134dac0fa20809ca7d94c33` alcançou `READY` na Vercel. Este aceite **abrange a interface do aviso**, não substitui o inventário dinâmico de cookies, a aprovação dos documentos legais, nem certifica conformidade integral com a LGPD.

## Continuidade E1 — autenticação

A captura anterior do login indicava ícone quebrado no celular. O `AuthLayout.tsx` apontava para `/brand/kyra-atende-icon.svg`, que encapsula uma imagem WebP em um SVG; para reduzir incompatibilidade no navegador/PWA, alterou-se apenas a referência visual para `/icons/kyra-icon.png`, arquivo existente no repositório. A correção exige confirmação visual após o deploy; não muda credenciais nem fluxos de login.

## Aceite da jornada de cadastro — 22/10/2026

O responsável informou ter realizado e aprovado a jornada de cadastro e primeiro acesso («fiz a jornada. deu tudo certo»). Registrar como **aceite funcional pelo responsável** para o cenário executado. Não implica teste automatizado completo de entrega de e-mails em todos os navegadores, recuperação de senha ou múltiplos tenants.

## Validação de ícone e PWA

O PR #57, commit de merge `efcdc2f24efd4a86ecdeea8ddaf88642001af4a3`, foi confirmado `READY` em produção. Os ícones antigos PNG permanecem fisicamente em `public/icons/` e `public/kyra-icon.png`, embora as referências principais de metadata/manifest/telas tenham sido alteradas. Compatibilidade específica de ícones PWA em dispositivos que não suportem SVG permanece pendente de confirmação visual e geração de variantes PNG a partir da imagem aprovada.

## Homologação de ícones — confirmação do responsável em 22/10/2026

O responsável confirmou «Tudo certo» após a entrega do PR #59 (ícones para favicon e PWA). O deploy de produção do commit `2dbd4415c8e875ab32a93c7abfee47a4ef5f89e5` foi consultado na Vercel e estava `READY`. **Aceite visual registrado para a identidade dos ícones**, sem afirmar testes automatizados em todos os sistemas operacionais ou compatibilidade de todos os navegadores. Manter a homologação e não reabrir esta frente sem regressão documentada.

**Fronteiras de escopo:** aceite dos ícones não encerra validação jurídica de Termos, Política de Privacidade, inventário dinâmico LGPD ou controles opcionais de cookies.

## Revisão da transparência do painel — E1

O controle visível foi alinhado ao que realmente faz: **«Ver detalhes»** abre informações sobre os cookies necessários; não existe escolha granular de categorias opcionais habilitada no painel. Não chamar esta ação de «Personalizar» até que haja opções de consentimento reais e efetivas. A mudança não altera o visual já homologado, a preferência essencial armazenada ou as rotas públicas.

**Ainda não homologado:** inventário dinâmico das requisições e do armazenamento por navegador/ambiente, eventual bloqueio prévio de cookies não necessários e documentos jurídicos definitivos aprovados. O inventário nominal do repositório não é prova da ausência de serviços de terceiros.
