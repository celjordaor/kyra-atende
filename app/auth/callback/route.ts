/**
 * app/auth/callback/route.ts
 * Supabase redireciona aqui após confirmação de e-mail, OAuth, reset de senha, etc.
 * Troca o `code` por uma sessão e redireciona ao destino final.
 */
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          },
        },
      },
    )

    const { data: exchange, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const user = exchange.user
      // Usuários novos precisam provisionar a empresa após confirmar e-mail.
      // A rota de conclusão valida novamente a sessão no backend.
      const destination = user?.user_metadata?.company && !user?.app_metadata?.tenant_id
        ? '/cadastro/concluir'
        : next.startsWith('/') && !next.startsWith('//') && !next.includes('\\') && !/[\u0000-\u001f]/.test(next) ? next : '/dashboard'
      return NextResponse.redirect(new URL(destination, origin))
    }
  }

  // Código inválido ou expirado → volta ao login com erro
  return NextResponse.redirect(`${origin}/login?error=link_invalido`)
}
