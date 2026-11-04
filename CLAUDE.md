# Project

Personal expense tracker. Next.js 16 (App Router) / React 19 / TypeScript / Tailwind v4 + shadcn/ui (base-nova, Base UI) / libSQL (SQLite) / deployed on Vercel. PIN-gated; statement upload (CSV/PDF) auto-categorizes; manual add; light/dark theme.

## Commands
- Dev: `npm run dev` (needs `.env.local`, see `.env.example`; local DB at `data/expenses.db`)
- Typecheck/lint: `npm run typecheck`
- Parser tests: `npm test`
- Build: `npm run build`

## Layout
- `src/lib/` parse.ts (statement parsing), categories.ts (keyword rules), recurring.ts (monthly generation), currency.ts, settings.ts, db.ts, auth.ts
- `src/app/api/` login, logout, expenses, recurring, settings, upload · `src/app/tracker/` dashboard UI; Add-expense and Settings are modals (`AddExpenseDialog`, `SettingsDialog`)
- `src/components/ui/` shadcn components (add more with `npx shadcn@latest add <name>`); dates are `yyyy-MM-dd` strings, shown via `src/lib/dates.ts` (`fmtDate`)

## Rules
- TypeScript strict; no `any`, no `@ts-ignore` without a reason comment.
- Reuse existing components/utils before adding new ones; no new deps without asking.
- Accessible by default: semantic HTML, labels, keyboard support.
- Formatting/lint fixes run automatically after each edit (hook) — don't run them manually.
- Done = `/verify` passes. Don't claim success without it.
- Keep diffs minimal; don't refactor unrelated code.

## Token hygiene
- Don't read lockfiles, build output, or `node_modules` (except a lib's `.d.ts` when needed).
- Use the `test-runner` agent for full test/build runs so only failures come back.
- Use the `Explore` agent for broad codebase searches.
