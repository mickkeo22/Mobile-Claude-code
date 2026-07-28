# Going live

The app is finished and builds clean. Two steps stand between it and a working
storefront, and both need a human because they need credentials I cannot mint.

## 1. Deploy — about 2 minutes

The free scanner is the whole product surface, and it needs **no environment
variables at all**. Deploy it and it works.

**Vercel dashboard → Add New → Project → import `mickkeo22/Mobile-Claude-code`**

Then change exactly one setting:

| Setting | Value |
|---|---|
| **Root Directory** | `answergap` |
| Framework | Next.js (auto-detected) |
| Build / install commands | leave as-is |
| Environment variables | none needed |

Deploy. The scan works immediately on the generated URL.

> The repo root is a different app (Aether), which is why Root Directory has to
> be set. `answergap/vercel.json` already pins the 60-second function timeout the
> scanner needs.

Or from a terminal:

```bash
cd answergap && npx vercel --prod
```

## 2. Turn on payments

Checkout is fully implemented. It needs one variable:

```
STRIPE_SECRET_KEY=sk_live_...
```

Add it in **Vercel → Settings → Environment Variables**, then redeploy.

That is the entire configuration. Checkout builds its line item with inline
`price_data`, so there is no Stripe product or price to create first, and no
webhook to register — access is granted by verifying the Checkout session
server-side on the report page.

### Test mode first

An `sk_test_...` key exercises the complete flow — checkout, redirect, session
verification, unlocked report — using Stripe's test card `4242 4242 4242 4242`.
No money moves. Swap in the `sk_live_` key when you're satisfied.

### About the current Stripe account

The connected account is `MK Operating Company LLC sandbox`. **A sandbox cannot
accept real payments.** For actual revenue you need a live key from an activated
Stripe account. Nothing in the code changes — only the key.

Secret keys cannot be created through Stripe's API by design, which is the one
reason this step could not be automated.

## 3. Optional

```
NEXT_PUBLIC_APP_URL=https://yourdomain.com   # only for a custom domain
PREVIEW_TOKEN=<random string>                # /report/<domain>?preview=<token>
FIX_PACK_PRICE_CENTS=2900                    # defaults to $29
```

Leave `PREVIEW_TOKEN` unset in production and the bypass does not exist.

## Verifying it works

Scan `sunstatehvac.com`. It should score **33/F** and report `403` from
GPTBot, OAI-SearchBot and ClaudeBot against a `200` browser control. That is a
real Phoenix HVAC company whose CDN blocks OpenAI and Anthropic — a good
end-to-end proof that the differential probe is working against live traffic.

`theroofingcompanyfl.com` should score around **91/A**, which confirms the
control logic isn't just flagging everything.
