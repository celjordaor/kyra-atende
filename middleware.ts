/**
 * middleware.ts
 * Protege rotas autenticadas e redireciona sessões inválidas.
 * Usa @supabase/ssr para atualizar o token automaticamente a cada request.
 *
 * Rotas de API (/api/*) gerenciam autenticação internamente via requireSession().
 * Apenas rotas públicas especiais de API são listadas aqui para clareza.
 */
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Rotas que não precisam de autenticação
const PUBLIC_PATHS = [
  '/',
  '/login',
  '/cadastro',
  '/recuperar-senha',
]

// Prefixos públicos (regex)
const PUBLIC_PREFIXES = [
  '/agendar/',        // /agendar/[slug] — agendamento público
  '/politica',
  '/_next/',
  '/favicon',
  '/icons/',
  '/sw.js',
  '/manifest',
  '/api/',            // Rotas de API gerenciam autenticação internamente
]

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true
  return PUBLIC_PREFIXES.some(prefix => pathname.startsWith(prefix))
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // Atualiza a sessão (importante: não remover)
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Rota pública ou API — segue em frente
  if (isPublicPath(pathname)) {
    // Se já está autenticado e tenta acessar auth, redireciona ao dashboard
    if (user && ['/login', '/cadastro', '/recuperar-senha'].includes(pathname)) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return supabaseResponse
  }

  // Rota protegida sem sessão → login
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Aplica middleware em todas as rotas exceto arquivos estáticos do Next.
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
