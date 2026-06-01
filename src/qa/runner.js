// src/qa/runner.js
//
// Runs each QA fixture through the REAL Baby Analyzer engines and compares the
// output to the frozen golden values. Adds NO math — it only calls:
//   - buildIncomeMatrix()  (storage / MF-20+ / commercial / MHP / mixed)
//   - calc(type, inputs)   (injected → /api/calc: residential_*, multifamily_small)
//   - landMetrics()        (land / IOS)
// …and asserts engine output == frozen expectation (drift detection) plus the
// structural capital-stack invariants the Math Bible requires.

import { buildIncomeMatrix, isIncomeAsset, bankTermsFor } from '../components/analyze/incomeMatrix.js'
import { landMetrics } from '../math/land.js'
import { getType } from '../components/analyze/typeMap.js'
import { loadConstants } from '../math/constants.js'
import { FIXTURES, K, POCKET_FLOOR } from './fixtures.js'

const r0 = (n) => Math.round(n)
const num = (v) => (typeof v === 'number' && Number.isFinite(v))

// One comparison row. expected may be number | string | null | boolean.
function chk(label, expected, actual, tol, formula, section) {
  let pass, diff
  if (num(expected) && num(actual)) {
    diff = actual - expected
    pass = Math.abs(diff) <= tol
  } else {
    diff = null
    pass = expected === actual
  }
  return { label, expected, actual, diff, tol, pass, formula: formula || '', section: section || '' }
}

function statusFromPocket(pocket) { return pocket >= POCKET_FLOOR ? 'CLEARS_FLOOR' : 'BELOW_FLOOR' }

// ── Matrix (income) fixtures ────────────────────────────────────────────────
function runMatrix(fx) {
  const m = buildIncomeMatrix({ assetType: fx.type, noi: fx.noi })
  const bo = m.rows.find((r) => r.structureKey === 'bank_only' && r.dscr === 1.25)
  const sf = m.rows.find((r) => r.structureKey === 'seller_fi' && r.dscr === 1.25)
  const e = fx.expected
  const expK = e.rate === 0.0725 ? K.STORAGE : K.RESI
  const ltv = m.bankTerms.ltv
  const checks = [
    chk('LTV', e.ltv, ltv, 0, 'asset-correct LTV', fx.bibleSection),
    chk('Loan constant K (encodes rate+amort)', expK, m.bankTerms.K, 1e-6, `${(e.rate * 100).toFixed(2)}% / ${e.amort}-yr`, fx.bibleSection),
    chk('Max purchase @1.25 (conservative)', e.maxPurchase, m.summary.conservativeValue, 1, fx.formula, fx.bibleSection),
    chk('Aggressive value @1.15', e.aggressive, m.summary.aggressiveValue, 1, 'NOI ÷ (1.15 × LTV × K)', fx.bibleSection),
    chk('Bank amount (bank-only)', e.bank, bo.bank, 1, 'offer × LTV', fx.bibleSection),
    chk('Borrower equity (bank-only)', e.borrower, bo.borrower, 1, 'offer − bank', fx.bibleSection),
    chk('Pocket money (bank-only)', e.pocket, r0(bo.pocketMoney), 1, 'NOI − bank annual DS', fx.bibleSection)
  ]
  // Seller-finance structure (where the fixture provides it)
  if (e.sfSeller != null) {
    checks.push(
      chk('Seller-FI: borrower cash', e.sfBorrower, sf.borrower, 1, 'min($100k, equity gap)', fx.bibleSection),
      chk('Seller-FI: seller note', e.sfSeller, sf.sellerFi, 1, 'equity gap − $100k', fx.bibleSection),
      chk('Seller-FI: 8% borrower cost', e.sfBorrowerCost, r0(sf.borrowerCost), 1, 'borrower cash × 8% (IO)', fx.bibleSection),
      chk('Seller-FI: 5% seller payment', e.sfSellerPayment, r0(sf.sellerPayment), 2, 'seller note × K_SELLER (5%/25yr)', fx.bibleSection)
    )
  }
  // Capital-stack invariants (proves the stack holds, not just the goldens)
  if (fx.capitalStack) {
    const equity = bo.offer - bo.bank
    const bankDscr = Math.round((fx.noi / bo.bankPayment) * 10000) / 10000
    checks.push(
      chk('STACK: bank = 75% of offer', r0(bo.offer * ltv), bo.bank, 1, 'bank ≡ offer × 0.75', fx.bibleSection),
      chk('STACK: equity gap = 25% of offer', r0(bo.offer * (1 - ltv)), equity, 1, 'equity ≡ offer × 0.25', fx.bibleSection),
      chk('STACK: borrower cash + seller note = equity gap', equity, sf.borrower + sf.sellerFi, 1, '$100k + seller note ≡ equity gap', fx.bibleSection),
      chk('STACK: 8% applies to borrower cash only', r0(sf.borrower * 0.08), r0(sf.borrowerCost), 1, 'not the full price', fx.bibleSection),
      chk('STACK: 5% applies to seller note only', r0(sf.sellerFi * K.SELLER), r0(sf.sellerPayment), 2, 'not the full price', fx.bibleSection),
      chk('STACK: DSCR uses BANK debt only (≈1.25)', 1.25, bankDscr, 0.01, 'NOI ÷ bank annual DS', fx.bibleSection),
      chk('STACK: pocket = NOI − bank − borrowerCost − sellerPmt', r0(fx.noi - sf.bankPayment - sf.borrowerCost - sf.sellerPayment), r0(sf.pocketMoney), 1, 'all recurring obligations', fx.bibleSection)
    )
  }
  const display = {
    ltv, rate: e.rate, amort: e.amort, dscrLens: e.dscrLens,
    maxPurchase: m.summary.conservativeValue, offer: bo.offer, bank: bo.bank,
    borrower: bo.borrower, seller: e.sfSeller != null ? sf.sellerFi : null,
    pocket: r0(bo.pocketMoney), status: statusFromPocket(bo.pocketMoney)
  }
  return finalize(fx, checks, display)
}

