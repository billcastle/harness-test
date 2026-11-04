# Deploy to Vercel on a subdomain

Example subdomain: `expenses.example.com`. Replace it with yours.

## 1. Create a hosted database (Turso)

Vercel's filesystem is read-only and ephemeral, so the local `data/expenses.db` file won't work there. Use Turso (hosted libSQL). The app creates its tables on first request.

```bash
brew install tursodatabase/tap/turso   # or see https://docs.turso.tech/cli/installation
turso auth login
turso db create expense-tracker
turso db show expense-tracker --url            # -> TURSO_DATABASE_URL (libsql://...)
turso db tokens create expense-tracker         # -> TURSO_AUTH_TOKEN
```

## 2. Generate the secrets

```bash
openssl rand -hex 32     # -> SESSION_SECRET
```

Pick a PIN for `APP_PIN`. Anyone with it can read and edit your expenses, so don't reuse a PIN you use elsewhere.

## 3. Push the code to GitHub

Commit the project and push it to a GitHub repo. `.env.local` and `data/` must stay out of git (check `.gitignore`).

## 4. Import the project in Vercel

1. Vercel dashboard → **Add New… → Project** → import the repo.
2. Framework preset: **Next.js** (auto-detected). Leave build and output settings at their defaults.
3. Under **Environment Variables**, add these for Production (and Preview if you use it):

| Name | Value |
|---|---|
| `APP_PIN` | your PIN |
| `SESSION_SECRET` | the `openssl` output |
| `TURSO_DATABASE_URL` | `libsql://...` from step 1 |
| `TURSO_AUTH_TOKEN` | token from step 1 |

4. Click **Deploy**. It will be live at `<project>.vercel.app`. Open it, enter your PIN, and add an expense to confirm the database works.

## 5. Add the subdomain

1. Project → **Settings → Domains** → **Add** → enter `expenses.example.com`.
2. Vercel shows the DNS record to create. For a subdomain this is almost always:

   | Type | Name/Host | Value |
   |---|---|---|
   | `CNAME` | `expenses` | `cname.vercel-dns.com` |

   Use the exact value Vercel shows for your project, since it can differ.
3. At your DNS provider (Cloudflare, Namecheap, GoDaddy, Route 53, …), add that record.
   - **Cloudflare:** set the record to **DNS only** (grey cloud), not Proxied, or Vercel can't issue the certificate.
   - If the domain's nameservers already point to Vercel, Vercel creates the record for you.
4. Back in Vercel, wait for the domain to show **Valid Configuration**. DNS usually takes a few minutes but can take up to an hour. Vercel then issues the HTTPS certificate automatically.
5. Open `https://expenses.example.com` and log in.

## Troubleshooting

- **500 on `/api/...` or login fails:** a missing env var. The server throws `APP_PIN is not set` or `SESSION_SECRET is not set`. Add it under Settings → Environment Variables, then **Redeploy**, since changes only apply to new deployments.
- **Data disappears between visits:** `TURSO_DATABASE_URL` isn't set, so the app fell back to a local file. Set it and redeploy.
- **Can't log in after the first deploy:** check that `APP_PIN` in Vercel has no trailing space, then redeploy.
- **Domain stuck on "Invalid Configuration":** recheck the CNAME name (just `expenses`, not the full domain, with most providers) and that no conflicting A/AAAA/CNAME record exists for that host.
- **Sessions:** the cookie lasts 30 days. Changing `SESSION_SECRET` logs everyone out.

## Updating

Push to the production branch (usually `main`) and Vercel redeploys automatically. Schema changes are applied by the app on the next request, so no manual migration is needed.
