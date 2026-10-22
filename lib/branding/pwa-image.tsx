import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

export const runtime = 'nodejs'
export const dynamic = 'force-static'

async function getIcon(size: number) {
  const svg = await readFile(path.join(process.cwd(), 'public/brand/kyra-atende-icon.svg'), 'utf8')
  const source = 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64')
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent' }}>
      <img src={source} alt="" width={size} height={size} />
    </div>,
    { width: size, height: size },
  )
}

export { getIcon }
