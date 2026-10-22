import LegalReturnLink from '@/components/organisms/LegalReturnLink'

export const metadata = {
  title: 'Política de Privacidade | Kyra Atende',
  robots: { index: false, follow: false },
}

export default function LegalPage() {
  return (
    <main style={{ minHeight: '100dvh', background: 'var(--surface)', padding: 'clamp(24px, 6vw, 64px) 20px', color: 'var(--ink)' }}>
      <div style={{ maxWidth: 740, margin: '0 auto' }}>
        <LegalReturnLink />
        <h1 style={{ fontSize: 'clamp(26px, 5vw, 36px)', margin: '32px 0 12px' }}>Política de Privacidade</h1>
        <div role="status" style={{ padding: 20, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface-2)', lineHeight: 1.65 }}>
          <strong>Documento em revisão — ainda não publicado.</strong>
          <p style={{ margin: '12px 0 0', color: 'var(--ink-soft)' }}>A Política de Privacidade do Kyra Atende está em elaboração e aguarda revisão e aprovação. Até a publicação da versão definitiva, este endereço não contém a política oficial de tratamento de dados pessoais.</p>
          <p style={{ margin: '12px 0 0', color: 'var(--ink-soft)' }}>Esta página é apenas um aviso de disponibilidade. Não substitui o documento jurídico e não estabelece condições contratuais.</p>
        </div>
        <p style={{ marginTop: 24 }}><LegalReturnLink /></p>
      </div>
    </main>
  )
}
