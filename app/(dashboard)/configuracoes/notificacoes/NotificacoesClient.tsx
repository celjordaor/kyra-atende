'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/atoms/Button';
import { usePushNotification, type PushSubscriptionInfo } from '@/lib/hooks/usePushNotification';
import Link from 'next/link';

const NOTIFICATION_TYPES = [
  { key: 'booking_created',   icon: '🗓️', label: 'Novo agendamento',    desc: 'Quando um cliente fizer um agendamento' },
  { key: 'booking_confirmed', icon: '✅', label: 'Confirmação',          desc: 'Quando um agendamento for confirmado' },
  { key: 'booking_cancelled', icon: '❌', label: 'Cancelamento',         desc: 'Quando um agendamento for cancelado' },
  { key: 'booking_reminder',  icon: '⏰', label: 'Lembrete (1h antes)',  desc: 'Uma hora antes de cada atendimento' },
  { key: 'billing_failed',    icon: '💳', label: 'Pagamento falhou',     desc: 'Quando houver problema com sua assinatura' },
] as const

type NotifKey = typeof NOTIFICATION_TYPES[number]['key']
type NotifPrefs = Partial<Record<NotifKey, boolean>>

const PREFS_KEY = 'kyra_notif_prefs'

function loadPrefs(): NotifPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

function savePrefs(prefs: NotifPrefs) {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)) } catch {}
}

interface Props {
  subscriptions: PushSubscriptionInfo[];
}

function StatusBanner({
  permission,
  isSubscribed,
  isIosWithoutStandalone,
}: {
  permission: string;
  isSubscribed: boolean;
  isIosWithoutStandalone: boolean;
}) {
  if (isIosWithoutStandalone) {
    return (
      <div
        id="push-ios-banner"
        style={{
          background: 'var(--brand-dim)',
          border: '1px solid var(--brand)',
          borderRadius: 'var(--r-lg)',
          padding: '16px 20px',
          display: 'flex',
          gap: 12,
          alignItems: 'flex-start',
        }}
      >
        <span style={{ fontSize: 20 }}>📱</span>
        <div>
          <p style={{ fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>
            iPhone detectado
          </p>
          <p style={{ fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.5 }}>
            Para receber notificações no iPhone, abra este site no{' '}
            <strong>Safari</strong> e toque em{' '}
            <strong>Compartilhar → Adicionar à Tela Inicial</strong>.
            Depois acesse novamente para ativar.
          </p>
        </div>
      </div>
    );
  }

  if (permission === 'unsupported') {
    return (
      <div
        style={{
          background: 'var(--surface-3)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-lg)',
          padding: '16px 20px',
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          color: 'var(--muted)',
          fontSize: 14,
        }}
      >
        <span style={{ fontSize: 20 }}>🚫</span>
        Notificações push não são suportadas neste navegador.
      </div>
    );
  }

  if (permission === 'denied') {
    return (
      <div
        style={{
          background: '#FEF2F2',
          border: '1px solid var(--red)',
          borderRadius: 'var(--r-lg)',
          padding: '16px 20px',
          display: 'flex',
          gap: 12,
          alignItems: 'flex-start',
        }}
      >
        <span style={{ fontSize: 20 }}>🔕</span>
        <div>
          <p style={{ fontWeight: 600, color: 'var(--red)', marginBottom: 4 }}>
            Notificações bloqueadas
          </p>
          <p style={{ fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.5 }}>
            Você bloqueou as notificações neste navegador. Para reativar, acesse as
            configurações do navegador e permita notificações para este site.
          </p>
        </div>
      </div>
    );
  }

  if (isSubscribed && permission === 'granted') {
    return (
      <div
        style={{
          background: 'var(--green-faint)',
          border: '1px solid var(--green)',
          borderRadius: 'var(--r-lg)',
          padding: '16px 20px',
          display: 'flex',
          gap: 12,
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: 20 }}>🔔</span>
        <p style={{ fontWeight: 600, color: 'var(--green)' }}>
          Notificações ativadas neste dispositivo
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        background: 'var(--surface-3)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-lg)',
        padding: '16px 20px',
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        color: 'var(--ink-soft)',
        fontSize: 14,
      }}
    >
      <span style={{ fontSize: 20 }}>🔕</span>
      Notificações desativadas neste dispositivo.
    </div>
  );
}

function DeviceRow({
  sub,
  onRemove,
}: {
  sub: PushSubscriptionInfo;
  onRemove: (endpoint: string) => void;
}) {
  const [removing, setRemoving] = useState(false);

  const label = sub.device_label ?? 'Dispositivo desconhecido';
  const date = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).format(new Date(sub.created_at));

  async function handleRemove() {
    setRemoving(true);
    try { await onRemove(sub.endpoint); } finally { setRemoving(false); }
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-md)',
        background: 'var(--surface-2)',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 20 }}>
          {label.toLowerCase().includes('iphone') || label.toLowerCase().includes('safari')
            ? '📱'
            : label.toLowerCase().includes('android')
            ? '🤖'
            : '💻'}
        </span>
        <div>
          <p style={{ fontWeight: 500, color: 'var(--ink)', fontSize: 14 }}>{label}</p>
          <p style={{ fontSize: 12, color: 'var(--muted)' }}>Cadastrado em {date}</p>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        loading={removing}
        onClick={handleRemove}
      >
        Remover
      </Button>
    </div>
  );
}

