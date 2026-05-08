// PORTED FROM gorilla-ai/lib/math/kicker.js@63c651c on 2026-05-08
// Math is verbatim. Modifications: CommonJS → ESM only.
// Year-by-year NOI growth projection with kicker cap. Used for seller-fi
// upside participation (seller takes 20% of NOI growth above baseline,
// capped at $50k cumulative over 5 years by default).

import { loadConstants } from './constants.js'

export function kickerProjection(noiBaseline, growthRate, pct, cap, windowYears) {
  const C = loadConstants()
  pct = pct ?? C.PCT_DEFAULT
  cap = cap ?? C.CAP_DEFAULT
  windowYears = windowYears ?? C.WINDOW_YEARS

  const projection = []
  let cumulative = 0

  for (let year = 1; year <= windowYears; year++) {
    const noiYear = noiBaseline * Math.pow(1 + growthRate, year - 1)
    const growth = Math.max(0, noiYear - noiBaseline)
    const rawKicker = growth * pct
    const remainingCap = cap - cumulative
    const actualKicker = Math.min(rawKicker, Math.max(0, remainingCap))
    cumulative += actualKicker

    projection.push({
      year,
      projectedNOI: noiYear,
      growthAboveBaseline: growth,
      kickerPayment: actualKicker,
      cumulative,
      remainingCap: cap - cumulative
    })
  }

  return projection
}
