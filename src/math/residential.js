// PORTED FROM gorilla-ai/lib/math/residential.js@63c651c on 2026-05-08
// Math is verbatim. Modifications: CommonJS → ESM only.
// Math Bible v3 — flip MAO, rental DSCR (3-card pad stack), Owner Hard Mode, ARV percentile.

import { loadConstants } from './constants.js'

export function residentialNOI(grossDollarsIn, hardCosts, padPct) {
  const pad = grossDollarsIn * padPct
  return {
    grossDollarsIn,
    hardCosts,
    padPct,
    pad,
    noi: grossDollarsIn - hardCosts - pad
  }
}

export function residentialAllModes(grossDollarsIn, hardCosts) {
  const C = loadConstants()
  return {
    light:    residentialNOI(grossDollarsIn, hardCosts, C.PAD_LIGHT),
    standard: residentialNOI(grossDollarsIn, hardCosts, C.PAD_STANDARD),
    harsh:    residentialNOI(grossDollarsIn, hardCosts, C.PAD_HARSH)
  }
}

export function residentialMAO(arv, rehab) {
  const C = loadConstants()
  const endBuyer = (arv * C.MAO_FACTOR) - rehab
  return {
    endBuyer,
    yourOffer: endBuyer - C.WHOLESALE_FEE
  }
}

export function residentialDSCR(noi, purchase) {
  const C = loadConstants()
  const loan = purchase * C.LTV_RESI
  const annualDS = loan * C.K_BANK_RESI
  return {
    loan,
    annualDS,
    dscr: noi / annualDS,
    pass: noi / annualDS >= C.DSCR_RESI
  }
}

export function ownerHardMode(noiStandard, rehab) {
  const C = loadConstants()
  const numerator = (noiStandard / C.DSCR_RESI) - ((rehab + C.CLOSING_RESI) * C.RATE_OWNER)
  const denominator = (C.LTV_RESI * C.K_BANK_RESI) + C.RATE_OWNER
  const pMax = numerator / denominator
  const rounded = Math.floor(pMax / 1000) * 1000
  return {
    pMax: rounded,
    yourOffer: rounded - C.WHOLESALE_FEE,
    note: 'INTERNAL ONLY — not for team report or seller letter.'
  }
}

export function arv40thPercentile(comps) {
  const C = loadConstants()
  if (comps.length < C.ARV_MIN_COMPS) {
    return { arv: null, confidence: 'LOW', flag: `Only ${comps.length} comps; need ${C.ARV_MIN_COMPS}` }
  }
  const prices = comps.map(c => c.salePrice).sort((a, b) => a - b)
  const low = prices[0]
  const high = prices[prices.length - 1]
  const arv = low + C.ARV_PERCENTILE * (high - low)
  return { arv, low, high, confidence: 'NORMAL', flag: null }
}
