// PLACEHOLDER — implementation pending per docs/COMMERCIAL_BRIEF_V1.md.
//
// When the Commercial module is built, the brief calls for:
//   - Spreadsheet-feel rent roll (8 visible columns, expanded toggle)
//   - 6 lease types (NNN / NN / Modified Gross / FSG / % rent / Ground)
//   - Auto-recoveries by lease type (NNN: T+I+CAM, NN: T+I, MG: 1 line, etc.)
//   - GSI from base rent + reimbursements + other income
//   - EGI = GSI × (1 − econVacancy) × (1 − collectionLoss)
//   - 3-card MVM stack (0% / 20% / 30%) — same pattern as storage / MHP
//   - Per-card NOI / max purchase / DSCR / CoC / cap rate
//   - WALT, rollover schedule, tenant concentration, lease type mix
//   - V1 warnings: top tenant > 40%, WALT < 3yr, DSCR < 1.20, vacancy > 20%, etc.
//
// Per the platform isolation rule, when this module is implemented it ships as a
// self-contained file (its own annualLoanConstant + lender constants) — no imports
// from storage.js / mhp.js / residential.js. Reuse the pattern, not the code.
//
// Provenance comment template for the implementation:
//   // PORTED FROM docs/COMMERCIAL_BRIEF_V1.md (V1 spec) on YYYY-MM-DD
//   // V1 scope: current contract rent only, single $/SF reserves, V2 deferred.

export function calcCommercial() {
  throw new Error(
    'Commercial module not yet implemented. See docs/COMMERCIAL_BRIEF_V1.md for the V1 spec.'
  )
}
