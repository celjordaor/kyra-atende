/**
 * Layout do grupo auth.
 * AuthLayout é aplicado diretamente nas páginas porque cada
 * página tem título e subtítulo próprios (login, cadastro, etc.).
 */
export default function AuthGroupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
