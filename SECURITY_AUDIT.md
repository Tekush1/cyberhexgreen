# Security audit: 17 Oct 2026 (second pass: payments, team roles, mailing, whole site)

## Fixed (live)

| # | Severity | Issue | Fix |
|---|---|---|---|
| 1 | High | **Promo code limits could be beaten**: `max_uses`/expiry were only checked, not reserved, so 20 parallel checkouts could all use a one-time 100% code (free orders, receipts and calendar events for anyone). | A use is now reserved in the same database step that creates the order; it goes back if the payment fails or the window is closed. The server never trusts the client's percent. |
| 2 | Medium | Promo codes could be guessed without limit, and the error said whether a code existed, expired or was used up. | 15 code checks / 10 min per IP; one generic "not valid" message. |
| 3 | Medium | `/api/pay create` had no per-IP limit and called Razorpay before any limit (could exhaust the Razorpay API quota). | 10 checkouts / 10 min per IP, checked before Razorpay. Also limits on verify and failed. |
| 4 | Medium | **HTML attribute injection in the blog page served to bots** (`/api/prerender`): a nested `![..](..[..](..))` produced an `<img>` with an attacker `onerror` (CSP was the only thing stopping it). | Images and links parsed in one pass; URLs can't contain quotes/brackets; bold/italic never touch generated attributes. |
| 5 | Medium | **Old `post_likes` table fully open**: anyone could read, edit or wipe it. | Closed (no access for anyone; the site no longer uses it). |
| 6 | Medium (payments) | Headers would have broken some Razorpay methods: `Permissions-Policy: payment=()` (UPI apps / Payment Request) and `COOP: same-origin` (netbanking and card OTP popups). | `payment=(self checkout.razorpay.com api.razorpay.com)`, `COOP: same-origin-allow-popups` (same as pentestlab). |
| 7 | Low | A form email like `a@b.co?bcc=evil@x.com` could add hidden recipients when an admin clicked "Email". | Strict email format in the database rules and in checkout; mailto links encode the address. |
| 8 | Low | One booking link opened in parallel could book several slots. | After creating the event, any newer duplicate for the same link is removed. Booking is also limited to 10 tries / 10 min per IP. |
| 9 | Low | Newsletter sign-up had only a global cap (a script could block real visitors). | 5 sign-ups / 10 min per IP, plus the global cap. |
| 10 | Low | Admin "Logout" only cleared the browser; a copied token kept working ~1 hour. | Logout now ends the session on Supabase (all devices). |
| 11 | Low | Blog uploads took the file extension from the file name. | Extension comes from the checked file type. |
| 12 | Low | Private links (bookings, unsubscribe, admin) could be indexed if leaked. | `X-Robots-Tag: noindex, nofollow` on those routes; robots.txt fixed (Google/Bing sections had overridden the block list). |
| 13 | Low | `/api/pay` told anyone which env vars were missing; payment functions callable by signed-in users. | Removed; pay_* functions callable only by the server. |

## Do these in dashboards (I can't reach them)

1. **Supabase → Authentication → Sign In / Providers: turn OFF "Allow new users to sign up", and turn OFF Google.** Checked live: sign-ups are still OPEN (email + Google). Anyone can create an account; it has no admin access, but there is no reason to allow it.
2. **Supabase → Authentication → Passwords: turn ON "Leaked password protection".** (still off)
3. **Cloudflare → Security → WAF → Rate limiting**: `/api/` 60 requests/min per IP (extra layer on top of the new per-IP limits).
4. Web3Forms: domain allow-list (cyberhx.com) + hCaptcha.
5. Optional: delete the 51 old Pentest Lab learner logins (last line of `supabase/cleanup_pentestlab.sql`), and the unused Vercel project `cyberhexgreen` (the live site is `cyberhexgreen-gsra`).

## Accepted / not changed

