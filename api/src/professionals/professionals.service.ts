import { Injectable, HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { EntitlementsService } from '../entitlements/entitlements.service';

export interface ProfessionalRow {
  id:        string
  tenant_id: string
  name:      string
  email:     string | null
  phone:     string | null
  is_active: boolean
  created_at: string
}

export interface CreateProfessionalDto {
  name:      string
  email?:    string | null
  phone?:    string | null
  is_active?: boolean
}

export interface UpdateProfessionalDto {
  name?:      string
  email?:     string | null
  phone?:     string | null
  is_active?: boolean
}

@Injectable()
export class ProfessionalsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly entitlements: EntitlementsService,
  ) {}

  async findAll(tenantId: string): Promise<ProfessionalRow[]> {
    const { data, error } = await this.supabase.db
      .from('professionals')
      .select('id, tenant_id, name, email, phone, is_active, created_at')
      .eq('tenant_id', tenantId)
      .order('name', { ascending: true })

    if (error) throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
    return data ?? []
  }

  async create(tenantId: string, dto: CreateProfessionalDto): Promise<ProfessionalRow> {
    // Verifica limite de profissionais do plano
    const limit = await this.entitlements.getLimit(tenantId, 'max_professionals')
    if (limit !== 'unlimited') {
      const { count } = await this.supabase.db
        .from('professionals')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)

      if ((count ?? 0) >= (limit as number)) {
        throw new HttpException(
          {
            statusCode: 402,
            message: `Limite de ${limit} profissional(is) atingido. Faça upgrade para adicionar mais.`,
            upgradeRequired: true,
          },
          HttpStatus.PAYMENT_REQUIRED,
        )
      }
    }

    const { data, error } = await this.supabase.db
      .from('professionals')
      .insert({
        tenant_id: tenantId,
        name:      dto.name,
        email:     dto.email ?? null,
        phone:     dto.phone ?? null,
        is_active: dto.is_active ?? true,
      })
      .select()
      .single()

    if (error) throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
    return data
  }

  async update(tenantId: string, id: string, dto: UpdateProfessionalDto): Promise<ProfessionalRow> {
    const { data, error } = await this.supabase.db
      .from('professionals')
      .update(dto)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error || !data) throw new NotFoundException(`Profissional ${id} não encontrado`)
    return data
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const { error } = await this.supabase.db
      .from('professionals')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (error) throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
  }
}
