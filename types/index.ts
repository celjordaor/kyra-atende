export type TenantId = string
export type UserId   = string

export interface Tenant {
  id:          TenantId
  name:        string
  slug:        string
  plan:        string
  trial_ends:  string | null
  created_at:  string
}

export interface User {
  id:        UserId
  tenant_id: TenantId
  email:     string
  role:      'user' | 'admin' | 'superadmin'
  name:      string
  avatar?:   string
}

export type BookingStatus = 'confirmed' | 'pending' | 'cancelled'
export type PlanStatus    = 'trial' | 'active' | 'expired' | 'suspended'
