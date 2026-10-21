# E1 — Checklist de modais e telas intermediárias

A revisão da identidade visual compreende páginas, modais, janelas de confirmação, drawers, popovers, menus, selects pesquisáveis e demais overlays. Não apenas páginas principais.

## Componentes localizados

- `components/organisms/Modal.tsx`: modal base reutilizado, com tamanhos sm/md/lg/xl.
- `components/organisms/BookingFormModal.tsx`: criar/editar agendamento.
- `components/organisms/BookingDetailModal.tsx`: detalhes do agendamento.
- `components/organisms/CompleteModal.tsx`: conclusão.
- `components/organisms/PlanModal.tsx`: planos.

## Critérios de revisão

- Tokens e cores oficiais da Kyra, tipografia e hierarquia.
- Bordas, sombras, overlays, cabeçalho, rodapé e espaçamentos.
- Botões de confirmação, cancelamento e ação destrutiva.
- Estados carregando, sucesso, erro, vazio e bloqueado.
- Mobile: rolagem, altura máxima, teclado aberto e toque.
- Acessibilidade: título único, `aria-labelledby`, foco inicial/devolvido, Tab/Escape.
- Inventariar diálogos `window.confirm`/`alert` e overlays definidos dentro de páginas.
- Manter regras de negócio e operações existentes; priorizar refatoração de base compartilhada com testes.

## Atenção técnica

`Modal.tsx` usa o ID fixo `modal-title` no título. Revisar em mudança isolada com verificação de múltiplos diálogos. A existência dos componentes não significa aceite visual concluído.

Os modais são parte da E1.3 (formulários e feedback) e E1.5 (mobile/acessibilidade).