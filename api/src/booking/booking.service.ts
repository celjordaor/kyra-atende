import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SupabaseService } from '../supabase/supabase.service';
import { PushDispatcher } from '../push/push.dispatcher';

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  });
}

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly push: PushDispatcher,
  ) {}

  /**
   * Promove um cliente de 'lead' para 'active' quando o agendamento é confirmado/concluído.
   * Idempotente: só atualiza se status ainda for 'lead'.
   */
  private async promoteLeadToActive(clientId: string | null, tenantId: string): Promise<void> {
    if (!clientId) return;
    await this.supabase.db
      .from('clients')
      .update({ status: 'active' })
      .eq('id', clientId)
      .eq('tenant_id', tenantId)
      .eq('status', 'lead');
  }

  /** Confirma um agendamento e dispara push */
  async confirm(bookingId: string, tenantId: string): Promise<void> {
    const { data: booking, error } = await this.supabase.db
      .from('bookings')
      .update({ status: 'confirmed' })
      .eq('id', bookingId)
      .eq('tenant_id', tenantId)
      .select('id, start_at, client_id, client_name, services(name)')
      .single();

    if (error || !booking) throw new NotFoundException('Agendamento não encontrado');

    void this.promoteLeadToActive((booking as any).client_id ?? null, tenantId);

    await this.push.dispatch(tenantId, 'booking.confirmed', {
      clientName: booking.client_name,
      service: (booking as any).services?.name ?? 'Serviço',
      bookingId,
    });

    this.logger.log(`Agendamento ${bookingId} confirmado`);
  }

  /** Cancela um agendamento e dispara push */
  async cancel(bookingId: string, tenantId: string): Promise<void> {
    const { data: booking, error } = await this.supabase.db
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', bookingId)
      .eq('tenant_id', tenantId)
      .select('id, start_at, client_name, services(name)')
      .single();

    if (error || !booking) throw new NotFoundException('Agendamento não encontrado');

    await this.push.dispatch(tenantId, 'booking.cancelled', {
      clientName: booking.client_name,
      service: (booking as any).services?.name ?? 'Serviço',
      date: formatDateTime(booking.start_at),
      bookingId,
    });

    this.logger.log(`Agendamento ${bookingId} cancelado`);
  }

  /** Conclui um agendamento: registra dados financeiros e marca como completed */
  async complete(
    bookingId: string,
    tenantId: string,
    dto: {
      price_charged:   number;
      discount?:       number;
      payment_method:  string;
    },
  ): Promise<void> {
    const discount = dto.discount ?? 0;

    const { data: booking, error } = await this.supabase.db
      .from('bookings')
      .update({
        status:          'completed',
        price_charged:   dto.price_charged,
        discount,
        payment_method:  dto.payment_method,
        paid_at:         new Date().toISOString(),
      })
      .eq('id', bookingId)
      .eq('tenant_id', tenantId)
      .eq('status', 'confirmed')
      .select('id, start_at, client_id, client_name, price_charged, discount, services(name)')
      .single();

    if (error || !booking) {
      throw new NotFoundException('Agendamento não encontrado ou não está confirmado');
    }

    void this.promoteLeadToActive((booking as any).client_id ?? null, tenantId);

    const net = (booking.price_charged ?? 0) - discount;

    await this.push.dispatch(tenantId, 'booking.completed', {
      clientName: booking.client_name,
      service:    (booking as any).services?.name ?? 'Serviço',
      amount:     net.toFixed(2),
      bookingId,
    });

    this.logger.log(`Agendamento ${bookingId} concluído — R$ ${net.toFixed(2)}`);
  }

  /** Cron: dispara lembretes 1h antes dos agendamentos (roda a cada 30 min) */
  @Cron('*/30 * * * *')
  async sendReminders(): Promise<void> {
    const now = new Date();
    const oneHourLater  = new Date(now.getTime() + 60 * 60 * 1000);
    const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    const { data: bookings } = await this.supabase.db
      .from('bookings')
      .select('id, tenant_id, start_at, client_name, services(name)')
      .eq('status', 'confirmed')
      .gte('start_at', oneHourLater.toISOString())
      .lte('start_at', twoHoursLater.toISOString());

    if (!bookings?.length) return;

    this.logger.log(`Enviando ${bookings.length} lembretes de 1h`);

    for (const booking of bookings) {
      await this.push.dispatch(booking.tenant_id, 'booking.reminder_1h', {
        clientName: booking.client_name,
        service: (booking as any).services?.name ?? 'Serviço',
        time: formatTime(booking.start_at),
        bookingId: booking.id,
      });
    }
  }

  /** Lista agendamentos com filtros opcionais */
  async findAll(
    tenantId: string,
    opts: { from?: string; to?: string; status?: string } = {},
  ) {
    let query = this.supabase.db
      .from('bookings')
      .select(`
        id, client_id, client_name, client_phone, client_email,
        service_id, professional_id, start_at, end_at, status, created_at,
        price_charged, discount, payment_method, paid_at, notes,
        services(name),
        professionals(id, name),
        clients(status, source)
      `)
      .eq('tenant_id', tenantId)
      .order('start_at', { ascending: false })
      .limit(200)

    if (opts.from)   query = query.gte('start_at', opts.from)
    if (opts.to)     query = query.lte('start_at', opts.to)
    if (opts.status) query = query.eq('status', opts.status)

    const { data, error } = await query
    if (error) throw new Error(error.message)
    return data ?? []
  }

  /** Cria um agendamento com verificação de conflito de horário */
  async create(
    tenantId: string,
    dto: {
      client_id?:       string | null
      client_name?:     string | null
      client_phone?:    string | null
      client_email?:    string | null
      service_id:       string
      professional_id?: string | null
      start_at:         string
      end_at:           string
      notes?:           string | null
    },
  ) {
    let clientName  = dto.client_name ?? ''
    let clientPhone = dto.client_phone ?? null
    let clientId    = dto.client_id    ?? null

    if (clientId) {
      const { data: client } = await this.supabase.db
        .from('clients')
        .select('name, phone')
        .eq('id', clientId)
        .eq('tenant_id', tenantId)
        .single()

      if (client) {
        clientName  = client.name
        clientPhone = clientPhone ?? client.phone ?? null
      } else {
        clientId = null
      }
    }

    if (!clientName.trim()) {
      throw new Error('Nome do cliente é obrigatório.')
    }

    if (dto.professional_id) {
      const { data: conflict } = await this.supabase.db
        .from('bookings')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('professional_id', dto.professional_id)
        .neq('status', 'cancelled')
        .lt('start_at', dto.end_at)
        .gt('end_at', dto.start_at)
        .limit(1)

      if (conflict?.length) {
        throw new Error('Profissional já tem agendamento neste horário.')
      }
    }

    const { data, error } = await this.supabase.db
      .from('bookings')
      .insert({
        tenant_id:       tenantId,
        client_id:       clientId,
        client_name:     clientName,
        client_phone:    clientPhone,
        client_email:    dto.client_email ?? null,
        service_id:      dto.service_id,
        professional_id: dto.professional_id ?? null,
        start_at:        dto.start_at,
        end_at:          dto.end_at,
        notes:           dto.notes ?? null,
        status:          'pending',
      })
      .select('id, client_name, start_at, end_at, status')
      .single()

    if (error) throw new Error(error.message)

    await this.push.dispatch(tenantId, 'booking.created', {
      clientName,
      bookingId: data.id,
    })

    return data
  }

  /** Atualiza campos de um agendamento (edição completa ou só status) */
  async update(
    bookingId: string,
    tenantId: string,
    dto: {
      client_id?:       string | null
      service_id?:      string
      professional_id?: string | null
      start_at?:        string
      end_at?:          string
      notes?:           string | null
      status?:          string
      price_charged?:   number | null
      discount?:        number | null
      payment_method?:  string | null
      paid_at?:         string | null
    },
  ) {
    const patch: Record<string, any> = {}

    if (dto.client_id !== undefined) {
      if (dto.client_id) {
        const { data: client } = await this.supabase.db
          .from('clients')
          .select('name, phone')
          .eq('id', dto.client_id)
          .eq('tenant_id', tenantId)
          .single()
        if (client) {
          patch.client_id    = dto.client_id
          patch.client_name  = client.name
          patch.client_phone = client.phone ?? null
        }
      } else {
        patch.client_id = null
      }
    }

    if (dto.service_id      !== undefined) patch.service_id      = dto.service_id
    if (dto.professional_id !== undefined) patch.professional_id = dto.professional_id
    if (dto.start_at        !== undefined) patch.start_at        = dto.start_at
    if (dto.end_at          !== undefined) patch.end_at          = dto.end_at
    if (dto.notes           !== undefined) patch.notes           = dto.notes
    if (dto.status          !== undefined) patch.status          = dto.status
    if (dto.price_charged   !== undefined) patch.price_charged   = dto.price_charged
    if (dto.discount        !== undefined) patch.discount        = dto.discount
    if (dto.payment_method  !== undefined) patch.payment_method  = dto.payment_method
    if (dto.paid_at         !== undefined) patch.paid_at         = dto.paid_at

    const { data, error } = await this.supabase.db
      .from('bookings')
      .update(patch)
      .eq('id', bookingId)
      .eq('tenant_id', tenantId)
      .select(`
        id, client_id, client_name, client_phone, client_email,
        service_id, professional_id, start_at, end_at, status, created_at,
        price_charged, discount, payment_method, paid_at, notes,
        services(name),
        professionals(id, name),
        clients(status, source)
      `)
      .single()

    if (error) throw new Error(error.message)
    return data
  }

}
