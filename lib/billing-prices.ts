/** Tabela única de preços para checkout e conciliação Asaas. */
export const PLAN_PRICES: Record<string, Record<string, number>> = {
  essencial:  { monthly: 49, quarterly: 135, semiannual: 258, annual: 468 },
  cresce:     { monthly: 89, quarterly: 246, semiannual: 462, annual: 852 },
  expande:    { monthly: 149, quarterly: 411, semiannual: 780, annual: 1428 },
  enterprise: { monthly: 269, quarterly: 741, semiannual: 1404, annual: 2580 },
}

/** Aceitar somente combinações próprias da tabela de preços (nunca propriedades herdadas). */
export function getPlanPrice(plan: string, period: string): number | null {
  if (!Object.prototype.hasOwnProperty.call(PLAN_PRICES, plan)) return null
  const periods = PLAN_PRICES[plan]
  if (!Object.prototype.hasOwnProperty.call(periods, period)) return null
  const price = periods[period]
  return typeof price === 'number' && Number.isFinite(price) && price > 0 ? price : null
}