// ── /api/calc fixtures (residential, MF 1-19) ───────────────────────────────
async function runCalc(fx, calc) {
  const res = await calc(fx.calc.type, fx.calc.inputs)
  const e = fx.expected
  let checks = []
  let display = { ltv: e.ltv, rate: e.rate, amort: e.amort, dscrLens: e.dscrLens }
  if (fx.calc.type === 'residential_mao') {
    checks = [chk('Max offer (MAO)', e.maxOffer, res.maxOffer, 1, fx.formula, fx.bibleSection)]
    display = { ...display, maxPurchase: null, offer: res.maxOffer, bank: null, borrower: null, seller: null, pocket: null, status: 'MAO_COMPUTED' }
  } else if (fx.calc.type === 'residential_dscr') {
    checks = [
      chk('LTV (loan = purchase × 0.80)', e.loan, res.loan, 1, '80/20 residential', fx.bibleSection),
      chk('DSCR', e.dscr, Math.round(res.dscr * 10000) / 10000, 0.001, 'NOI ÷ (loan × K_BANK_RESI)', fx.bibleSection),
      chk('Pocket (NOI − bank DS)', e.pocket, r0(res.pocketCashAnnual), 1, 'NOI − annual DS', fx.bibleSection)
    ]
    display = { ...display, maxPurchase: null, offer: null, bank: res.loan, borrower: null, seller: null, pocket: r0(res.pocketCashAnnual), status: res.dscr >= 1.25 ? 'DSCR_PASS' : 'DSCR_FAIL' }
  } else if (fx.calc.type === 'multifamily_small') {
    const pocket = r0(fx.calc.inputs.noi - res.annualDS)
    checks = [
      chk('LTV', e.ltv, res.ltv, 0, '80/20 agency', fx.bibleSection),
      chk('Loan constant K (7%/30yr)', K.RESI, res.K, 1e-6, 'K_BANK_RESI', fx.bibleSection),
      chk('Max purchase @1.25', e.maxPurchase, res.maxPurchase, 1, fx.formula, fx.bibleSection),
      chk('Offer (− $10k)', e.offer, res.yourOffer, 1, 'P_max − wholesale fee', fx.bibleSection),
      chk('Bank amount', e.bank, res.bankLoan, 1, 'P_max × 0.80', fx.bibleSection),
      chk('DSCR (sized to 1.25)', e.dscr, Math.round(res.actualDSCR * 10000) / 10000, 0.001, 'NOI ÷ bank DS', fx.bibleSection),
      chk('Pocket (NOI − bank DS)', e.pocket, pocket, 1, 'NOI − annual DS', fx.bibleSection)
    ]
    display = { ...display, maxPurchase: res.maxPurchase, offer: res.yourOffer, bank: res.bankLoan, borrower: r0(res.maxPurchase - res.bankLoan), seller: null, pocket, status: statusFromPocket(pocket) }
  }
  return finalize(fx, checks, display)
}

