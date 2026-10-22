import Link from 'next/link'

export const metadata = {
  title: 'Informações sobre cookies | Kyra Atende',
  robots: { index: false, follow: false },
}

export default function CookiesPage() {
  return (
    <main style={{ minHeight: '100dvh', padding: 'clamp(24px, 6vw, 64px) 20px', background: 'var(--surface)', color: 'var(--ink)' }}>
      <article style={{ maxWidth: 740, margin: '0 auto', lineHeight: 1.7 }}>
        <Link href="/" style={{ color: 'var(--brand)' }}>← Voltar ao Kyra Atende</Link>
        <h1 style={{ fontSize: 'clamp(26px, 5vw, 36px)', margin: '28px 0 12px' }}>Cookies e armazenamento local</h1>
        <p>O Kyra Atende utiliza mecanismos de sessão para autenticar usuários e manter o acesso à conta. A aplicação usa o Supabase Auth, cujo funcionamento pode envolver cookies de sessão no navegador.</p>
        <p>O inventário completo de cookies, armazenamento local, provedores externos, finalidades e prazos de retenção ainda está em revisão. Esta página é uma informação técnica provisória, não a Política de Cookies definitiva.</p>
        <h2 style={{ fontSize: 20, marginTop: 24 }}>Preferências e consentimento</h2>
        <p>Não apresentamos aqui um botão de aceitar ou rejeitar cookies de rastreamento, pois a verificação e classificação dos serviços opcionais ainda precisa ser concluída. Caso sejam encontrados cookies não necessários dependentes de consentimento, eles deverão ficar desativados até uma escolha válida, com opção de rejeitar e de alterar a decisão.</p>
        <h2 style={{ fontSize: 20, marginTop: 24 }}>Seus dados pessoais</h2>
        <p>A <Link href="/politica-de-privacidade" style={{ color: 'var(--brand)' }}>Política de Privacidade</Link> e os <Link href="/termos" style={{ color: 'var(--brand)' }}>Termos de Uso</Link> ainda aguardam aprovação e publicação. Essas páginas não representam um aceite contratual.</p>
      </article>
    </main>
  )
}
