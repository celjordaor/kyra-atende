/**
 * app/auth/callback/route.ts
 * Troca o code por uma sessão, garante o provisionamento do tenant e redireciona.
 */
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import { ensureTenantForUser } from '@/lib/provision-tenant'

function safeNextPath(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return '/dashboard'
  }
  return value
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = safeNextPath(searchParams.get('next'))

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

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (!userError && user) {
        try {
          await ensureTenantForUser(user)
          return NextResponse.redirect(`${origin}${next}`)
        } catch (provisionError) {
          console.error(
            '[auth/callback] provision',
            provisionError instanceof Error ? provisionError.message : 'Falha de provisionamento',
          )
          return NextResponse.redirect(`${origin}/login?error=provision_failed`)
        }
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=link_invalido`)
}
