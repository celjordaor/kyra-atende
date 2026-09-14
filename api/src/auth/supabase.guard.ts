import {
  Injectable, CanActivate, ExecutionContext,
  UnauthorizedException, Logger,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

export interface AuthUser {
  id: string;
  email: string;
  tenantId: string;
  role: 'user' | 'admin' | 'superadmin';
}

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(SupabaseAuthGuard.name);

  constructor(private readonly supabase: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const authHeader: string = req.headers['authorization'] ?? '';

    if (!authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token não fornecido');
    }

    const token = authHeader.slice(7);

    // Valida o token diretamente com o Supabase (suporta novos Signing Keys)
    const { data: { user }, error } = await this.supabase.db.auth.getUser(token);

    if (error || !user) {
      this.logger.warn(`Token inválido: ${error?.message}`);
      throw new UnauthorizedException('Token inválido ou expirado');
    }

    // Busca profile + tenant_id
    const { data: profile, error: profileError } = await this.supabase.db
      .from('profiles')
      .select('role, tenant_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      throw new UnauthorizedException('Perfil não encontrado');
    }

    const authUser: AuthUser = {
      id: user.id,
      email: user.email ?? '',
      tenantId: profile.tenant_id,
      role: profile.role,
    };

    req.user = authUser;
    return true;
  }
}
