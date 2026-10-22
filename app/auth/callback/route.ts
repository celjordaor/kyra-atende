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

    try {
      const { data: exchange, error } = await supabase.auth.exchangeCodeForSession(code)
      if (!error) {
        const user = exchange.user
        // Novas contas precisam finalizar o provisionamento após confirmar e-mail.
        // Recuperação de senha tem prioridade sobre provisionamento pendente.
        // Apenas destinos internos pré-aprovados podem ser usados.
        const destination = next === '/nova-senha'
          ? '/nova-senha'
          : user?.user_metadata?.company && !user?.app_metadata?.tenant_id
            ? '/cadastro/concluir'
            : '/dashboard'
        return NextResponse.redirect(new URL(destination, origin))
      }
    } catch {
      // Uma indisponibilidade de rede não deve devolver uma página 500 ao usuário.
      return NextResponse.redirect(new URL('/login?error=callback_indisponivel', origin))
    }
  }

  // Código inválido ou expirado → volta ao login com erro
  return NextResponse.redirect(`${origin}/login?error=link_invalido`)
}
