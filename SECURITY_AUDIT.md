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