export default function NotificacoesClient({ subscriptions: initialSubs }: Props) {
  const router = useRouter();
  const {
    permission,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
    removeDevice,
    isIosWithoutStandalone,
  } = usePushNotification();

  const [subs, setSubs] = useState<PushSubscriptionInfo[]>(initialSubs);
  const [testSent, setTestSent] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>({});

  // Carrega preferências do localStorage após mount (client-only)
  useEffect(() => {
    setNotifPrefs(loadPrefs());
  }, []);

  function togglePref(key: NotifKey) {
    setNotifPrefs(prev => {
      const current = prev[key] !== false; // default: ativado
      const next = { ...prev, [key]: !current };
      savePrefs(next);
      return next;
    });
  }

  async function handleSubscribe() {
    await subscribe();
    router.refresh(); // atualiza lista de dispositivos
  }

  async function handleRemoveDevice(endpoint: string) {
    await removeDevice(endpoint);
    setSubs((prev) => prev.filter((s) => s.endpoint !== endpoint));
  }

  async function handleTest() {
    setTestLoading(true);
    setTestSent(false);
    try {
      const res = await fetch('/api/push/test', { method: 'POST' });
      if (res.ok) setTestSent(true);
    } finally {
      setTestLoading(false);
    }
  }

  return (
    <>

      {/* Navegação de abas de configurações */}
      <nav style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', paddingBottom: 0, marginBottom: 8 }}>
        {[
          { href: '/configuracoes',              label: 'Geral' },
          { href: '/configuracoes/assinatura',   label: 'Assinatura' },
          { href: '/configuracoes/notificacoes', label: 'Notificações' },
        ].map(tab => (
          <Link key={tab.href} href={tab.href} style={{
            padding: '8px 16px',
            fontSize: 14,
            fontWeight: tab.href === '/configuracoes/notificacoes' ? 600 : 400,
            color: tab.href === '/configuracoes/notificacoes' ? 'var(--ink)' : 'var(--ink-soft)',
            borderBottom: tab.href === '/configuracoes/notificacoes' ? '2px solid var(--brand)' : '2px solid transparent',
            marginBottom: -1,
            textDecoration: 'none',
            display: 'inline-block' as const,
          }}>
            {tab.label}
          </Link>
        ))}
      </nav>

      <div style={{ maxWidth: 640 }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 600,
              color: 'var(--ink)',
              marginBottom: 8,
              textWrap: 'balance',
            }}
          >
            Notificações
          </h1>
          <p style={{ color: 'var(--ink-soft)', fontSize: 14 }}>
            Configure como e quando você recebe alertas sobre sua agenda.
          </p>
        </div>

        {/* Status banner */}
        <div id="push-status-card" style={{ marginBottom: 24 }}>
          <StatusBanner
            permission={permission}
            isSubscribed={isSubscribed}
            isIosWithoutStandalone={isIosWithoutStandalone}
          />
        </div>

        {/* Erro */}
        {error && (
          <div
            style={{
              background: '#FEF2F2',
              border: '1px solid var(--red)',
              borderRadius: 'var(--r-md)',
              padding: '12px 16px',
              fontSize: 14,
              color: 'var(--red)',
              marginBottom: 24,
            }}
          >
            {error}
          </div>
        )}

        {/* Controles principais */}
        {!isIosWithoutStandalone && permission !== 'unsupported' && (
          <div
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-lg)',
              padding: '20px 24px',
              marginBottom: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              flexWrap: 'wrap',
            }}
          >
            <div>
              <p style={{ fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>
                Notificações neste dispositivo
              </p>
              <p style={{ fontSize: 13, color: 'var(--muted)' }}>
                {isSubscribed
                  ? 'Você receberá alertas quando houver novidades.'
                  : 'Ative para ser notificado de novos agendamentos.'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {isSubscribed && (
                <Button
                  variant="ghost"
                  size="sm"
                  loading={testLoading}
                  onClick={handleTest}
                >
                  {testSent ? '✓ Enviado' : 'Testar'}
                </Button>
              )}
              {isSubscribed ? (
                <Button
                  variant="secondary"
                  size="sm"
                  loading={isLoading}
                  onClick={unsubscribe}
                >
                  Desativar
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  loading={isLoading}
                  disabled={permission === 'denied'}
                  onClick={handleSubscribe}
                >
                  Ativar notificações
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Tipos de notificação */}
        <div
          style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-lg)',
            padding: '20px 24px',
            marginBottom: 24,
          }}
        >
          <p
            style={{
              fontWeight: 600,
              color: 'var(--ink)',
              marginBottom: 16,
              fontSize: 15,
            }}
          >
            Quando notificar
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {NOTIFICATION_TYPES.map(({ key, icon, label, desc }) => {
              const enabled = isSubscribed && notifPrefs[key] !== false;
              return (
              <div
                key={key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 18, width: 24, textAlign: 'center' }}>{icon}</span>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{label}</p>
                    <p style={{ fontSize: 12, color: 'var(--muted)' }}>{desc}</p>
                  </div>
                </div>
                <button
                  onClick={() => isSubscribed && togglePref(key)}
                  aria-label={enabled ? `Desativar ${label}` : `Ativar ${label}`}
                  style={{
                    width: 36,
                    height: 20,
                    background: enabled ? 'var(--green)' : 'var(--border-mid)',
                    borderRadius: 10,
                    position: 'relative',
                    cursor: isSubscribed ? 'pointer' : 'not-allowed',
                    transition: 'background 0.2s',
                    flexShrink: 0,
                    border: 'none',
                    padding: 0,
                    outline: 'none',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: 2,
                      left: enabled ? 18 : 2,
                      width: 16,
                      height: 16,
                      background: 'var(--surface-2)',
                      borderRadius: '50%',
                      transition: 'left 0.2s',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    }}
                  />
                </button>
              </div>
            )})}
          </div>
        </div>

        {/* Lista de dispositivos */}
        <div id="push-devices">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}
          >
            <p style={{ fontWeight: 600, color: 'var(--ink)', fontSize: 15 }}>
              Dispositivos cadastrados
            </p>
            <span
              style={{
                background: 'var(--surface-3)',
                color: 'var(--muted)',
                fontSize: 12,
                fontWeight: 500,
                padding: '2px 8px',
                borderRadius: 99,
              }}
            >
              {subs.length}
            </span>
          </div>

          {subs.length === 0 ? (
            <div
              style={{
                border: '1px dashed var(--border)',
                borderRadius: 'var(--r-lg)',
                padding: '32px 24px',
                textAlign: 'center',
                color: 'var(--muted)',
                fontSize: 14,
              }}
            >
              Nenhum dispositivo cadastrado ainda.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {subs.map((sub) => (
                <DeviceRow
                  key={sub.id}
                  sub={sub}
                  onRemove={handleRemoveDevice}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
