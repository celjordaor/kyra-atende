// Re-exporta SupabaseAuthGuard como JwtAuthGuard para manter compatibilidade
// com todos os controllers que já importam JwtAuthGuard
export { SupabaseAuthGuard as JwtAuthGuard } from './supabase.guard';
export { AuthUser } from './supabase.guard';
