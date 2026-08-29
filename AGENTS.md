<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# StageOS

Production management for Canadian regional theatre. See `README.md` for the full
orientation — architecture, project map, and known gaps. Key rules for working here:

## Editions — read this before touching anything money-related

The app ships as three editions (Full / Finance / Production) from one codebase, selected
by `NEXT_PUBLIC_STAGEOS_EDITION` or the login-screen picker. **The Production edition must
never display a dollar amount anywhere.**

- Guard every money-rendering branch with `SHOW_MONEY` from `lib/edition.ts`.
- Always format currency through `fmt()` in `lib/utils.ts` — it masks amounts centrally.
  Formatting money inline (`toLocaleString`, template strings, chart tick formatters)
  bypasses that and leaks.
- Money **inputs** must be hidden too, not just displays — a pre-filled fee field leaks the
  value. Hide the field; leave the stored value untouched on save.
- CSV exports go through `csvMoney()` in `lib/company.ts`.
- Pages that are inherently financial but live inside a Production-allowed section wrap in
  `<FinanceOnly>`.

After such a change, verify both: `npm run build:finance && npm run build:production`.

## Data

All state is one Zustand store (`lib/store.ts`) persisted to localStorage — no database, no
server persistence. Users flagged `freshWorkspace` in `lib/auth.ts` get a separate storage
partition, which is why login uses full page navigations rather than `router.push`.

## Checks

`npx tsc --noEmit` before committing — there are no tests, so this is the only safety net.

## Security

Never write the admin credentials from `lib/auth.ts` into commits, comments, logs, docs, or
any other artifact. Reference the file instead.
