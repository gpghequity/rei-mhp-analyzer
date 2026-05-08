// PORTED FROM gorilla-ai/lib/math/scenarioEngine.js@63c651c on 2026-05-08
// Math is verbatim. Modifications: CommonJS → ESM only; customerId param dropped
// (Baby Analyzer is single-operator — see constants.js for rationale).
// Orchestrator — runs all 14 storage scenarios (3 groups × 2 lenses × 3 owner-equity
// treatments where applicable) or all residential modes, returning structured output.

import * as storage from './storage.js'
import * as residential from './residential.js'
import * as kicker from './kicker.js'
import * as sunset from './sunsetTest.js'
import * as ramp from './rampTest.js'

export function runStorageDeal(dealInputs) {
  const { grossDollarsIn, sellerStatedExpensePct, annualOpEx, kickerOptions } = dealInputs

  const noiResult = storage.storageNOI(grossDollarsIn, sellerStatedExpensePct)
  const noi = noiResult.noi

  const scenarios = []
  const lenses = [1.25, 1.15]
  const treatments = ['sunk', 'io', 'amort']

  for (const lens of lenses) {
    for (const treatment of treatments) {
      const result = storage.groupA_maxPurchase(noi, lens)
      const equityCost = storage.ownerEquityCost(result.equityAmount, treatment)
      const pocket = storage.pocketCash(noi, result.bankAnnualDS, 0, equityCost, 0)
      const equityReq = storage.groupA_equityRequirement(result.maxPurchase, result.bankAnnualDS, annualOpEx)
      const rampResult = result.requiresRampTest ? ramp.rampTest(noi, result.bankAnnualDS) : null
      scenarios.push({ ...result, treatment, equityCost, pocket, equityReq, rampResult })
    }
  }

  for (const lens of lenses) {
    for (const treatment of treatments) {
      const result = storage.groupB_maxPurchase(noi, lens)
      const equityCost = storage.ownerEquityCost(result.equityAmount, treatment)
      const pocket = storage.pocketCash(noi, 0, result.sellerAnnualDS, equityCost, 0)
      const rampResult = result.requiresRampTest ? ramp.rampTest(noi, result.sellerAnnualDS) : null
      const sellerLoan = result.maxPurchase * 0.75
      const entryCap = noi / result.maxPurchase
      const sunsetResult = sunset.sunsetTest(sellerLoan, noi, entryCap)
      scenarios.push({ ...result, treatment, equityCost, pocket, rampResult, sunsetResult })
    }
  }

  for (const lens of lenses) {
    const result = storage.groupC_maxPurchase(noi, lens)
    const pocket = storage.pocketCash(noi, result.bankAnnualDS, result.sellerAnnualPI, 0, 0)
    const rampResult = result.requiresRampTest ? ramp.rampTest(noi, result.bankAnnualDS) : null
    const entryCap = noi / result.maxPurchase
    const sunsetResult = sunset.sunsetTest(result.equityAmount, noi, entryCap)
    scenarios.push({ ...result, pocket, rampResult, sunsetResult })
  }

  let kickerProj = null
  if (kickerOptions) {
    kickerProj = kicker.kickerProjection(
      noi,
      kickerOptions.growthRate || 0.03,
      kickerOptions.pct,
      kickerOptions.cap,
      kickerOptions.windowYears
    )
  }

  return { inputs: dealInputs, noiResult, scenarios, kickerProj }
}

export function runResidentialDeal(dealInputs) {
  const { grossDollarsIn, hardCosts, arv, rehab, comps } = dealInputs

  const arvResult = comps ? residential.arv40thPercentile(comps) : { arv, confidence: 'OPERATOR_PROVIDED', flag: null }
  const usedARV = arvResult.arv || arv

  const modes = residential.residentialAllModes(grossDollarsIn, hardCosts)
  const mao = residential.residentialMAO(usedARV, rehab)

  const dscrLight    = residential.residentialDSCR(modes.light.noi,    mao.endBuyer)
  const dscrStandard = residential.residentialDSCR(modes.standard.noi, mao.endBuyer)
  const dscrHarsh    = residential.residentialDSCR(modes.harsh.noi,    mao.endBuyer)

  const hardMode = residential.ownerHardMode(modes.standard.noi, rehab)

  return {
    inputs: dealInputs,
    arvResult,
    modes,
    mao,
    dscr: { light: dscrLight, standard: dscrStandard, harsh: dscrHarsh },
    ownerHardMode: hardMode
  }
}
