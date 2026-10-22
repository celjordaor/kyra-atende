import { getIcon } from '@/lib/branding/pwa-image'

export const runtime = 'nodejs'
export const dynamic = 'force-static'

export async function GET() {
  return getIcon(512)
}
