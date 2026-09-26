/**
 * middleware.ts
 * Roteamento de autenticação — sem chamadas de rede.
 *
 * Verifica apenas a presença do cookie de sessão do Supabase (leitura local,
 * zero latência). A validação real do JWT ocorre em requireSession() dentro
 * de cada route handler e em cada Server Component protegido.
 *
 * Rotas de API (/api/*) são totalmente ignoradas aqui — gerenciam auth internamente.
 */
import { NextResponse, type NextRequest } from 'next/server'

// Rotas exatas que não precisam de sessão
const PUBLIC_PATHS = new Set([
  '/',
  '/login',
  '/cadastro',
  '/recuperar-senha',
])

// Prefixos que não precisam de sessão
const PUBLIC_PREFIXES = [
  '/agendar/',
  '/politica',
  '/_next/',
  '/favicon',
  '/icons/',
  '/sw.js',
  '/manifest',
  '/api/',
]

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true
  return PUBLIC_PREFIXES.some(p => pathname.startsWith(p))
}

/**
 * Detecta sessão ativa verificando o cookie do Supabase SSR.
 * Não faz nenhuma chamada de rede — lê só o cookie.
 */
function hasSession(request: NextRequest): boolean {
  return request.cookies.getAll().some(
    c => c.name.includes('-auth-token') && c.value.length > 10,
  )
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const loggedIn = hasSession(request)

  if (isPublicPath(pathname)) {
    // Usuário já autenticado tentando acessar telas de auth → dashboard
    if (loggedIn && (pathname === '/login' || pathname === '/cadastro' || pathname === '/recuperar-senha')) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return NextResponse.next()
  }

  // Rota protegida sem sessão → login
  if (!loggedIn) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
