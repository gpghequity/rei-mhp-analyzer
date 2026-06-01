// qa.test.js — the DEPLOY GUARDRAIL for the QA harness.
// Proves: ≥1 fixture per asset class passes, storage capital-stack passes,
// multifamily routing passes, land no-fake-offer passes. If any fail, do not deploy.

import { describe, it, expect } from 'vitest'
import { runAllFixtures, runRouting, runLandGuards } from '../qa/runner.js'
import { ASSET_CLASSES } from '../qa/fixtures.js'
import calcHandler from '../../api/calc.js'

// Node calc wrapper — drives the real /api/calc handler synchronously.
const calc = async (type, inputs) => {
  let o
  calcHandler({ method: 'POST', body: { type, inputs } }, { status() { return this }, json(x) { o = x; return this } })
  return o.result
}

describe('QA harness — deploy guardrail', () => {
  it('every fixture passes against the frozen Math Bible goldens', async () => {
    const { results, failCount } = await runAllFixtures(calc)
    const failures = results.filter((r) => !r.pass).map((r) => `${r.label}: ${r.checks.filter((c) => !c.pass).map((c) => `${c.label}(exp ${c.expected}, got ${c.actual})`).join('; ')}`)
    expect(failures, failures.join(' | ')).toEqual([])
    expect(failCount).toBe(0)
  })

  it('at least one passing fixture per asset class', async () => {
    const { results } = await runAllFixtures(calc)
    for (const cls of ASSET_CLASSES) {
      const passing = results.some((r) => r.assetClass === cls && r.pass)
      expect(passing, `no passing fixture for ${cls}`).toBe(true)
    }
  })

  it('storage capital-stack invariants pass (75/25, 8% borrower-only, 5% seller-only, DSCR bank-only, pocket)', async () => {
    const { results } = await runAllFixtures(calc)
    const storage = results.find((r) => r.id === 'storage')
    const stack = storage.checks.filter((c) => c.label.startsWith('STACK:'))
    expect(stack.length).toBeGreaterThanOrEqual(7)
    expect(stack.every((c) => c.pass)).toBe(true)
  })

  it('multifamily / engine routing validation passes', async () => {
    const routing = await runRouting(calc)
    const fails = routing.rows.filter((r) => !r.pass).map((r) => r.label)
    expect(fails, fails.join(' | ')).toEqual([])
    expect(routing.pass).toBe(true)
  })

  it('land no-fake-offer guards pass', () => {
    const land = runLandGuards()
    const fails = land.rows.filter((r) => !r.pass).map((r) => r.label)
    expect(fails, fails.join(' | ')).toEqual([])
    expect(land.pass).toBe(true)
  })
})
