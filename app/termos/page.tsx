import Link from 'next/link'

export const metadata = {
  title: 'Termos de Uso | Kyra Atende',
  robots: { index: false, follow: false },
}

export default function LegalPage() {
  return (
    <main style={{ minHeight: '100dvh', background: 'var(--surface)', padding: 'clamp(24px, 6vw, 64px) 20px', color: 'var(--ink)' }}>
      <div style={{ maxWidth: 740, margin: '0 auto' }}>
        <Link href="/" style={{ color: 'var(--brand)', fontWeight: 600, textDecoration: 'none' }}>← Kyra Atende</Link>
        <h1 style={{ fontSize: 'clamp(26px, 5vw, 36px)', margin: '32px 0 12px' }}>Termos de Uso</h1>
        <div role="status" style={{ padding: 20, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface-2)', lineHeight: 1.65 }}>
          <strong>Documento em revisão — ainda não publicado.</strong>
          <p style={{ margin: '12px 0 0', color: 'var(--ink-soft)' }}>Os Termos de Uso do Kyra Atende estão em elaboração e aguardam revisão e aprovação. Até a publicação da versão definitiva, este endereço não contém termos contratuais para aceite.</p>
          <p style={{ margin: '12px 0 0', color: 'var(--ink-soft)' }}>Esta página é apenas um aviso de disponibilidade. Não substitui o documento jurídico e não estabelece condições contratuais.</p>
        </div>
        <p style={{ marginTop: 24 }}><Link href="/cadastro" style={{ color: 'var(--brand)' }}>Voltar ao cadastro</Link></p>
      </div>
    </main>
  )
}
