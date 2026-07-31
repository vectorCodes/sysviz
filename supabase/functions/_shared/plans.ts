export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, webhook-id, webhook-timestamp, webhook-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

/**
 * Plan → Polar product + access length. Product IDs come from env so the same
 * code works across sandbox and production. Prices live in Polar, not here.
 */
export type PlanId = '1m' | '6m' | '12m'

const PLAN_MAP: Record<PlanId, { envKey: string; days: number }> = {
  '1m': { envKey: 'POLAR_PRODUCT_1M', days: 30 },
  '6m': { envKey: 'POLAR_PRODUCT_6M', days: 182 },
  '12m': { envKey: 'POLAR_PRODUCT_12M', days: 365 },
}

export function planConfig(planId: string): { productId: string; days: number } | null {
  const entry = PLAN_MAP[planId as PlanId]
  if (!entry) return null
  const productId = Deno.env.get(entry.envKey)
  if (!productId) return null
  return { productId, days: entry.days }
}

/** Reverse lookup: which plan does a Polar product id belong to? */
export function planByProductId(productId: string | undefined): { planId: PlanId; days: number } | null {
  if (!productId) return null
  for (const [planId, entry] of Object.entries(PLAN_MAP) as [PlanId, { envKey: string; days: number }][]) {
    if (Deno.env.get(entry.envKey) === productId) return { planId, days: entry.days }
  }
  return null
}
