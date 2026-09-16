import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { PublicBookingLayout } from '@/components/templates'
import BookingFlow from './BookingFlow'

interface PageProps {
  params:      { slug: string }
  searchParams: { nome?: string; email?: string; tel?: string }
}

export default async function PublicBookingPage({ params, searchParams }: PageProps) {
  const supabase = createClient()

  // Busca o tenant pelo slug
  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('id, name, logo_url, slug')
    .eq('slug', params.slug)
    .single()

  if (error || !tenant) notFound()

  // Busca serviços e profissionais ativos do tenant em paralelo
  const [{ data: services }, { data: professionals }] = await Promise.all([
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
  ])

  // Dados pré-preenchidos vindos do link enviado por e-mail (da tela de clientes)
  const prefill = {
    nome:  searchParams.nome  ?? '',
    email: searchParams.email ?? '',
    tel:   searchParams.tel   ?? '',
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
        professionals={professionals ?? []}
        prefill={prefill}
      />
    </PublicBookingLayout>
  )
}