// ── Land fixtures ───────────────────────────────────────────────────────────
function runLand(fx) {
  const m = landMetrics(fx.inputs)
  const e = fx.expected
  const hasOffer = ('maxPurchase' in m) || ('yourOffer' in m) || ('offer' in m) || ('maxOffer' in m)
  const checks = [chk('NO offer engine (land never prices)', false, hasOffer, 0, 'land has no approved offer engine', fx.bibleSection)]
  if (e.pricePerAcre != null) checks.push(chk('Price / acre', e.pricePerAcre, r0(m.pricePerAcre), 1, 'ask ÷ acres', fx.bibleSection))
  if (e.pricePerSqft != null) checks.push(chk('Price / sq ft', e.pricePerSqft, Math.round(m.pricePerSqft * 10000) / 10000, 0.001, 'ask ÷ (acres×43560)', fx.bibleSection))
  if (e.pricePerTruckSpace != null) checks.push(chk('Price / truck space', e.pricePerTruckSpace, r0(m.pricePerTruckSpace), 1, 'ask ÷ truck spaces', fx.bibleSection))
  if (e.currentIncomeMultiple != null) checks.push(chk('Current income multiple', e.currentIncomeMultiple, m.currentIncomeMultiple, 0.001, 'ask ÷ current income', fx.bibleSection))
  // cap rate: present only with actual income, null otherwise
  checks.push(chk('Cap rate (only if actual income)', e.capRateIfIncome, e.capRateIfIncome == null ? m.capRateIfIncome : Math.round(m.capRateIfIncome * 100000) / 100000, e.capRateIfIncome == null ? 0 : 0.0001, 'current NOI ÷ ask', fx.bibleSection))
  const display = { ltv: null, rate: null, amort: null, dscrLens: 'n/a (intake)', maxPurchase: null, offer: 'NONE (intake)', bank: null, borrower: null, seller: null, pocket: null, status: 'SUPPORTED_INTAKE' }
  return finalize(fx, checks, display)
}

function finalize(fx, checks, display) {
  return {
    id: fx.id, label: fx.label, assetClass: fx.assetClass, type: fx.type,
    engine: fx.engine, bibleSection: fx.bibleSection, formula: fx.formula,
    checks, display, pass: checks.every((c) => c.pass)
  }
}

export async function runFixture(fx, calc) {
  if (fx.engine === 'matrix') return runMatrix(fx)
  if (fx.engine === 'calc') return runCalc(fx, calc)
  if (fx.engine === 'land') return runLand(fx)
  throw new Error(`Unknown engine: ${fx.engine}`)
}

export async function runAllFixtures(calc) {
  const results = []
  for (const fx of FIXTURES) results.push(await runFixture(fx, calc))
  const passCount = results.filter((r) => r.pass).length
  return { results, passCount, failCount: results.length - passCount, total: results.length }
}

