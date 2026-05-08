// PORTED FROM gorilla-ai/lib/math/constants.js@63c651c on 2026-05-08
// Baby Analyzer uses snapshot-copy of Math Bible v3 — no live import from gorilla-ai.
//
// Modifications from source (driven by Vite/browser environment, not by intent):
//   1. CommonJS → ESM (require/module.exports → import/export).
//   2. fs.readFileSync removed — defaults.json is imported as a JSON module by Vite.
//   3. Customer override pattern (customers/{id}.json) dropped — Baby Analyzer is a
//      single-operator tool. To customize constants, edit src/config/defaults.json
//      directly. If multi-customer support is needed later, it ports in independently.
//
// Math is otherwise verbatim. annualLoanConstant signature + computation unchanged.

import defaultsRaw from '../config/defaults.json'

export function loadConstants() {
  const flat = {}
  for (const [key, group] of Object.entries(defaultsRaw)) {
    if (key === '_provenance') continue
    if (group && typeof group === 'object') Object.assign(flat, group)
  }

  flat.K_BANK_STORAGE = annualLoanConstant(flat.RATE_BANK_STORAGE, flat.AMORT_BANK_STORAGE)
  flat.K_BANK_RESI    = annualLoanConstant(flat.RATE_BANK_RESI,    flat.AMORT_BANK_RESI)
  flat.K_SELLER       = annualLoanConstant(flat.RATE_SELLER,       flat.AMORT_SELLER)
  flat.K_OWNER_AMORT  = annualLoanConstant(flat.RATE_OWNER,        flat.AMORT_OWNER)
  flat.K_OWNER_IO     = flat.RATE_OWNER
  flat.K_REFI_15      = annualLoanConstant(flat.RATE_REFI,         flat.AMORT_REFI)

  return flat
}

export function annualLoanConstant(annualRate, amortYears) {
  const r = annualRate / 12
  const n = amortYears * 12
  const monthlyFactor = (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
  return monthlyFactor * 12
}
