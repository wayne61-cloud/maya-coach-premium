# MAYA Coach

MAYA Coach is a modular coaching app with:

- adaptive workout generation,
- athlete profile personalization (`name`, `age`, `weight`),
- local evolution tracking and weight snapshots,
- nutrition recommendations tied to training load,
- recovery modules,
- optional cloud AI configuration,
- local notifications,
- a private backend mode for real auth, moderation and synced data.

## Run locally

```bash
cd "/Users/yohannbouah/Desktop/code app/coach"
python3 -m http.server 8080
```

Open [http://localhost:8080/index.html](http://localhost:8080/index.html).

## Optional local services

See [`api/README.md`](./api/README.md) for:

- the OpenAI proxy,
- the private backend,
- health endpoints and real email/password auth.

## Private backend setup

The app can now run without Supabase by using the managed backend for:

- email/password auth,
- admin moderation with approval of new signups,
- user-scoped synced data.

Create a `config.json` at the project root from [`config.example.json`](./config.example.json) and provide:

- `services.backend.url`
- `auth.adminEmails`

Then start the backend with the admin seed environment variables described in [`api/README.md`](./api/README.md). The email(s) listed in `auth.adminEmails` should match the backend admin seed so the product UI keeps the admin area private.

Behavior after setup:

- the email listed in `auth.adminEmails` becomes the only visible admin account in the product UI,
- the admin pole is hidden for every non-admin session,
- new non-admin signups are created with `account_status = pending`,
- pending accounts cannot enter the app until the admin validates them from the admin dashboard,
- local fallback mode is available only on `localhost` when `auth.previewEnabled` is true.

## Supabase alternative

If you prefer Supabase later, keep using:

- `services.supabase.url`
- `services.supabase.anonKey`

Then run [`supabase/schema.sql`](./supabase/schema.sql) in your Supabase SQL editor so the moderation statuses, RLS policies and storage rules stay aligned with the app.

Important for security in Supabase mode:

- admin rights must come from the database profile row, not from the public app config,
- new signups stay regular users by default,
- promote an admin explicitly from the Supabase SQL editor after the account exists:

```sql
update public.profiles
set role = 'admin', account_status = 'active', updated_at = now()
where email = 'admin@maya.fitness';
```
