// READING FROM shared-underwriting-standards (single source of truth)
// Updated 2026-06-09: Removed local defaults.json snapshot, now reads live from platform standards
// All tools (Baby Analyzer, Fast Calc, Lender Command, etc.) use same constants from shared pkg.

import STANDARDS from 'shared-underwriting-standards'

export function loadConstants() {
  const flat = {}

  // Flatten RESIDENTIAL standards
  const RES = STANDARDS.RESIDENTIAL || {}
  flat.RATE_BANK_RESI = RES.mortgageRate
  flat.AMORT_BANK_RESI = RES.amortizationYears
  flat.LTV_RESI = RES.ltv
  flat.DSCR_RESI = RES.dscr

  // Flatten STORAGE standards
  const STOR = STANDARDS.STORAGE || {}
  flat.RATE_BANK_STORAGE = STOR.mortgageRate
  flat.AMORT_BANK_STORAGE = STOR.amortizationYears
  flat.LTV_STORAGE = STOR.ltv
  flat.DSCR_CONSERVATIVE = STOR.dscrConservative || 1.25
  flat.DSCR_STRETCH = STOR.dscrStretch || 1.15

  // Flatten GLOBAL constants
  const GLOB = STANDARDS.GLOBAL || {}
  flat.POCKET_FLOOR = GLOB.pocketCashFloor || 10000
  flat.EXPENSE_FLOOR = 0.35

  // Calculate K constants from rates + amortization
  flat.K_BANK_STORAGE = annualLoanConstant(flat.RATE_BANK_STORAGE, flat.AMORT_BANK_STORAGE)
  flat.K_BANK_RESI    = annualLoanConstant(flat.RATE_BANK_RESI,    flat.AMORT_BANK_RESI)
  flat.K_OWNER_IO     = 0.08
  flat.K_OWNER_AMORT  = annualLoanConstant(0.08, 25)

  return flat
}

export function annualLoanConstant(annualRate, amortYears) {
  const r = annualRate / 12
  const n = amortYears * 12
  const monthlyFactor = (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
  return monthlyFactor * 12
}
