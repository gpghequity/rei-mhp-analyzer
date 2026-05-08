// PORTED FROM gorilla-ai/lib/math/rampTest.js@63c651c on 2026-05-08
// Math is verbatim. Modifications: CommonJS → ESM only.
// Quick test: does Y1 hit DSCR_STRETCH (1.15x) AND Y2 (after conservative
// growth) hit DSCR_CONSERVATIVE (1.25x)? Used to validate stretch-lens
// offers — if a 1.15x offer doesn't ramp to 1.25x within a year, kill it.

import { loadConstants } from './constants.js'

export function rampTest(noiY1, bankAnnualDS) {
  const C = loadConstants()
  const dscrY1 = noiY1 / bankAnnualDS
  const noiY2 = noiY1 * (1 + C.NOI_GROWTH_CONSERVATIVE)
  const dscrY2 = noiY2 / bankAnnualDS

  return {
    dscrY1,
    dscrY2,
    noiY2,
    pass: dscrY1 >= C.DSCR_STRETCH && dscrY2 >= C.DSCR_CONSERVATIVE,
    flag: (dscrY1 >= C.DSCR_STRETCH && dscrY2 >= C.DSCR_CONSERVATIVE) ? 'PASS' : 'FAIL'
  }
}
