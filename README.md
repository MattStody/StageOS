# StageOS

Production management for Canadian regional theatre — the financial, contractual, and
operational life of a production in one place. Built for General Managers, Executive
Directors, and Producers.

**Status:** feature-rich prototype. Demo-ready, not yet production-ready — see
[Current state](#current-state) before putting real data in it.

---

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000
```

Sign in with the admin credentials defined in `lib/auth.ts`.

AI features (contract extraction, weekly briefs, workflow import) call the Anthropic API
and need a key:

```bash
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env.local
```

Everything else works without it.

---

## The three editions

The same codebase ships as three versions. The edition decides which sections exist and
whether dollar amounts are ever rendered.

| Edition | Contains | Money visible |
|---|---|---|
| **Full** | Everything | Yes |
| **Finance** | Dashboard, Finance, Workspace | Yes |
| **Production** | Dashboard, Production, Company, Workspace | **No** |

Two ways to select one:

```bash
npm run dev              # Full,       port 3000
npm run dev:finance      # Finance,    port 3001
npm run dev:production   # Production, port 3002
```

...or leave the env var unset and pick the version on the login screen (stored per browser
tab). Setting `NEXT_PUBLIC_STAGEOS_EDITION=finance|production` hard-locks a deployment to
one edition and hides the picker — that's what real deployments should do.

### How money isolation works

The Production edition keeps every operational record but shows no financial information.
Enforced in layers, all keyed off `SHOW_MONEY` in `lib/edition.ts`:

1. `fmt()` in `lib/utils.ts` returns `•••` instead of any currency string — one choke point
   covering every rendered amount in the app.
2. `EditionGuard` redirects routes belonging to excluded sections; the sidebar hides them.
3. `FinanceOnly` wraps inherently financial pages that live inside *allowed* sections
   (Forecasting, Reports, Board Report, AI Brief) and shows a notice instead.
4. Money **inputs** are hidden too — a pre-filled fee field would leak the value even if
   the display is masked. Saves leave stored values untouched.
5. `csvMoney()` in `lib/company.ts` masks amounts in CSV exports.

> ⚠️ This is a **UI-level** boundary, not a security boundary. Both editions read the same
> browser-stored data, so a determined user could read raw numbers from devtools. Making
> this a real guarantee requires the server-side backend that doesn't exist yet.

**When adding any feature that touches money, check `SHOW_MONEY` before rendering it.**

---

## Architecture

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind · Zustand · Recharts ·
Anthropic SDK

- **All data lives in the browser.** One Zustand store (`lib/store.ts`) persisted to
  localStorage under `stageops-store`. There is no database and no server-side
  persistence. Seed data comes from `lib/mockData.ts` and `lib/companyData.ts`.
- **Storage partitions.** Users flagged `freshWorkspace` in `lib/auth.ts` get their own
  localStorage key so their workspace starts empty and never mixes with the demo data.
  Because of this, login uses full page navigations (not `router.push`) so the store
  rehydrates against the right partition.
- **Access control** is two independent filters that intersect: the edition
  (`lib/edition.ts`) and the signed-in user's allowed sections (`lib/auth.ts`), combined in
  `lib/useAccess.ts` and the sidebar.
- **AI features** are three API routes (`app/api/*`) that call Claude for contract
  extraction and document parsing. Each falls back to a demo response when no key is set.

### Where things live

```
app/(app)/          all authenticated pages (dashboard, productions, company, finance…)
app/api/            AI extraction endpoints
app/login/          login + edition picker
components/layout/  Sidebar, EditionGuard, FinanceOnly, PageHeader
components/ui/      Card, Button, Modal, StatCard, Badge, SeatMap
lib/                store, types, domain logic, seed data  ← most of the substance
```

### Domain logic worth knowing

The encoded Canadian theatre knowledge is the differentiated part of this product:

| File | What it encodes |
|---|---|
| `lib/caea.ts` | CAEA/PACT weekly payroll — overtime, meal & rest penalties, vacation pay, pension, dues |
| `lib/unionTemplates.ts` | Obligation templates for CAEA-ITA, AFM Local 149, SDC, IATSE 58 |
| `lib/onboarding.ts` | Per-person onboarding checklists (SIN, TD1, banking, WSIB…) |
| `lib/forecasting.ts` | Revenue projection, break-even, scenario modelling |
| `lib/obligationEngine.ts` | Contract obligations → deadlines and cash flow |
| `lib/workflowTemplates.ts` | Built-in multi-step workflows that generate department tasks |

> The CAEA calculations implement PACT tier rules and carry an in-app disclaimer. They
> should be validated by a working GM or union bookkeeper before anyone files with them.

---

## Conventions

- **Read the Next.js docs in `node_modules/next/dist/docs/` before writing code** — this
  version has breaking changes from what you may remember. See `AGENTS.md`.
- Currency is CAD and always formatted through `fmt()` — never format money inline, or it
  will bypass edition masking.
- `npx tsc --noEmit` is the only safety net (there are no tests). Run it before committing.
- Verify both editions build when touching anything money-adjacent:
  `npm run build:finance && npm run build:production`

---

## Current state

**Working:** productions, tasks, calendar, contracts + obligations, workflows, company
roster, onboarding, wardrobe, housing & travel, per diems, CAEA reports, budgets, revenue,
cash flow, grants, marketing, forecasting, scenario modelling, AI briefs, board reports,
dashboard triage, three editions, role-based access, brandable demo scenarios.

**Known gaps — the honest list:**

- **No backend.** Data is per-browser: no multi-user sync, no backup, no audit trail.
  Clearing site data loses everything. This is the gating dependency for nearly everything
  below.
- **Auth is demo-grade.** Single admin credential stored in source (`lib/auth.ts`), no
  hashing, no recovery. Role accounts are passwordless click-to-login by design, for demos.
- **Don't enter real personal data yet.** The schema includes SIN numbers, banking details,
  and accessibility/health information — PIPEDA-relevant categories that currently sit
  unencrypted in a browser. The fields exist so the workflows demo end to end.
- **No automated tests.** TypeScript strictness only.
- **Integrations are stubs** apart from Spektrix box-office hooks. QuickBooks, DocuSign,
  Xero, Gusto etc. are UI placeholders.
- Roster headshots hotlink to randomuser.me placeholders.

**Likely next moves:** pick a design-partner theatre, validate the CAEA math with them,
and scope the backend + auth layer.
