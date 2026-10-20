import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { createHash } from 'node:crypto'
import { PublicBookingLayout } from '@/components/templates'
import BookingFlow from './BookingFlow'

export const metadata = { referrer: 'no-referrer', robots: { index: false, follow: false } }

interface PageProps {
  params:      { slug: string }
  searchParams: { convite?: string; nome?: string; email?: string; tel?: string }
}

export default async function PublicBookingPage({ params, searchParams }: PageProps) {
  // Não propagar tokens de convite a sites externos via cabeçalho Referer.
  // Consultar apenas pelo slug fornecido; nunca expor a chave service_role ao cliente.
  const supabase = createAdminClient()

  // Busca o tenant pelo slug
  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('id, name, logo_url, slug')
    .eq('slug', params.slug)
    .single()

  if (error || !tenant) notFound()

  // Busca serviços e profissionais ativos do tenant em paralelo
  const [{ data: services }, { data: professionals }, { data: assignments }] = await Promise.all([
    supabase
      .from('services')
      .select('id, name, description, duration_minutes, price')
      .eq('tenant_id', tenant.id)
      .eq('is_active', true)
      .order('name', { ascending: true }),

    supabase
      .from('professionals')
      .select('id, name, avatar_url')
      .eq('tenant_id', tenant.id)
      .eq('is_active', true)
      .order('name', { ascending: true }),
    supabase.from('professional_services').select('professional_id,service_id').eq('tenant_id', tenant.id),
  ])

  // O convite só permite pré-preencher três campos, não autentica o cliente.
  // Links legados com nome/e-mail/telefone na URL não são mais utilizados.
  let prefill: {nome:string;email:string;tel:string}|undefined
  const token = typeof searchParams.convite === 'string' ? searchParams.convite : ''
  if (/^[a-f0-9]{64}$/.test(token)) {
    const tokenHash = createHash('sha256').update(token).digest('hex')
    const { data: invitation } = await supabase.from('booking_invitations')
      .select('client_id').eq('tenant_id',tenant.id).eq('token_hash',tokenHash)
      .is('revoked_at',null).is('consumed_at',null).gt('expires_at',new Date().toISOString()).maybeSingle()
    if (invitation) {
      const { data: client } = await supabase.from('clients')
        .select('name,email,phone').eq('id',invitation.client_id).eq('tenant_id',tenant.id).maybeSingle()
      if (client) prefill={nome:client.name,email:client.email??'',tel:client.phone??''}
    }
  }

  if (searchParams.convite && !prefill) {
    return <PublicBookingLayout companySlug={tenant.slug} companyName={tenant.name} companyLogoUrl={tenant.logo_url ?? undefined}><p role="alert">Este convite foi utilizado, expirou ou foi revogado. Solicite um novo convite à empresa.</p></PublicBookingLayout>
  }

  return (
    <PublicBookingLayout
      companySlug={tenant.slug}
      companyName={tenant.name}
      companyLogoUrl={tenant.logo_url ?? undefined}
    >
      <BookingFlow
        tenantId={tenant.id}
        services={services ?? []}
        professionals={(professionals ?? []).map(p => ({ ...p, serviceIds: (assignments ?? []).filter(a => a.professional_id === p.id).map(a => a.service_id) }))}
        prefill={prefill}
        invitationToken={prefill ? token : undefined}
      />
    </PublicBookingLayout>
  )
}
