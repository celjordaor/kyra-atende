/** @type {import('next').NextConfig} */
const nextConfig = {
  // ── Type-check e lint: rodam no editor/IDE, não no deploy ─────────────────
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  // ── Otimiza tree-shaking de pacotes pesados ────────────────────────────────
  experimental: {
    optimizePackageImports: [
      'recharts',
      'react-markdown',
      '@supabase/supabase-js',
      '@anthropic-ai/sdk',
    ],
    // web-push tem código nativo — não bundlar em cada Lambda reduz o tracing
    serverComponentsExternalPackages: ['web-push'],
  },

  // ── Reduz tamanho do bundle excluindo binários nativos desnecessários ──────
  outputFileTracingExcludes: {
    '*': [
      'node_modules/@swc/core-linux-x64-gnu',
      'node_modules/@swc/core-linux-x64-musl',
      'node_modules/@esbuild/linux-x64',
      'node_modules/web-push/node_modules',
      'node_modules/jest*',
      'node_modules/ts-node',
    ],
  },
}

export default nextConfig
