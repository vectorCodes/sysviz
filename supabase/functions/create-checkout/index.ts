// Creates a Polar checkout for the signed-in user and returns its hosted URL.
// Deploy: supabase functions deploy create-checkout
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Polar } from 'https://esm.sh/@polar-sh/sdk@0.36.0'
import { corsHeaders, planConfig } from '../_shared/plans.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { planId } = await req.json()
    const cfg = planConfig(planId)
    if (!cfg) return json({ error: 'Unknown plan' }, 400)

    // Identify the caller from their JWT.
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } },
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return json({ error: 'Not authenticated' }, 401)

    // Block buying again while an active plan is still valid.
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    const { data: ent } = await admin
      .from('entitlements')
      .select('status, access_until')
      .eq('user_id', user.id)
      .maybeSingle()
    const stillActive =
      ent?.status === 'active' &&
      (!ent.access_until || new Date(ent.access_until) > new Date())
    if (stillActive) {
      return json({ error: 'You already have an active plan. You can buy again after it expires.' }, 409)
    }

    const polar = new Polar({
      accessToken: Deno.env.get('POLAR_ACCESS_TOKEN')!,
      server: (Deno.env.get('POLAR_SERVER') as 'sandbox' | 'production') ?? 'sandbox',
    })

    const appUrl = Deno.env.get('APP_URL') ?? new URL(req.url).origin
    const checkout = await polar.checkouts.create({
      products: [cfg.productId],
      customerEmail: user.email,
      successUrl: `${appUrl}/account?checkout={CHECKOUT_ID}`,
      // Echoed back on the webhook so we know who to grant access to.
      metadata: { user_id: user.id, plan_id: planId },
    })

    // Record the pending purchase (service role bypasses RLS).
    await admin.from('payments').insert({
      user_id: user.id,
      plan_id: planId,
      provider: 'polar',
      checkout_id: checkout.id,
      status: 'created',
    })

    return json({ url: checkout.url, id: checkout.id })
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Server error' }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