// ── Routing validation (engine selection per asset class) ───────────────────
export async function runRouting(calc) {
  const C = loadConstants()
  const rows = []
  const push = (label, expected, actual, formula) => rows.push(chk(label, expected, actual, num(expected) ? 1e-6 : 0, formula, 'Routing rules'))

  // Residential → residential math
  push('Residential flip → residential_mao', 'residential_mao', getType('residential').buildCalc({ arv: 1, rehab: 0 }, 'flip').type, 'never storage')
  push('Residential rental → residential_dscr', 'residential_dscr', getType('residential').buildCalc({ noi: 1, purchase: 1 }, 'rental').type, 'never storage')
  // MF 1-19 → agency/residential-style, NOT storage matrix
  const ms = await calc('multifamily_small', { noi: 120000 })
  push('MF 1–19 LTV = 0.80', 0.80, ms.ltv, '80/20 agency')
  push('MF 1–19 K = K_BANK_RESI (7%/30yr)', C.K_BANK_RESI, ms.K, '7% / 30-yr')
  push('MF 1–19 NOT in storage income matrix', false, isIncomeAsset('multifamily_small'), 'uses agency single-DSCR path')
  // MF 20+ → storage/commercial income (75/25 @ 7.25/25) and matches storage_group_a
  push('MF 20+ LTV = 0.75', 0.75, bankTermsFor('multifamily_large', C).ltv, '75/25 commercial')
  push('MF 20+ K = K_BANK_STORAGE (7.25%/25yr)', C.K_BANK_STORAGE, bankTermsFor('multifamily_large', C).K, '7.25% / 25-yr')
  const lg = await calc('multifamily_large', { noi: 120000 })
  const sa = await calc('storage_group_a', { noi: 120000 })
  push('MF 20+ matches storage-style income math', sa.maxPurchase, lg.maxPurchase, 'identical capital stack')
  // Self storage / commercial / MHP / mixed are income assets
  for (const t of ['self_storage', 'commercial', 'mhp_rv', 'mixed_use']) push(`${t} uses income matrix`, true, isIncomeAsset(t), 'storage/commercial income framework')
  // Land → supported-intake only
  push('Land does NOT route to any income/offer engine', null, getType('ios_land').buildCalc({ noi: 50000 }), 'even WITH income → no offer')
  push('Land is NOT an income-matrix asset', false, isIncomeAsset('ios_land'), 'land supported-intake only')

  return { rows, pass: rows.every((r) => r.pass) }
}

// ── Land guard validation (no fake offers / no borrowed math) ───────────────
export function runLandGuards() {
  const rows = []
  const push = (label, expected, actual, formula) => rows.push(chk(label, expected, actual, 0, formula, 'v3.1 Part 6 — Land'))
  const withIncome = landMetrics({ askingPrice: 1000000, acres: 5, currentIncome: 80000, currentNOI: 56000 })
  const noIncome = landMetrics({ askingPrice: 500000, acres: 5 })
  push('No maxPurchase/offer field on land result', false, ('maxPurchase' in withIncome) || ('yourOffer' in withIncome), 'land never prices an offer')
  push('No ARV used (no arv field)', false, ('arv' in withIncome), 'land ≠ residential ARV')
  push('No DSCR used (no dscr field)', false, ('dscr' in withIncome), 'land ≠ storage DSCR')
  push('Cap rate present only with actual income', true, withIncome.capRateIfIncome != null, 'current NOI ÷ ask')
  push('Cap rate ABSENT when no income', true, noIncome.capRateIfIncome == null, 'no income → no cap rate')
  push('Land buildCalc returns null even with income', null, getType('ios_land').buildCalc({ noi: 90000, askingPrice: 500000 }), 'no offer engine')
  return { rows, pass: rows.every((r) => r.pass) }
}
