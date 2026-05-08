// PORTED FROM gorilla-ai/lib/math/verdict.js@63c651c on 2026-05-08
// Math is verbatim. Modifications: CommonJS → ESM only.
// Storage deal verdict computation — pure function, no I/O.
//
// Verdict vocabulary (5-value, frozen): PASS | PURSUE | TENANTIVE | NEGOTIATE | KILL
//   PASS       — Group A or C cleared pocket floor at 1.25x
//   PURSUE     — Group B at 1.25x penciled (seller-finance only)
//   TENANTIVE  — Math may pencil but data-quality gate not met
//   NEGOTIATE  — Only 1.15x stretch lens penciled with ramp test passing
//   KILL       — Nothing penciled at any lens, or 1.15x ramp test failed
//
// TENANTIVE anti-upgrade rule (Brief 3b E2):
//   Pro-forma alone NEVER clears a deal. T-12 + rent roll + occupancy must all be
//   human-verified (Steve / team / qualified third party). If any is missing, verdict
//   is TENANTIVE regardless of how the math pencils.

export function computeStorageVerdict(scenarioEngineOutput, dataFlags) {
  const flags = dataFlags || {}
  const reasonCodes = []
  const blockingFlags = []

  const dataGate = checkDataQualityGate(flags)
  if (!dataGate.cleared) {
    blockingFlags.push(...dataGate.missing)
    return {
      verdict: 'TENANTIVE',
      severity: 'GRAY',
      reasonCodes: ['DATA_QUALITY_GATE_FAILED', ...dataGate.missing.map(m => `MISSING_${m.toUpperCase()}`)],
      blockingFlags
    }
  }

  const scenarios = scenarioEngineOutput.scenarios || []
  const groupA125 = scenarios.filter(s => s.group === 'A' && s.dscrLens === 1.25)
  const groupB125 = scenarios.filter(s => s.group === 'B' && s.dscrLens === 1.25)
  const groupC125 = scenarios.filter(s => s.group === 'C' && s.dscrLens === 1.25)
  const any115 = scenarios.filter(s => s.dscrLens === 1.15)

  const aPassed = groupA125.some(s => s.pocket && s.pocket.clearsFloor)
  const cPassed = groupC125.some(s => s.pocket && s.pocket.clearsFloor)
  if (aPassed || cPassed) {
    if (aPassed) reasonCodes.push('GROUP_A_125X_CLEARS_POCKET_FLOOR')
    if (cPassed) reasonCodes.push('GROUP_C_125X_CLEARS_POCKET_FLOOR')
    return { verdict: 'PASS', severity: 'GREEN', reasonCodes, blockingFlags }
  }

  const bPassed = groupB125.some(s => s.pocket && s.pocket.clearsFloor)
  if (bPassed) {
    reasonCodes.push('GROUP_B_125X_PENCILS_SELLER_FINANCE_ONLY')
    return { verdict: 'PURSUE', severity: 'YELLOW', reasonCodes, blockingFlags }
  }

  const ramped = any115.filter(s => s.rampResult && s.rampResult.pass)
  if (ramped.length > 0) {
    reasonCodes.push('STRETCH_LENS_115X_RAMP_PASS')
    return { verdict: 'NEGOTIATE', severity: 'YELLOW', reasonCodes, blockingFlags }
  }

  reasonCodes.push('NO_LENS_CLEARS_AT_ANY_GROUP')
  return { verdict: 'KILL', severity: 'RED', reasonCodes, blockingFlags }
}

export function checkDataQualityGate(flags) {
  const required = ['t12Verified', 'rentRollVerified', 'occupancyVerified']
  const missing = required.filter(k => !flags[k])

  const acceptableVerifiers = ['Steve', 'team', 'qualified third party']
  const verifierOK = !!flags.verifiedBy && acceptableVerifiers.includes(flags.verifiedBy)

  if (missing.length > 0 || !verifierOK) {
    if (!verifierOK && missing.length === 0) missing.push('verifier')
    return { cleared: false, missing }
  }
  return { cleared: true, missing: [] }
}
