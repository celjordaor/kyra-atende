import { Controller, Patch, Param, Body, UseGuards, ForbiddenException, NotFoundException } from '@nestjs/common';
import { IsIn } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { SupabaseService } from '../supabase/supabase.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

class UpdateTenantStatusDto {
  @IsIn(['active', 'suspended'])
  status: 'active' | 'suspended';
}

@Controller('superadmin/tenants')
@UseGuards(JwtAuthGuard)
export class SuperadminTenantsController {
  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Suspende ou reativa um tenant manualmente.
   * PATCH /superadmin/tenants/:id/status
   * Body: { status: 'suspended' | 'active' }
   */
  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTenantStatusDto,
    @CurrentUser() user: any,
  ) {
    this.assertSuperAdmin(user);

    // Verifica que o tenant existe
    const { data: tenant, error: fetchErr } = await this.supabase.db
      .from('tenants')
      .select('id, name, plan_status')
      .eq('id', id)
      .single();

    if (fetchErr || !tenant) {
      throw new NotFoundException('Tenant não encontrado');
    }

    const { error } = await this.supabase.db
      .from('tenants')
      .update({ plan_status: dto.status })
      .eq('id', id);

    if (error) throw new Error(error.message);

    return {
      id:          tenant.id,
      name:        tenant.name,
      plan_status: dto.status,
    };
  }

  private assertSuperAdmin(user: any) {
    const role = user?.app_metadata?.role ?? user?.role;
    if (role !== 'superadmin') {
      throw new ForbiddenException('Acesso restrito a superadmins');
    }
  }
}
