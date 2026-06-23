# Environment

Create `.env.local` in the project root and fill it with values from Supabase and Vercel.

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
CRON_SECRET=
```

`SUPABASE_SERVICE_ROLE_KEY` must never be exposed in the browser. It is only used by server route handlers such as the scheduled image cleanup endpoint.
