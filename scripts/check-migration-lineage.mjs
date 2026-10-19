/**
 * AUD-01 — fail-closed guard for the pre-reconciliation Supabase migration history.
 *
 * Production has 12 applied migrations with different versions than these
 * six local mirrors. This gate does NOT authorize 'supabase db push':
 * it prevents silent rewriting of the known mirrors and reuse of historical
 * version numbers until formal reconciliation.
 */
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const directory = new URL('../supabase/migrations/', import.meta.url)
const known = new Map([
  ['20261019000600_aud01_restrict_table_destruction_and_public_catalog.sql', 'b7bb1aa728c66ae0eb60a1d4fcaa07d82a208147'],
  ['20261019000700_aud01_same_tenant_relational_integrity.sql', '11653dff5effee41953a3401741127d9f62b67be'],
  ['20261019000800_aud01_lock_billing_usage_whatsapp_writes.sql', '43c43f110674e6436358e2bdfac4efd75c13fa4d'],
  ['20261019000900_aud01_revoke_client_schema_privileges.sql', '8a35f896f816c282b68604fdc146a88a3a03d7ea'],
  ['20261019001000_aud01_pin_function_search_paths.sql', '4e749b0e2739f99f0c9ea2c8a043285cd9e417a3'],
  ['20261019181500_whatsapp_contact_privacy_queue.sql', 'ae21ab777039baeeffed6d46a3291d20429ca906'],
])
const newestAppliedRemoteVersion = '20261019181854'
const files = readdirSync(directory).filter(name => name.endsWith('.sql'))
let failed = false

for (const [name, expected] of known) {
  if (!files.includes(name)) {
    console.error('[AUD-01] Arquivo histórico ausente:', name)
    failed = true
    continue
  }
  const data = readFileSync(new URL(name, directory))
  const actual = createHash('sha1')
    .update(`blob ${data.length}\0`)
    .update(data).digest('hex')
  if (actual !== expected) {
    console.error('[AUD-01] Mirror histórico alterado:', name)
    failed = true
  }
}
for (const name of files) {
  if (known.has(name)) continue
  const match = /^(\d{14})_[a-z0-9_]+\.sql$/.exec(name)
  if (!match || match[1] <= newestAppliedRemoteVersion) {
    console.error('[AUD-01] Migration nova usa versão histórica ou nome inválido:', name)
    failed = true
  }
}
if (failed) {
  console.error('[AUD-01] Bloqueado: revisar histórico remoto e manifesto antes de mudar migrations.')
  process.exitCode = 1
} else {
  console.log(`[AUD-01] Baseline dos ${known.size} mirrors preservado. Isso NÃO comprova reconciliação remota.`)
}
