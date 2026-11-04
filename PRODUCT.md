# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
A single owner managing their own personal finances. They check spending after uploading a bank statement or logging a purchase by hand.

## Product Purpose
A personal expense tracker. Uploading a statement (CSV or PDF) auto-categorizes transactions, so the owner needs little manual entry. Success is an accurate, current picture of spending with minimal effort.

## Positioning
Private and self-owned: PIN-gated, data in a simple local/libSQL (SQLite) database, no bank linking or third-party accounts. Effortless statement ingestion combined with that privacy is the mechanism.

## Operating Context
- Statement upload (CSV/PDF) with keyword-rule categorization.
- Manual expense add (modal), settings (modal), monthly recurring expense generation, currency handling.
- Dashboard at `/tracker`, behind a PIN login.
- Dates are `yyyy-MM-dd` strings, displayed via `fmtDate`.

## Capabilities and Constraints
- Next.js 16 (App Router), React 19, TypeScript strict, Tailwind v4, shadcn/ui (base-nova, Base UI), libSQL, deployed on Vercel.
- Light and dark themes must both be supported.
- Must be usable on mobile for quick entry.
- No new dependencies without asking; reuse existing components.

## Brand Commitments
None confirmed. No name, logo, or voice commitments beyond the working product name; open to decide later.

## Evidence on Hand
No real user data, testimonials, or metrics in the repo. Don't fabricate any.

## Product Principles
1. Capture should cost almost no effort: ingestion beats typing.
2. Data stays private and owned by the user; no external account linkage.
3. Scanning the numbers comes first; the interface serves quick checks and quick entry.
4. Works equally well on a phone and a desktop, in light or dark.

## Accessibility & Inclusion
Accessible by default: semantic HTML, labels, keyboard support (per project rules). No formal WCAG level was selected.