- The `event` role can send free-text emails and see the Resend sent log through the Meetings tab. It can already send campaigns, so this gives no extra power.
- Anyone can upload images (≤3 MB png/jpg/webp) to `ctf-logos/logos/` for the checkout logo. Same as resumes and blog images: limited types/sizes, random names, no listing.
- Newsletter has no double opt-in (a visitor can sign up someone else's email). Recommended later: confirmation email before the address becomes a subscriber.
- `react-router-dom` 6.30.6 (latest 6.x) has a moderate advisory for SSR/redirect cases the site doesn't use; v7 is a breaking upgrade.
- CSP allows `https://*.razorpay.com` for scripts (Razorpay checkout needs it, same as pentestlab).

## Checked and fine

Payment price always computed on the server; HMAC signature checks are timing-safe; amount/currency/order matched against Razorpay; capture on the server; an order is fulfilled once even if browser and webhook arrive together. Every admin API and table checks the caller's own role in the database (`can()`); no service-role key anywhere. No `dangerouslySetInnerHTML`; React Markdown escapes HTML; emails escape everything and only allow https links; previews are sandboxed. No secrets in the client bundle or repo; no source maps. Headers: HSTS, frame-ancestors none, nosniff, strict referrer, CSP without unsafe-inline/eval for scripts. Secrets table unreadable even by owners over the API.

---

# Security audit: 14 Oct 2026

## Fixed in code (deployed)

| # | Issue | Fix |
|---|---|---|
| 1 | **Stored XSS in the blog page served to bots** (`api/prerender.ts`): post title/author/tags went raw into `<script type="application/ld+json">`. A community submission with `</script>` in its title could run script on cyberhx.com once approved. | JSON-LD is escaped (`<` → `<`), `read_time` forced to a number, `Vary: User-Agent` so a cache never serves bot HTML to people. |
| 2 | **No Content-Security-Policy.** | Strict CSP added (scripts only from cyberhx.com, no inline scripts, `object-src 'none'`, `frame-ancestors 'none'`, `base-uri 'self'`). The two inline scripts and the font `onload` moved into `/boot.js` and `/loader-fallback.js`. Tested on 12 pages: no violations. |
| 3 | Old / missing headers. | `X-XSS-Protection: 0` (old filter can cause leaks), `Cross-Origin-Opener-Policy: same-origin`, stricter `Permissions-Policy`, `X-Robots-Tag: noindex` on `/api/*`. HSTS and `X-Frame-Options: DENY` were already there. |
| 4 | **Hidden guest list leaked emails**: group meetings with "hide guests" still listed every invitee's email in the calendar description. | Group events no longer put emails in the description. |
| 5 | Newsletter form could **re-subscribe someone who unsubscribed**, and could be flooded. | People who unsubscribed can't be re-added by a form (admin only, on request). Max 300 public sign-ups per hour. Names are cleaned. |
| 6 | Names with `, ; < > "` could add extra recipients in some email services. | Stripped before sending. |
| 7 | Vulnerable packages. | `swiper` (critical, unused) removed; `react-router-dom` → 6.30.6; `ws` patched. One moderate react-router advisory needs v7 (breaking); the site has no user-controlled redirects, so impact is low. |
| 8 | `security.txt` pointed to ctf.cyberhx.com. | Now cyberhx.com. |

## Fixed in the database (applied live on 14 Oct 2026, see `supabase/security_hardening.sql`)

| # | Issue | Fix |
|---|---|---|
| 9 | **Anyone could upload any file, any size, to the public `article-images` bucket** (free malware/phishing hosting on your Supabase domain). | Upload policy removed; 5 MB images-only limit. Existing images keep working. |
| 10 | Anyone could **list every file** in `article-images` and `blog-media` (incl. pending submissions). | List policies removed. Files still load by link. |
| 11 | Public forms could pre-fill `admin_notes`, fake dates, or point `resume_path` at other files. | Insert rules tightened on all 4 public forms. |
| 12 | Advisor warnings: `rls_auto_enable` callable by anyone, `update_updated_at` mutable search path. | Fixed. |
| 13 | ~25 unused Pentest Lab / store tables; `store_*` functions callable by anyone. | Functions locked (nobody can call them). Deleting the tables needs you: run `supabase/cleanup_pentestlab.sql` (deletes data for good). |

## Do these in dashboards (2 minutes, I can't reach them)

1. **Supabase → Authentication → Sign In / Providers → turn OFF "Allow new users to sign up".** The site has no public login; open sign-ups let anyone become an `authenticated` user.
2. **Supabase → Authentication → Passwords → turn ON "Leaked password protection".**
3. Run `supabase/cleanup_pentestlab.sql` in SQL Editor to delete the old Pentest Lab tables. Optional: its last line (commented) deletes the 51 old Pentest Lab learner accounts. Remove the `--` and run it if you don't need them.
4. **Cloudflare → Security → WAF → Rate limiting rules**: `/api/` max 60 requests / minute per IP, and `/api/subscribe` max 5 / minute per IP → Block.
5. **Web3Forms dashboard**: turn on the domain allow-list (cyberhx.com) and hCaptcha.
6. Make sure Cloudflare **Rocket Loader is OFF** (it injects scripts the new CSP blocks). Web Analytics is already allowed.

## Checked and fine

- Admin APIs all verify `is_admin()` with the caller's token; no CORS opened; no SSRF or open redirects.
- No `dangerouslySetInnerHTML`; blog Markdown has no raw HTML; email templates escape everything and allow only `https:` links; email previews are sandboxed.
- No secrets in the repo or its history (only the public anon key, which is meant to be public).
- Booking links are HMAC/AES-GCM protected; short codes can't be guessed.
- Known low risk left: one booking link opened twice at the exact same second could book two slots; likes/views can be inflated (needs the Cloudflare rate limit above).
