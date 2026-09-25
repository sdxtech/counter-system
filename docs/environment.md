# Environment

Create `.env.local` in the project root and fill it with values from Supabase and Vercel.

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
CRON_SECRET=
```

`SUPABASE_SERVICE_ROLE_KEY` must never be exposed in the browser. It is used by server-side admin actions and the scheduled image cleanup endpoint.

For Docker, copy `.env.docker.example` to `.env.docker` and edit `.env.docker` on the server. Run Compose commands with `--env-file .env.docker`.

The two `NEXT_PUBLIC_*` values are provided as build arguments and embedded in the browser bundle. Changing them requires rebuilding the image. `SUPABASE_SERVICE_ROLE_KEY` and `CRON_SECRET` are only provided at container runtime through `env_file`; they must not be added to Docker build arguments or copied into the image.

Admin clients must be created inside request handlers/actions using `createAdminClient()`. Creating one at module scope makes Next.js page collection require the service role key during the image build, which fails with `supabaseKey is required`.
