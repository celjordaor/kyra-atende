'use client';

import { useEffect } from 'react';

// Registra o Service Worker uma única vez no load da aplicação.
// Inclua este componente no app/layout.tsx (fora de qualquer Layout condicional).
// O SW é registrado silenciosamente — sem prompt de permissão push aqui.
// A permissão push só é solicitada em Configurações → Notificações.
export function SwRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    // Registra na navegação inicial (não bloqueia o carregamento da página)
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => {
          if (process.env.NODE_ENV === 'development') {
            console.log('[SW] Registrado:', reg.scope);
          }
        })
        .catch((err) => {
          if (process.env.NODE_ENV === 'development') {
            console.warn('[SW] Falha no registro:', err);
          }
        });
    });
  }, []);

  return null;
}
