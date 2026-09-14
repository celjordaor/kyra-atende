'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

type PermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

// Converte a VAPID public key de base64url para Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function getBrowserName(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Edg/'))    return 'Edge';
  if (ua.includes('Chrome/')) return 'Chrome';
  if (ua.includes('Firefox/'))return 'Firefox';
  if (ua.includes('Safari/')) return 'Safari';
  return 'Browser';
}

function getOSName(): string {
  const ua = navigator.userAgent;
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iPhone';
  if (ua.includes('Android'))  return 'Android';
  if (ua.includes('Windows'))  return 'Windows';
  if (ua.includes('Mac'))      return 'Mac';
  if (ua.includes('Linux'))    return 'Linux';
  return 'Device';
}

export interface PushSubscriptionInfo {
  id: string;
  endpoint: string;
  device_label: string | null;
  created_at: string;
}

export function usePushNotification() {
  const [permission, setPermission]     = useState<PermissionState>('default');
  const [isSubscribed, setSubscribed]   = useState(false);
  const [isLoading, setLoading]         = useState(false);
  const [error, setError]               = useState<string | null>(null);

  // Detecção iOS sem standalone
  const isIos = typeof navigator !== 'undefined'
    ? /iphone|ipad|ipod/i.test(navigator.userAgent)
    : false;
  const isStandalone = typeof window !== 'undefined'
    ? window.matchMedia('(display-mode: standalone)').matches
    : false;
  const isIosWithoutStandalone = isIos && !isStandalone;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('PushManager' in window)) {
      setPermission('unsupported');
      return;
    }
    setPermission(Notification.permission as PermissionState);
    setSubscribed(localStorage.getItem('kyra_push') === 'true');
  }, []);

  const subscribe = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!('serviceWorker' in navigator)) {
        throw new Error('Service Worker não suportado neste navegador.');
      }

      // Registra e aguarda o SW estar pronto
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      // Pede permissão — só aqui, nunca no load da página
      const perm = await Notification.requestPermission();
      setPermission(perm as PermissionState);
      if (perm !== 'granted') return;

      // Busca VAPID public key do backend
      const vapidRes = await fetch('/api/push/vapid-key');
      if (!vapidRes.ok) throw new Error('Não foi possível obter a chave VAPID.');
      const { publicKey } = await vapidRes.json();

      // Subscreve no Push Manager
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      // Salva no backend via Supabase
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado.');

      // Busca tenant_id do usuário autenticado
      const { data: tenantData } = await supabase
        .from('tenants')
        .select('id')
        .eq('owner_id', user.id)
        .single();
      if (!tenantData) throw new Error('Empresa não encontrada. Contate o suporte.');

      const subJson = sub.toJSON();
      const { error: dbError } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id:      user.id,
          tenant_id:    tenantData.id,
          endpoint:     subJson.endpoint!,
          p256dh:       (subJson.keys as Record<string, string>)['p256dh'],
          auth:         (subJson.keys as Record<string, string>)['auth'],
          device_label: `${getBrowserName()} · ${getOSName()}`,
        }, { onConflict: 'endpoint' });

      if (dbError) throw new Error(dbError.message);

      localStorage.setItem('kyra_push', 'true');
      setSubscribed(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao ativar notificações.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!('serviceWorker' in navigator)) return;

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();

      if (sub) {
        // Remove do backend
        const supabase = createClient();
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('endpoint', sub.endpoint);

        await sub.unsubscribe();
      }

      localStorage.removeItem('kyra_push');
      setSubscribed(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao desativar notificações.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const removeDevice = useCallback(async (endpoint: string) => {
    const supabase = createClient();
    const { error: dbError } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint);

    if (dbError) throw new Error(dbError.message);

    // Se o endpoint removido é o do dispositivo atual, atualiza estado
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub?.endpoint === endpoint) {
        await sub.unsubscribe();
        localStorage.removeItem('kyra_push');
        setSubscribed(false);
      }
    }
  }, []);

  return {
    permission,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
    removeDevice,
    isIos,
    isStandalone,
    isIosWithoutStandalone,
  };
}
