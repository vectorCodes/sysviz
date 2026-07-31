// Polar webhook: verifies the signature and activates the user's Pro access.
// Deploy: supabase functions deploy polar-webhook --no-verify-jwt
// In Polar → Settings → Webhooks, add this URL, set the secret, subscribe to "order.paid".
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { validateEvent, WebhookVerificationError } from 'https://esm.sh/@polar-sh/sdk@0.36.0/webhooks'
import { planByProductId, planConfig } from '../_shared/plans.ts'

// Response bodies are intentionally descriptive so the Polar delivery log shows why.
Deno.serve(async (req) => {
  const secret = Deno.env.get('POLAR_WEBHOOK_SECRET')!
  const raw = await req.text()
  const headers = Object.fromEntries(req.headers)

  // 1) Verify signature.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let event: any
  try {
    event = validateEvent(raw, headers, secret)
  } catch (e) {
    if (e instanceof WebhookVerificationError) return text('invalid signature', 403)
    return text('bad request: ' + (e instanceof Error ? e.message : 'unknown'), 400)
  }

  console.log('polar webhook event:', event.type)

  // 2) Only act on a paid order.
  const isPaid =
    event.type === 'order.paid' ||
    (event.type === 'order.updated' && (event.data?.paid || event.data?.status === 'paid'))
  if (!isPaid) return text(`ignored event ${event.type}`, 200)

  const order = event.data ?? {}

  // 3) Which plan? Prefer metadata.plan_id, else reverse-lookup by product id.
  const productId = order.product_id ?? order.product?.id
  const byMeta = order.metadata?.plan_id ? planConfig(order.metadata.plan_id) : null
  const byProduct = planByProductId(productId)
  const days = byMeta?.days ?? byProduct?.days
  if (!days) return text(`no matching plan for product ${productId}`, 400)

  // 4) Which user? Prefer metadata.user_id, else match the customer email to a profile.
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  let userId: string | undefined = order.metadata?.user_id
  const email = order.customer?.email ?? order.customer_email ?? order.user?.email
  if (!userId && email) {
    const { data: profile } = await admin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle()
    userId = profile?.id
  }
  if (!userId) return text(`could not resolve user (email=${email ?? 'none'})`, 400)

  // 5) Grant access.
  const accessUntil = new Date(Date.now() + days * 864e5).toISOString()
  const { error } = await admin.from('entitlements').upsert({
    user_id: userId,
    plan: 'pro',
    status: 'active',
    access_until: accessUntil,
    updated_at: new Date().toISOString(),
  })
  if (error) return text('db error: ' + error.message, 500)

  await admin
    .from('payments')
    .update({ status: 'paid', order_id: order.id })
    .eq('checkout_id', order.checkout_id ?? order.checkoutId ?? '')

  return text(`granted pro to ${userId} until ${accessUntil}`, 200)
})

function text(body: string, status: number) {
  return new Response(body, { status })
}
