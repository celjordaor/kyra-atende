/** @type {import('next').NextConfig} */
const nextConfig = {
  // Otimiza tree-shaking de pacotes pesados
  experimental: {
    optimizePackageImports: ['recharts', 'react-markdown', '@supabase/supabase-js'],
  },

  // Reduz tamanho do bundle excluindo arquivos desnecessários do trace
  outputFileTracingExcludes: {
    '*': [
      'node_modules/@swc/core-linux-x64-gnu',
      'node_modules/@swc/core-linux-x64-musl',
      'node_modules/@esbuild/linux-x64',
    ],
  },
}

export default nextConfig
