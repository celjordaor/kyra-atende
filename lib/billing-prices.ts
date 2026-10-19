/** Tabela única de preços para checkout e conciliação Asaas. */
export const PLAN_PRICES: Record<string, Record<string, number>> = {
  essencial:  { monthly: 49, quarterly: 135, semiannual: 258, annual: 468 },
  cresce:     { monthly: 89, quarterly: 246, semiannual: 462, annual: 852 },
  expande:    { monthly: 149, quarterly: 411, semiannual: 780, annual: 1428 },
  enterprise: { monthly: 269, quarterly: 741, semiannual: 1404, annual: 2580 },
}
