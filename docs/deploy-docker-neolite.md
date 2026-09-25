# Deploy Counter System on BiznetGio NEO Lite with Docker

This deploys the Next.js app and Caddy reverse proxy in Docker. Supabase remains the database, authentication provider, and image storage. The VPS needs a public IP and a domain whose DNS points to that IP.

## 1. Prepare the VPS in BiznetGio

Create an Ubuntu instance and connect through the BiznetGio web console (noVNC) or SSH. In the instance firewall/security group, allow inbound TCP 22 from your own IP, and TCP 80 and 443 for web traffic. UDP 443 is optional and enables HTTP/3.

Install Docker Engine and the Docker Compose plugin using Docker's official Ubuntu instructions. Verify the installation:

```bash
docker --version
docker compose version
```

## 2. Point the domain to the VPS

Create an `A` record for the application domain pointing to the VPS public IPv4 address. If you add an `AAAA` record, make sure the VPS IPv6 route and firewall are configured too; otherwise remove that record to avoid failed certificate checks.

## 3. Get the application onto the VPS

Clone the repository on the VPS, then enter the project directory:

```bash
git clone --branch deploy/docker-neolite <URL-REPOSITORY> counter-system
cd counter-system
```

Use the repository branch that contains these Docker files. Do not copy `.env.local` from a developer machine into Git.

## 4. Configure production secrets

Create the deployment environment file and edit it:

```bash
cp .env.docker.example .env.docker
nano .env.docker
```

Set `DOMAIN`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `CRON_SECRET` to the production values. Generate a cron secret on the VPS with:

```bash
openssl rand -hex 32
```

Keep `.env.docker` private and out of Git. `NEXT_PUBLIC_*` values are public browser configuration; the service role key and cron secret are private server credentials.

## 5. Build and start

Check the Compose configuration, then build and start the services:

```bash
docker compose --env-file .env.docker config
docker compose --env-file .env.docker up -d --build
docker compose ps
docker compose logs -f app caddy
```

Open `https://<DOMAIN>` after Caddy obtains a TLS certificate. Caddy needs working DNS and public access to ports 80 and 443. The application container is not published directly to the internet; Caddy proxies to it on the Docker network.

## 6. Keep image cleanup scheduled

`vercel.json` schedules cleanup only on Vercel, so create a host cron entry on the VPS. This example runs every day at 00:00 server time:

```bash
sudo crontab -e
```

Add the following line, replacing the domain and secret with the values in `.env.docker`:

```cron
0 0 * * * curl --fail --silent --show-error --max-time 120 -H 'Authorization: Bearer REPLACE_WITH_CRON_SECRET' https://counter.example.com/api/cron/cleanup-images >> /var/log/counter-image-cleanup.log 2>&1
```

Check the VPS timezone with `timedatectl`; the cron expression uses that timezone. Protect the cron log and do not put the secret in a public script or repository.

## 7. Update the deployment

After pushing the desired branch, update the checkout and rebuild:

```bash
git pull origin deploy/docker-neolite
docker compose --env-file .env.docker up -d --build
docker image prune -f
```

Check `docker compose ps` and `docker compose logs --tail=100 app caddy`. Back up Supabase before applying schema changes. Caddy's named volumes hold TLS certificates and should be included in server backups.

## Supabase production checklist

- Apply the SQL migrations in `supabase/migrations` to the production project.
- Confirm the `menu-images` Storage bucket and its policies are configured.
- Add the production domain to Supabase Auth's allowed site/redirect URLs.
- Verify sign-in, role access, image upload/update/delete, and the cron endpoint after deployment.
