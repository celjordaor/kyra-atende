/**
 * Layout do grupo público.
 * PublicBookingLayout é aplicado diretamente nas páginas porque
 * cada empresa tem seu próprio slug/accentColor vindos dos params.
 */
export default function PublicGroupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
