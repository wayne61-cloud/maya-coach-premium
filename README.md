# MAYA Coach

MAYA Coach is a modular coaching app with:

- adaptive workout generation,
- athlete profile personalization (`name`, `age`, `weight`),
- local evolution tracking and weight snapshots,
- nutrition recommendations tied to training load,
- recovery modules,
- optional cloud AI configuration,
- local notifications and a lightweight sync backend for development.

## Run locally

```bash
cd "/Users/yohannbouah/Desktop/code app/coach"
python3 -m http.server 8080
```

Open [http://localhost:8080/index.html](http://localhost:8080/index.html).

## Optional local services

See [`api/README.md`](./api/README.md) for:

- the OpenAI proxy,
- the sync backend,
- health endpoints and local magic-link auth.

## Supabase setup

The app now expects a Supabase project for:

- email/password auth,
- cloud upload of progression photos,
- admin moderation with approval of new signups,
- user-scoped synced data.

Create a `config.json` at the project root from [`config.example.json`](./config.example.json) and provide:

- `services.supabase.url`
- `services.supabase.anonKey`
- `auth.adminEmails`

Then run [`supabase/schema.sql`](./supabase/schema.sql) in your project SQL editor so the `profiles`, `progress_photos`, RLS policies, moderation statuses, and storage bucket policies are aligned with the app.

Behavior after setup:

- the email listed in `auth.adminEmails` becomes the only visible admin account in the product UI,
- the admin pole is hidden for every non-admin session,
- new non-admin signups are created with `account_status = pending`,
- pending accounts cannot enter the app until the admin validates them from the admin dashboard,
- local fallback mode is available only on `localhost` when `auth.previewEnabled` is true.
