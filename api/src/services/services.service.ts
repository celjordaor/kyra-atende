import { Injectable, HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

export interface ServiceRow {
  id:               string
  tenant_id:        string
  name:             string
  description:      string | null
  duration_minutes: number
  price:            number
  is_active:        boolean
  created_at:       string
}

export interface CreateServiceDto {
  name:              string
  description?:      string | null
  duration_minutes:  number
  price:             number
  is_active?:        boolean
}

export interface UpdateServiceDto {
  name?:             string
  description?:      string | null
  duration_minutes?: number
  price?:            number
  is_active?:        boolean
}

@Injectable()
export class ServicesService {
  constructor(private readonly supabase: SupabaseService) {}

  async findAll(tenantId: string): Promise<ServiceRow[]> {
    const { data, error } = await this.supabase.db
      .from('services')
      .select('id, tenant_id, name, description, duration_minutes, price, is_active, created_at')
      .eq('tenant_id', tenantId)
      .order('name', { ascending: true })

    if (error) throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
    return data ?? []
  }

  async create(tenantId: string, dto: CreateServiceDto): Promise<ServiceRow> {
    const { data, error } = await this.supabase.db
      .from('services')
      .insert({
        tenant_id:        tenantId,
        name:             dto.name,
        description:      dto.description ?? null,
        duration_minutes: dto.duration_minutes,
        price:            dto.price,
        is_active:        dto.is_active ?? true,
      })
      .select()
      .single()

    if (error) throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
    return data
  }

  async update(tenantId: string, id: string, dto: UpdateServiceDto): Promise<ServiceRow> {
    const { data, error } = await this.supabase.db
      .from('services')
      .update(dto)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error || !data) throw new NotFoundException(`Serviço ${id} não encontrado`)
    return data
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const { error } = await this.supabase.db
      .from('services')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (error) throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
  }
}
