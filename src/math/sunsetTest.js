// PORTED FROM gorilla-ai/lib/math/sunsetTest.js@63c651c on 2026-05-08
// Math is verbatim. Modifications: CommonJS → ESM only.
// Y3/Y5/Y7/Y10 refi gap calculator — stress test for seller-note balloon
// structures. Projects NOI forward at conservative growth, computes
// remaining seller balance, max refinance loan at refi rate, and flags
// the deal DURABLE / FRAGILE / FAIL based on post-refi DSCR and gap.

import { loadConstants } from './constants.js'

export function sunsetTest(sellerBalance, noiYear1, entryCapRate) {
  const C = loadConstants()
  const checkpoints = [3, 5, 7, 10]

  return checkpoints.map(yearN => {
    const noiN = noiYear1 * Math.pow(1 + C.NOI_GROWTH_CONSERVATIVE, yearN - 1)
    const remainingBalance = remainingPrincipal(sellerBalance, C.K_SELLER, C.AMORT_SELLER, yearN)
    const valueN = noiN / entryCapRate
    const maxRefiLoan = valueN * C.LTV_STORAGE
    const refiGap = Math.max(0, remainingBalance - maxRefiLoan)
    const newDS = maxRefiLoan * C.K_REFI_15
    const postSunsetDSCR = noiN / newDS

    let flag
    if (postSunsetDSCR < 1.0) flag = 'FAIL'
    else if (postSunsetDSCR < C.DSCR_CONSERVATIVE || refiGap > 0) flag = 'FRAGILE'
    else flag = 'DURABLE'

    return { yearN, noiN, remainingBalance, valueN, maxRefiLoan, refiGap, newDS, postSunsetDSCR, flag }
  })
}

export function remainingPrincipal(loan, annualK, amortYears, yearsPaid) {
  const r = annualK / 12
  const n = amortYears * 12
  const m = yearsPaid * 12
  const factor = (Math.pow(1 + r, n) - Math.pow(1 + r, m)) / (Math.pow(1 + r, n) - 1)
  return loan * factor
}
