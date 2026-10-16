# CTF checkout payments (Razorpay)

Host your CTF → checkout takes payment with Razorpay, the same way pentestlab.cyberhx.com does.
Until the steps below are done, the checkout keeps working the old way ("Place order", payment link later).

## What happens when someone pays

1. The buyer fills the checkout, **uploads the CTF logo** (required), ticks the Terms box and presses **Pay**.
2. The server prices the cart itself (`shared/ctfPricing.ts`), applies a promo code if one was entered, and opens Razorpay
   (₹ INR: UPI, cards, netbanking, wallets · $ USD: international cards).
3. After payment the server checks the signature, confirms the payment with Razorpay (captures it if needed) and then, once only:
   - marks the order **Paid** (Admin → Payments)
   - creates the **event**: a *Scheduled* row in Admin → CTF Requests, and an entry on the team Google Calendar on the event date
     (marked "free", so it does not block meeting slots)
   - emails the buyer a **receipt through Sender** (if Sender fails, the next connected service sends it, and the log says so)
   - emails the team (mail@cyberhx.com, or `PAYMENTS_NOTIFY_TO`)
4. If the buyer closes the tab before the browser reports back, the **webhook** does step 3.

Orders with *custom challenges* are priced by quote, so they still use "Place order" and get a payment link later.

Promo codes: Admin → Payments → Promo codes (table `ctf_promo_codes`; the old pentestlab `promo_codes` table is not used). At checkout they hide behind a small **Have a code?** link under the Pay button.
A 100% code confirms the order without any payment.

## Setup (once)

1. **Database**: already applied (17 Oct). To get the server secret, run this in Supabase → SQL Editor and copy the value:
   `select value from public.app_secrets where name = 'payments';`
   (On a fresh project, run `supabase/payments.sql` instead; its last row prints the same secret.)
2. **Vercel → Settings → Environment Variables** (Production):

   | Name | Value |
   |---|---|
   | `PAYMENTS_DB_SECRET` | the secret from step 1 |
   | `RAZORPAY_KEY_ID` | Razorpay → Account & Settings → API keys (same account as pentestlab is fine) |
   | `RAZORPAY_KEY_SECRET` | from the same place |
   | `RAZORPAY_WEBHOOK_SECRET` | any long random text; use the same text in step 3 |
   | `PAYMENTS_NOTIFY_TO` (optional) | where "new paid order" mail goes, default mail@cyberhx.com |

3. **Razorpay → Account & Settings → Webhooks → Add new webhook**
   - URL: `https://cyberhx.com/api/razorpay-webhook`
   - Secret: the `RAZORPAY_WEBHOOK_SECRET` text
   - Events: `payment.captured`, `payment.failed`, `order.paid`

   Using the pentestlab Razorpay account is fine: each site ignores the other's payments.
4. Vercel → Deployments → **Redeploy**. The checkout now shows the Pay button.
5. Test with Razorpay **test keys** first (`rzp_test_…`, test UPI `success@razorpay`), then switch to live keys.
   USD needs *International payments* switched on in Razorpay.

## Logs

Admin → Payments (owners and event managers):
- **Orders**: every checkout with status, amount, code, logo, receipt and calendar status, and a timeline per order.
- **Logs**: everything that happened (checkout started, paid, failed, window closed, receipt sent / failed, calendar, webhook problems).
- **Promo codes**: create, limit uses, set an end date, turn off.
