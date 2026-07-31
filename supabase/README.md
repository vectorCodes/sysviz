# SysViz backend (Supabase + Polar)

The app runs on mocks until these are configured. Payments use **Polar.sh** — a
Merchant of Record, so Polar handles checkout, tax and compliance; we just create a
checkout and react to its webhook.

## 1. Create the database
In the Supabase dashboard → SQL editor, run [`schema.sql`](./schema.sql). It creates
`profiles`, `entitlements`, `payments`, `coupons`, `referrals`, `lesson_progress`, RLS
policies, and a trigger that provisions a profile + free entitlement on signup.

## 2. Frontend keys
Copy `.env.example` → `.env` and set:

```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

Restart `pnpm dev`. Sign-in works and gating reads the `entitlements` table.

> Quick demo without a backend: set `VITE_POLAR_CHECKOUT_LINK` to a Polar product
> share link — the Pay button redirects to the real Polar hosted checkout.

## 3. Set up Polar
1. Create an organization at polar.sh (use **Sandbox** first: sandbox.polar.sh).
2. Create three **Products** (1 / 6 / 12 months) with their prices. Copy each product id.
3. Create an **Organization Access Token** (Settings → Developers).

## 4. Deploy the Edge Functions
```
supabase functions deploy create-checkout
supabase functions deploy polar-webhook --no-verify-jwt
```

Set the server-only secrets (Supabase auto-injects `SUPABASE_URL`,
`SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` — don't set those):
```
supabase secrets set \
  APP_URL=https://<your-app-domain> \
  POLAR_ACCESS_TOKEN=<polar token> \
  POLAR_SERVER=sandbox \
  POLAR_WEBHOOK_SECRET=<from step 5> \
  POLAR_PRODUCT_1M=<product id> \
  POLAR_PRODUCT_6M=<product id> \
  POLAR_PRODUCT_12M=<product id>
```

## 5. Configure the Polar webhook
In Polar → Settings → Webhooks, add:
- URL: `https://<project>.supabase.co/functions/v1/polar-webhook`
- Format: **Raw**
- Secret: generate one and reuse it as `POLAR_WEBHOOK_SECRET`
- Event: **`order.paid`**

## Flow
1. Client calls `create-checkout` → Polar checkout created (with `metadata.user_id`) +
   a `payments` row recorded → the client is redirected to Polar's hosted checkout.
2. On payment, Polar calls `polar-webhook`, which verifies the Standard-Webhooks
   signature and upserts the user's `entitlements` row to `pro` with an `access_until`.
3. Polar redirects back to `/account?checkout=…`; the client polls its entitlement and
   unlocks Pro.

Prices and products live in Polar — the client never sets the amount.
