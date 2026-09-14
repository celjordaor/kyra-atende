import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

const SELECT_FIELDS = `
  id, name, email, phone, notes, created_at,
  cpf, birth_date, gender, nationality, profession,
  cep, logradouro, numero, complemento, bairro, estado, cidade,
  status, source
`.trim();

@Injectable()
export class ClientsService {
  constructor(private readonly supabase: SupabaseService) {}

  async findAll(tenantId: string, search?: string) {
    let query = this.supabase.db
      .from('clients')
      .select(SELECT_FIELDS)
      .eq('tenant_id', tenantId)
      .order('name', { ascending: true })
      .limit(300);

    if (search?.trim()) {
      const s = search.trim();
      query = query.or(
        `name.ilike.%${s}%,phone.ilike.%${s}%,email.ilike.%${s}%`,
      );
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async create(tenantId: string, dto: Record<string, any>) {
    const { data, error } = await this.supabase.db
      .from('clients')
      .insert({ tenant_id: tenantId, ...this.sanitize(dto) })
      .select(SELECT_FIELDS)
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async update(id: string, tenantId: string, dto: Record<string, any>) {
    const { data, error } = await this.supabase.db
      .from('clients')
      .update({ ...this.sanitize(dto), updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select(SELECT_FIELDS)
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async remove(id: string, tenantId: string) {
    const { error } = await this.supabase.db
      .from('clients')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) throw new Error(error.message);
    return { deleted: true };
  }

  async findById(id: string, tenantId: string) {
    const { data, error } = await this.supabase.db
      .from('clients')
      .select('id, name, phone')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (error) return null;
    return data;
  }

  /** Remove campos vazios para não sobrescrever com null desnecessariamente */
  private sanitize(dto: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [k, v] of Object.entries(dto)) {
      // Mantém null explícito (limpeza de campo) mas remove undefined
      if (v !== undefined) result[k] = v === '' ? null : v;
    }
    return result;
  }
}
