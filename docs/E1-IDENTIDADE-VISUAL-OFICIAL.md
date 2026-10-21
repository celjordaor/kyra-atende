# E1 — Identidade visual oficial Kyra Atende

**Fonte:** nove arquivos de imagem fornecidos pelo proprietário em 21/10/2026.  
**Status:** acervo original preservado na Biblioteca do ChatGPT, em `/Kyra Atende/Identidade Visual Oficial/`. O pacote `Kyra_Atende_Identidade_Visual_Oficial.zip` também contém os originais e derivados. **Os binários ainda não estão no repositório GitHub**; não configurar referências para caminhos inexistentes até importá-los.

## Arquivos e uso previsto
| Arquivo | Tamanho | Aplicação |
|---|---|---|
| `kyra-atende-icone.png` | 356×318, RGBA | Ícone principal; fonte de favicon e PWA |
| `kyra-atende-logo-2.png` | 421×471, RGBA | Logo vertical; login/cadastro, cabeçalho e splash quando aplicável |
| `kyra-atende-log.jpg` | 1060×1008 | Identidade sobre fundo roxo; peças de marca, não favicon |
| `kyra-atende-ia e logo.jpg` | 1408×768 | Composição marca + assistente de agendamentos; seções de produto |
| `kyra-atende-fundo.jpg` | 1408×768 | Painel de referência de segmentos e funcionalidades |
| `kyra-atende-land-01.jpg` | 1060×1008 | Ilustração do painel de agendamentos para futura landing |
| `kyra-atende-land-02.jpg` | 1060×1008 | Ilustração dos segmentos salão, clínica, barbearia para futura landing |
| `kyra-atende-land-03.jpg` | 1060×1008 | WhatsApp com IA e agendamento para futura landing |
| `kyra-insights-avatar.jpg` | 667×667, RGBA | Avatar ilustrativo da IA; confirmar associação à Kyra Atende ou Kyra Insights antes da aplicação no atendimento |

## Derivados no ZIP de ativos
Arquivos PNG transparentes `kyra-atende-icon-{16,32,48,72,180,192,512}.png`, variantes maskable `kyra-atende-maskable-{192,512}.png` e `favicon.ico`, todos produzidos a partir do ícone fornecido, mantendo proporção, sem recriar o desenho. Conservar os originais como fonte de verdade.

## Integração técnica quando importar os binários para o GitHub
1. Importar ícone derivado de 192/512 px para `public/icons/icon-192.png` e `public/icons/icon-512.png`; 72 px para `public/icons/badge-72.png`; favicon ICO para `app/favicon.ico`. O PWA já referencia esses caminhos.
2. Importar logo para `public/brand/kyra-atende-logo.png` (ou nome equivalente versionado) e substituir a letra K genérica no `components/templates/AuthLayout.tsx`, com `alt` acessível e tamanho responsivo. Conferir contraste em fundos claros/escuros.
3. Importar avatar aprovado para `public/brand/kyra-ia-avatar.png` e usar apenas em contextos efetivamente de IA; a imagem recebida chama-se Kyra Insights, portanto validar marca antes de definir em produção.
4. Imagens de landing são insumos para **E5**; não antecipar refatoração da landing durante a E1 sem alinhamento de escopo. Preferir `next/image`, dimensões explícitas e carregamento lazy.
5. Manter recursos legados até existir substituição versionada em Git + deploy READY. Testar PWA (192, 512, maskable, atualização da instalação), favicon e login em mobile e desktop. Nunca embutir arquivos binários enormes em JavaScript/HTML nem referenciar imagens da Biblioteca como URLs públicas.

## Direção da marca
Lilás/violeta, azul-acinzentado e ciano em ilustrações, sobre fundos claros ou roxo profundo; manter o aspecto tridimensional da identidade fornecida. Tokens visuais já propostos na E1.2. Ajustes finais de contraste e variações seguem o aceite visual.


## E1 — Primeira aplicação da marca (21/10/2026)
- PR #21 integrado à `main`, merge `6a13e5b2a36364e592d8cfbc098e066817dca684`, checks Quality Gates e Static Security concluídos com sucesso.
- Ícone **derivado do arquivo oficial fornecido** incluído em `public/brand/kyra-atende-icon.svg` (SVG auto-contido com imagem WebP comprimida para exibição na interface; **não substitui os originais** preservados na Biblioteca).
- `components/templates/AuthLayout.tsx` substitui a letra `K` genérica pelo ícone oficial nas versões desktop e mobile. `app/layout.tsx` anuncia o ícone da marca nos metadados e alinha a themeColor violeta.
- **Ainda não executado:** importação binária dos PNGs PWA 192/512 e favicon.ico, da logo vertical completa e do avatar da IA. As imagens de landing seguem reservadas para a E5. Não alegar que os ícones instalados do PWA foram substituídos nesta PR.
- Deploy de produção `dpl_4UowgRyAyP8JLFxrjYEjGrb3hu6s` visto em `BUILDING` após merge; conferir READY e visualizar login em desktop/mobile para homologação.
