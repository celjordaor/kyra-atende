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
    ],
    // SDKs de servidor (Supabase e Anthropic) não precisam de transformação de imports.
    // Mantê-los fora evita trabalho extra por rota no compilador.
    // web-push tem código nativo — não bundlar em cada Lambda reduz o tracing
    serverComponentsExternalPackages: ['web-push'],

    // Next.js 14.2: esta opção pertence à seção experimental.
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
  },
}

export default nextConfig
