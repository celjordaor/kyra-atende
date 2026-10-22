# E1 — Auditoria das rotas de Termos de Uso e Política de Privacidade

**Data:** 22/10/2026  
**Estado:** bloqueio funcional confirmado; conteúdo jurídico e publicação dependem de revisão pelo responsável.

## Evidência no código

| Origem | Destino utilizado | Resultado da análise |
| --- | --- | --- |
| `app/(auth)/cadastro/page.tsx` | `/termos` | Link presente no texto de concordância, sem rota correspondente no inventário `app/` |
| `app/(auth)/cadastro/page.tsx` | `/politica-de-privacidade` | Link presente no texto de concordância, sem rota correspondente no inventário `app/` |
| `app/page.tsx` (Footer) | `/termos` e `/politica-de-privacidade` | Links públicos presentes, sem páginas correspondentes |
| `app/(auth)/login/LoginClient.tsx` | — | Sem acesso direto identificado a documentos jurídicos |

**Risco:** a jornada de cadastro afirma concordância com documentos que o visitante não consegue consultar pelos links existentes. Não declarar conformidade LGPD ou consentimento validado com base nesses controles.

## Critério de correção

1. Definir e aprovar conteúdo jurídico real dos documentos, responsável legal, identidade do controlador/operador, contato de privacidade, finalidades e bases legais, retenção e direitos do titular.
2. Criar as rotas públicas `/termos` e `/politica-de-privacidade` com título, versão/data de vigência, conteúdo aprovado e leitura responsiva/acessível.
3. Confirmar navegação sem autenticação a partir de Cadastro, Footer da landing e Login (e portal se houver coleta pertinente).
4. Decidir mecanismo de registro de aceite/versão quando aplicável; não introduzir checkbox de consentimento genérico como base legal universal.
5. Executar CI, verificar resposta HTTP sem login, testar em mobile/PWA, registrar aceite e publicar.
6. Tratar versões anteriores e aviso de atualização, quando aplicável.

## Decisão de implementação nesta rodada

**Nenhuma política ou termo fictício foi publicado.** A correção efetiva das rotas permanece bloqueada pela aprovação do conteúdo jurídico. Não remover silenciosamente os links do cadastro nem transformá-los em páginas vazias: isso não resolveria a possibilidade de leitura dos documentos. Esta auditoria documenta o defeito existente sem mascará-lo.

**Próxima entrega:** páginas legais reais, revisão da linguagem de cadastro, links públicos e registro rastreável de versão/aceite conforme decisão jurídica.
