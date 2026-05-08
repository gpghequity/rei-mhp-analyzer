# REI Baby Analyzer

Operator-grade pre-LOI deal analyzer. Sits between Fast Calc / Rehab Calc (quick screen + repair budget) and the future Heavy Analyzer (Math Bible production rebuild).

## Isolation guarantees (the whole reason this repo exists)

This tool is a **fully standalone** repo. It has **zero code dependencies** on any other `rei-*` tool. Specifically:

- No npm dependency on Fast Calc, Rehab Calc, Doc Reader, Deal Intake, Lending Intake, Manager, or gorilla-ai
- No git submodules
- No `file:` protocol references
- No symlinks

The math engine inside `src/math/` is **ported** (verbatim copy) from authoritative sources. Each ported file carries a provenance comment showing the source repo, file path, commit hash, and date of the port. Once ported, the file evolves independently in this repo — a future change to gorilla-ai's Math Bible or Fast Calc's math has zero effect on Baby Analyzer.

## Math source map

| Module | Source repo | Source path | Port date |
|---|---|---|---|
| `src/math/storage.js` | gorilla-ai | `lib/math/storage.js` | (commit 2) |
| `src/math/residential.js` | gorilla-ai | `lib/math/residential.js` | (commit 2) |
| `src/math/kicker.js` | gorilla-ai | `lib/math/kicker.js` | (commit 2) |
| `src/math/sunsetTest.js` | gorilla-ai | `lib/math/sunsetTest.js` | (commit 2) |
| `src/math/rampTest.js` | gorilla-ai | `lib/math/rampTest.js` | (commit 2) |
| `src/math/scenarioEngine.js` | gorilla-ai | `lib/math/scenarioEngine.js` | (commit 2) |
| `src/math/constants.js` | gorilla-ai | `lib/math/constants.js` | (commit 2) |
| `src/config/defaults.json` | gorilla-ai | `configs/defaults.json` | (commit 2) |
| `src/math/mhp.js` | rei-fast-calc | `src/math/mhp.js` | (commit 2) |
| `src/math/commercial.js` | (none — placeholder for future) | — | — |

## Inter-tool communication

Baby Analyzer talks to other tools **only via stable contracts**, never code:

- **Reads `rei.deal.v1` URL params** from Fast Calc / Rehab Calc deep links (data contract, not code)
- **Calls `rei-doc-reader` over HTTP** for live comp lookups (HTTP contract, not code)
- **Outputs an LOI-prep summary** as plain text / printable HTML (no shared component library)

## Drift policy

Drift between Baby Analyzer's math and the source (Math Bible / Fast Calc) is **acceptable and expected**. It is the cost of bulletproof isolation. Periodic drift audits surface differences when they matter; the operator decides whether to re-port.

## Tabs

| Tab | Math source | Status |
|---|---|---|
| Storage | Math Bible v3 | scaffold (v0.0.1), wired (v0.1) |
| Residential (Flip + Rental) | Math Bible v3 | scaffold (v0.0.1), wired (v0.1) |
| MHP | Fast Calc V2.6 (Math Bible has no MHP module) | scaffold (v0.0.1), wired (v0.1) |
| Commercial | placeholder | reserved scaffolding |

## Local dev

```bash
npm install
npm run dev
npm run test:run
```

Build target is Vercel (same as Fast Calc / Rehab Calc). Deploy is local-first / operator-driven; no auto-deploys from this repo.
