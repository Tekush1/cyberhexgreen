# Supabase setup

Run these in **Supabase → SQL Editor → New query → Run**, in this order. Each file is safe to run again.

1. `migrations.sql` — blog tables and categories
2. `admin_security.sql` — admin allow-list and row level security
3. `blog_v2.sql` — image storage bucket, likes, views
4. `admin_tables.sql`, `meeting_links.sql` — other admin panel tables
5. `mailing.sql` — subscribers, campaigns and email sending limits (Admin → Campaigns / Subscribers)

Then make yourself an admin:

1. Authentication → Users → **Add user** (email + password, tick *Auto Confirm User*)
2. SQL Editor:

```sql
INSERT INTO public.admins (user_id)
SELECT id FROM auth.users WHERE email = 'you@example.com';
```

## Keys

The website only needs two values, set in **Vercel → Project → Settings → Environment Variables**:

- `VITE_SUPABASE_URL` — Supabase → Project Settings → API → Project URL
- `VITE_SUPABASE_ANON_KEY` — same page, the `anon` / publishable key

Never put the `service_role` key or a personal access token in Vercel, the code, or a chat.
