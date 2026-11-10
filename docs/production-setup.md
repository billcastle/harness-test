# Production setup: Turso + Vercel

A complete walkthrough from an empty account to a live, PIN-protected tracker. Expect about 20 minutes.

**What you are setting up**

| Piece | Role |
|---|---|
| **GitHub** | Holds the code. Vercel deploys from it. |
| **Turso** | Hosted database. Vercel can't keep files between requests, so the local `data/expenses.db` file can't be used in production. |
| **Vercel** | Hosts the app and gives it an HTTPS address. |

**Before you start, you need:** a GitHub account, a Vercel account, a Turso account (all have free tiers; check each one's current limits and terms), and a terminal with Node.js 20 or newer.

---

## Part 1. Check the app works locally

This catches problems before they turn into deployment problems.

1. `npm install`
2. Copy `.env.example` to `.env.local` and set `APP_PIN` and `SESSION_SECRET` (see Part 3, step 2, for how to generate the secret).
3. `npm run dev`, open <http://localhost:3000>, log in, and add one expense.

## Part 2. Create the Turso database

1. **Install the Turso CLI.**
   - macOS: `brew install tursodatabase/tap/turso`
   - Other systems: <https://docs.turso.tech/cli/installation>
2. **Log in** (opens a browser; create an account if you don't have one):

   ```bash
   turso auth login
   ```
3. **Pick a region close to you** (optional). List them, then pass one to `--location` in the next step:

   ```bash
   turso db locations
   ```
4. **Create the database:**

   ```bash
   turso db create expense-tracker
   # or, with a region:  turso db create expense-tracker --location <code>
   ```
5. **Get the database URL.** Save the output; it starts with `libsql://`:

   ```bash
   turso db show expense-tracker --url
   ```
6. **Create an access token.** Save the output; it is long and shown once:

   ```bash
   turso db tokens create expense-tracker
   ```

You now have the two values the app needs: `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`. Treat the token like a password. Anyone with it can read and change your data.

You don't need to create any tables. The app creates them on its first request.

## Part 3. Prepare your secrets

1. **Choose `APP_PIN`.** It's the only thing protecting your expenses. Use something you don't use anywhere else, and longer than 4 digits if you can.
2. **Generate `SESSION_SECRET`.** This signs the login cookie:

   ```bash
   openssl rand -hex 32
   ```
3. **Decide `CURRENCY`** (optional). An ISO code such as `PHP` or `USD`. If you skip it, the app uses `PHP`.

## Part 4. Put the code on GitHub

1. Create an empty repository on GitHub. Make it **private**, since the project includes statement fixtures with personal details in `tests/fixtures/`. Better still, remove those files or add them to `.gitignore` before pushing.
2. Confirm `.env.local` and `data/` are ignored by git. They must never be pushed:

   ```bash
   git status    # neither should be listed
   ```
3. Commit and push:

   ```bash
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

## Part 5. Deploy on Vercel

1. In the Vercel dashboard click **Add New… → Project**.
2. Connect GitHub if asked, then **Import** your repository.
3. Leave **Framework Preset** as **Next.js** and the build settings at their defaults.
4. Open **Environment Variables** and add each of these. Paste exactly, with no spaces or quotes around the values:

   | Name | Value |
   |---|---|
   | `APP_PIN` | your PIN |
   | `SESSION_SECRET` | the `openssl` output |
   | `TURSO_DATABASE_URL` | the `libsql://…` URL |
   | `TURSO_AUTH_TOKEN` | the token |
   | `CURRENCY` | optional, for example `USD` |

5. Click **Deploy** and wait for the build to finish.
6. Open the address Vercel gives you (`<project>.vercel.app`).

## Part 6. Check that production works

Do all of these on the live site:

1. The PIN screen appears. A wrong PIN is rejected; the right one gets you in.
2. Add an expense, then **reload the page**. It should still be there. If it vanishes, the database isn't connected (see Troubleshooting).
3. Upload a statement. You should see the review screen first, then the transactions after you save.
4. Check the data is in Turso:

   ```bash
   turso db shell expense-tracker "SELECT COUNT(*) FROM expenses"
   ```

## Part 7. Optional: your own subdomain

1. In Vercel: your project → **Settings → Domains → Add**, and enter for example `expenses.example.com`.
2. Vercel shows the DNS record to create. For a subdomain it is usually:

   | Type | Name | Value |
   |---|---|---|
   | `CNAME` | `expenses` | `cname.vercel-dns.com` |

   Use the exact value Vercel shows. It can differ per project.
3. Add that record at your DNS provider. On Cloudflare, set it to **DNS only** (grey cloud), not Proxied.
4. Wait for **Valid Configuration** in Vercel. This usually takes minutes and can take up to an hour. HTTPS is set up for you.

## Part 8. Optional: install it as an app

On the live HTTPS address: Chrome or Edge show an install icon in the address bar; on Android use menu → **Install app**; on iPhone use Safari → Share → **Add to Home Screen**. It always needs an internet connection.

---

## Keeping it running

- **Deploy updates:** push to `main`. Vercel redeploys automatically.
- **Change a setting** (PIN, currency, token): edit it under **Settings → Environment Variables**, then **Redeploy** (Deployments → the latest one → **Redeploy**). Changes only apply to new deployments.
- **Back up your data.** Run this now and then and keep the file somewhere safe and private:

  ```bash
  turso db shell expense-tracker .dump > expenses-backup.sql
  ```
- **Rotate the database token** if it ever leaks: create a new one with `turso db tokens create expense-tracker`, update `TURSO_AUTH_TOKEN` in Vercel, redeploy, then revoke the old one (see `turso db tokens --help`).
- **Log everyone out:** change `SESSION_SECRET` and redeploy. Logins otherwise last 30 days.
- **Currency note:** the currency is a display setting only. Changing it doesn't convert existing amounts.

## Troubleshooting

| Symptom | Likely cause and fix |
|---|---|
| Error page or `/api` 500 after deploying | A variable is missing. The server log says `APP_PIN is not set` or `SESSION_SECRET is not set`. Add it, then redeploy. (Logs: project → **Logs**.) |
| Expenses disappear after a while | `TURSO_DATABASE_URL` isn't set, so the app is writing to a temporary local file. Add both Turso variables and redeploy. |
| Database errors such as "unauthorized" or "invalid token" | Wrong or expired `TURSO_AUTH_TOKEN`, or it was copied with a space. Create a new token and update it. |
| Correct PIN is rejected | Check `APP_PIN` for a trailing space or quote, then redeploy. |
| Statement upload fails | Files over 4 MB are rejected. Export a smaller date range or use the CSV. |
| Subdomain shows "Invalid Configuration" | The CNAME name should be just `expenses`, not the full domain. Also make sure no other A, AAAA or CNAME record exists for that name. |
| Install option doesn't appear | It needs the HTTPS production address, not `npm run dev`. |
