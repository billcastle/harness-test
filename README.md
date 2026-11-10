# Expense Tracker

A personal, PIN-protected expense tracker. Upload a bank statement (CSV or PDF) to auto-categorize spending, add expenses by hand, set weekly, monthly or yearly recurring expenses, and install it on your phone or desktop as an app.

Built with Next.js 16, React 19, TypeScript, Tailwind v4 + shadcn/ui, and libSQL (SQLite).

## Run it locally

**You need:** Node.js 20 or newer and npm.

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create your environment file. Copy `.env.example` to `.env.local` and fill in the values:

   ```bash
   cp .env.example .env.local
   ```

   | Variable | Required | What it is |
   |---|---|---|
   | `APP_PIN` | yes | The PIN you type to log in. |
   | `SESSION_SECRET` | yes | A long random string that signs the login cookie. Generate one with `openssl rand -hex 32`. |
   | `CURRENCY` | no | Display currency as an ISO code, such as `PHP`, `USD` or `EUR`. Defaults to `PHP`. It can only be changed here, not in the app. |
   | `TURSO_DATABASE_URL` | production only | Hosted database URL. Leave it unset locally. |
   | `TURSO_AUTH_TOKEN` | production only | Token for the hosted database. Leave it unset locally. |

3. Start the dev server:

   ```bash
   npm run dev
   ```

4. Open <http://localhost:3000>, enter your PIN, and add your first expense.

Locally, data is stored in `data/expenses.db`, which is created automatically and ignored by git.

Other commands: `npm run typecheck` (type check), `npm test` (statement parser tests), `npm run build` (production build).

## Deploy to Vercel

For a fuller walkthrough with verification steps, backups and troubleshooting, see [docs/production-setup.md](docs/production-setup.md).

Vercel's filesystem is read-only and doesn't persist, so production needs a hosted database. Use Turso (hosted libSQL). The app creates its tables on the first request, so there is nothing to migrate.

### 1. Create the database

```bash
brew install tursodatabase/tap/turso      # other platforms: https://docs.turso.tech/cli/installation
turso auth login
turso db create expense-tracker
turso db show expense-tracker --url       # -> TURSO_DATABASE_URL (starts with libsql://)
turso db tokens create expense-tracker    # -> TURSO_AUTH_TOKEN
```

### 2. Push the code to GitHub

Commit the project and push it to a GitHub repository. `.env.local` and `data/` must not be committed (they are in `.gitignore`).

### 3. Import the project in Vercel

1. In the Vercel dashboard choose **Add New… → Project** and import the repository.
2. Leave the framework preset as **Next.js** and keep the default build settings.
3. Under **Environment Variables** add these (Production, and Preview if you use it):

   | Name | Value |
   |---|---|
   | `APP_PIN` | your PIN. Anyone with it can read and edit your expenses, so don't reuse one from elsewhere. |
   | `SESSION_SECRET` | the output of `openssl rand -hex 32` |
   | `TURSO_DATABASE_URL` | from step 1 |
   | `TURSO_AUTH_TOKEN` | from step 1 |
   | `CURRENCY` | optional, for example `USD` (defaults to `PHP`) |

4. Click **Deploy**. When it finishes, open `<project>.vercel.app`, log in, and add an expense to confirm the database works.

### 4. Use your own subdomain (optional)

1. In the project, go to **Settings → Domains → Add** and enter your subdomain, for example `expenses.example.com`.
2. Vercel shows the DNS record to create. For a subdomain it is usually:

   | Type | Name | Value |
   |---|---|---|
   | `CNAME` | `expenses` | `cname.vercel-dns.com` |

   Use the exact value Vercel shows for your project, since it can differ.
3. Add that record at your DNS provider. On Cloudflare, set it to **DNS only** (grey cloud), not Proxied.
4. Wait until Vercel shows **Valid Configuration**. This usually takes a few minutes and can take up to an hour. HTTPS is set up automatically.

### Updating and troubleshooting

- **Update:** push to your production branch (usually `main`) and Vercel redeploys.
- **Changed an environment variable?** Redeploy, because changes only apply to new deployments.
- **Login or `/api` errors (500):** a variable is missing. The server reports `APP_PIN is not set` or `SESSION_SECRET is not set`.
- **Data disappears between visits:** `TURSO_DATABASE_URL` isn't set, so the app is using a local file that Vercel discards.
- **Domain stuck on "Invalid Configuration":** check that the CNAME name is just `expenses` (not the full domain) and that no other A, AAAA or CNAME record exists for that host.
- **Logging everyone out:** changing `SESSION_SECRET` does this. Sessions last 30 days otherwise.

## Install it as an app

The tracker is a Progressive Web App, so it can be installed from the browser. It must be served over HTTPS, which your Vercel deployment is. Installing only works on a production build, not `npm run dev`.

- **Chrome or Edge on desktop:** click the install icon at the right end of the address bar, or open the browser menu and choose **Install Expense Tracker**.
- **Android (Chrome):** menu → **Install app** (or **Add to Home screen**).
- **iPhone or iPad (Safari):** tap Share → **Add to Home Screen**.

The installed app opens in its own window and goes to the PIN screen when you're signed out. It always needs an internet connection, because your data is private and is never cached on the device.

To test installing locally, run `npm run build && npm start` and open it on `localhost`, which browsers treat as secure.

---

## Claude Code setup

A small Claude Code setup for web projects.

| File | Purpose |
|---|---|
| `CLAUDE.md` | Project context, loaded every session. Keep it short. |
| `.claude/settings.json` | Permissions (auto-allows safe commands, blocks secrets, lockfiles and build output) and the format hook |
| `.claude/hooks/format.mjs` | Runs Biome, or Prettier + ESLint, on each edited file; sends back only remaining errors |
| `.claude/skills/feature` | `/feature <desc>`: explore → plan → build → test → verify |
| `.claude/skills/verify` | `/verify`: typecheck, lint, tests, build |
| `.claude/agents/test-runner.md` | Haiku agent that runs noisy commands and returns only failures |

Built-in skills also work: `/code-review`, `/security-review`, `/simplify`, `/init`.

Put personal overrides in `.claude/settings.local.json` and `CLAUDE.local.md`; both are gitignored.
