# Admin panel security — one-time setup (5 min)

Old problem: the password `Admin@12324` was inside the website's JavaScript, and the database
let anyone with the public anon key edit/delete posts. Fixed with real Supabase Auth + Row Level Security.

1. Supabase dashboard → **Authentication → Users → Add user** → your email + a strong password → tick *Auto Confirm User*.
2. **SQL Editor** → paste all of `supabase/admin_security.sql` → Run.
3. In the same editor run (with your email):
   ```sql
   INSERT INTO public.admins (user_id)
   SELECT id FROM auth.users WHERE email = 'you@example.com';
   ```
4. Deploy, open `/admin`, log in with that email + password.
5. (Recommended) Authentication → Providers → Email → turn **off** "Allow new users to sign up",
   so strangers can't create accounts (they would still not be admins, but it keeps things clean).

What changed:
- Only users in the `admins` table can approve/reject/delete/feature posts, read submissions, or use the Interviews tab.
- The public can still read published posts and *submit* an article (pending only) — nothing else.
- Sessions last ~1 hour, then you are asked to log in again.

Heads-up: step 2 deletes ALL existing policies on `blog_posts`, `blog_categories`, `article_submissions` and
recreates strict ones, and re-creates `approve_submission` / `reject_submission`. If you had custom rules there, re-add them.
Also change any password you ever used in the old code — it was public.
