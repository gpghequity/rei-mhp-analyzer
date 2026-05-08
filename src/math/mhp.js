// PORTED FROM rei-fast-calc/src/math/mhp.js@a6cb7c3 on 2026-05-08
// Verbatim copy. Math Bible v3 has no MHP module — Fast Calc V2.6 is the only source.
// Modifications: NONE — Fast Calc already uses ESM, so the file copies cleanly.
//
// Source-side comments preserved (V2.5 utility responsibility matrix; V2.6
// self-containment + offer-based CoC). The V2.6 offer-based CoC IS retained here
// even though it differs from Math Bible's maxPurchase-based pattern in storage —
// this is intentional because (a) Math Bible has no MHP module to reconcile against,
// and (b) Fast Calc V2.6 is the authoritative MHP spec.
//
// MHP (Mobile Home Park) math — DSCR-driven valuation with three MVM lenses
// (Bank Only / MVM 20% / MVM 30%). Same valuation framework as storage:
// NOI / DSCR → max bank DS → max senior loan at LTV → max purchase. Seller-fi
// sits on top of remaining equity, same combined-factor pattern as storage.
//
// V1 scope (Steve, 2026-05-01) + lot-count fix (2026-05-03):
//   - Property setup: total lots + 4 disjoint counts (occupiedPoh, vacantPoh,
//     occupiedToh, vacantLots) that must sum to total — hard error otherwise
//   - Income: TOH (occupied) lot rent, POH (occupied) all-in rent, other,
//     vacancy + collection
//   - OpEx: line-item sum + management % of EGI (computed per card)
//   - MVM 0/20/30 pad off GROSS INCOME (post vacancy + collection)
//   - Hard-coded POH 30% expense pad, weighted by POH share of OPERATING units
//   - POH > 25% lender haircut flag uses POH share of TOTAL LOTS
//   - High POH vacancy flag: VacantPOH / TotalPOH > 20%
//   - Significant vacant lot inventory flag: VacantLots / TotalLots > 15%
//   - Per-lot economics: revenue/NOI use Total Occupied; value uses Total Lots
//
// V2.5 utility responsibility matrix (2026-05-06):
//   - Five utilities (water, sewer, trash, electric, gas), each with mode
//     ('tenant-direct' | 'park-paid' | 'submeter'), annual park cost, billback %
//   - Per utility net burden = costAnnual × (1 − recoveryPct) when mode
//     ∈ {park-paid, submeter}, else 0
//
// V2.6 (2026-05-06): self-contained module + audit pass.
//   - Removed import of annualLoanConstant + POCKET_FLOOR from rental.js;
//     both inlined here. No cross-tab math imports.
//   - MHP cash math is offer-based per V2.6 spec (loan = offer × LTV;
//     downPayment = offer × (1 − LTV); etc.). MHP has no rehab field and no
//     wholesaleFee deduction (offer = maxPurchase), so the spec collapses cleanly.
//   - POH OpEx pad: confirmed NOT double-counting.

const POCKET_FLOOR = 10000

function annualLoanConstant(annualRate, amortYears) {
  if (!Number.isFinite(annualRate) || !Number.isFinite(amortYears)) return 0
  if (annualRate <= 0 || amortYears <= 0) return 0
  const r = annualRate / 12
  const n = amortYears * 12
  const monthlyFactor = (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
  return monthlyFactor * 12
}

const MVM_CARDS = [
  { key: 'standard', padPct: 0,    label: 'Bank Only — 0% MVM' },
  { key: 'mvm20',    padPct: 0.20, label: 'MVM 20% — vacancy/management/maintenance' },
  { key: 'mvm30',    padPct: 0.30, label: 'MVM 30% — conservative' }
]

const POH_HEAVY_THRESHOLD = 0.25
const POH_VACANCY_THRESHOLD = 0.20
const VACANT_LOT_THRESHOLD = 0.15
const POH_OPEX_PAD = 0.30

const UTILITY_KEYS = ['water', 'sewer', 'trash', 'electric', 'gas']
const PARK_BURDEN_MODES = new Set(['park-paid', 'submeter'])

export function calcUtilityBurden(utilities) {
  const byUtility = {}
  let totalGrossCost = 0
  let totalRecovered = 0
  let totalBurden = 0

  for (const key of UTILITY_KEYS) {
    const u = utilities?.[key]
    const mode = u?.mode ?? null
    const costAnnual = numOr(u?.costAnnual, 0)
    const recoveryPct = clamp01(numOr(u?.recoveryPct, 0))

    let gross = 0
    let recovered = 0
    let net = 0

    if (PARK_BURDEN_MODES.has(mode) && costAnnual > 0) {
      gross = costAnnual
      if (mode === 'submeter') {
        recovered = costAnnual * recoveryPct
        net = costAnnual - recovered
      } else {
        net = costAnnual
      }
    }

    byUtility[key] = {
      mode,
      costAnnual: numOr(u?.costAnnual, null),
      recoveryPct: numOr(u?.recoveryPct, null),
      gross, recovered, net
    }
    totalGrossCost += gross
    totalRecovered += recovered
    totalBurden += net
  }

  return { byUtility, totalGrossCost, totalRecovered, totalBurden }
}

export function calcMhp(inputs, assumptions) {
  const totalLots = numOr(inputs?.totalLots, 0)
  const occupiedPoh = numOr(inputs?.occupiedPoh, 0)
  const vacantPoh = numOr(inputs?.vacantPoh, 0)
  const occupiedToh = numOr(inputs?.occupiedToh, 0)
  const vacantLots = numOr(inputs?.vacantLots, 0)

  const lotRentMonthly = numOr(inputs?.lotRentMonthly, 0)
  const pohRentMonthly = numOr(inputs?.pohRentMonthly, 0)
  const otherIncomeAnnual = numOr(inputs?.otherIncomeAnnual, 0)

  const tohVacancyPct = numOr(inputs?.tohVacancyPct, 0)
  const pohVacancyPct = numOr(inputs?.pohVacancyPct, 0)
  const collectionLossPct = numOr(inputs?.collectionLossPct, 0)

  const opExSum = numOr(inputs?.opExSum, 0)

  const dscr = numOr(assumptions?.dscr, 0)
  const seniorRate = numOr(assumptions?.seniorRate, 0)
  const seniorAmort = numOr(assumptions?.seniorAmort, 0)
  const seniorLtv = numOr(assumptions?.seniorLtv, 0)
  const sellerFiRate = numOr(assumptions?.sellerFiRate, 0)
  const sellerFiAmort = numOr(assumptions?.sellerFiAmort, 0)
  const sellerFiPct = numOr(assumptions?.sellerFiPct, 0)
  const managementPct = numOr(assumptions?.managementPct, 0)
  const buyerClosingCostsPct = numOr(assumptions?.buyerClosingCostsPct, 0)
  const bankPointsPct = numOr(assumptions?.bankPointsPct, 0)
  const lenderFeesPct = numOr(assumptions?.lenderFeesPct, 0)
  const appraisalFee = numOr(assumptions?.appraisalFee, 0)
  const environmentalFee = numOr(assumptions?.environmentalFee, 0)

  const totalPoh = occupiedPoh + vacantPoh
  const totalToh = occupiedToh
  const totalOccupied = occupiedPoh + occupiedToh
  const accounted = occupiedPoh + vacantPoh + occupiedToh + vacantLots
  const lotMixError = totalLots > 0 && accounted !== totalLots

  const pohShare = totalOccupied > 0 ? totalPoh / totalOccupied : 0
  const pohExposureShare = totalLots > 0 ? totalPoh / totalLots : 0
  const pohHeavy = pohExposureShare > POH_HEAVY_THRESHOLD

  const highPohVacancy = totalPoh > 0 && (vacantPoh / totalPoh) > POH_VACANCY_THRESHOLD
  const highVacantLots = totalLots > 0 && (vacantLots / totalLots) > VACANT_LOT_THRESHOLD

  const tohGpr = occupiedToh * lotRentMonthly * 12
  const pohGpr = occupiedPoh * pohRentMonthly * 12
  const grossPotentialTotal = tohGpr + pohGpr + otherIncomeAnnual
  const pohRevenueShare = grossPotentialTotal > 0 ? pohGpr / grossPotentialTotal : 0

  const tohAfterVac = tohGpr * (1 - tohVacancyPct)
  const pohAfterVac = pohGpr * (1 - pohVacancyPct)
  const incomeAfterVacancy = tohAfterVac + pohAfterVac + otherIncomeAnnual
  const gsi = incomeAfterVacancy * (1 - collectionLossPct)

  const K_bank = annualLoanConstant(seniorRate, seniorAmort)
  const K_seller = annualLoanConstant(sellerFiRate, sellerFiAmort)

  const loanCtx = {
    dscr, seniorLtv, K_bank, K_seller, sellerFiPct,
    bankPointsPct, lenderFeesPct, appraisalFee, environmentalFee,
    buyerClosingCostsPct,
    totalLots, totalOccupied, pohShare, opExSum, managementPct
  }

  const cards = MVM_CARDS.map(({ key, padPct, label }) =>
    computeCard({ key, label, padPct, gsi }, loanCtx)
  )

  const card1 = cards[0]

  return {
    totalLots, occupiedPoh, vacantPoh, occupiedToh, vacantLots,
    totalPoh, totalToh, totalOccupied, accounted,
    lotMixError,
    pohShare, pohExposureShare, pohRevenueShare,
    pohHeavy, highPohVacancy, highVacantLots,
    tohGpr, pohGpr, otherIncomeAnnual,
    grossPotentialTotal, incomeAfterVacancy, gsi,
    K_bank, K_seller,
    cards,
    noi: card1.noi,
    egi: card1.egi,
    opEx: card1.opEx,
    maxPurchase: card1.maxPurchase,
    maxSeniorLoan: card1.maxSeniorLoan,
    sellerFiAmount: card1.sellerFiAmount,
    cashEquity: card1.cashEquity,
    bankAnnualDS: card1.bankAnnualDS,
    sellerAnnualDS: card1.sellerAnnualDS,
    totalAnnualDS: card1.totalAnnualDS,
    pocketCashAnnual: card1.pocketCashAnnual,
    pocketCashMonthly: card1.pocketCashMonthly,
    totalCashToClose: card1.totalCashToClose,
    cashOnCash: card1.cashOnCash,
    impliedCap: card1.impliedCap,
    valuePerLot: card1.valuePerLot,
    noiPerLot: card1.noiPerLot,
    revenuePerLot: card1.revenuePerLot
  }
}

function computeCard({ key, label, padPct, gsi }, ctx) {
  const {
    dscr, seniorLtv, K_bank, K_seller, sellerFiPct,
    bankPointsPct, lenderFeesPct, appraisalFee, environmentalFee,
    buyerClosingCostsPct,
    totalLots, totalOccupied, pohShare, opExSum, managementPct
  } = ctx

  const egi = gsi * (1 - padPct)

  const managementFee = egi * managementPct
  const opExBase = opExSum + managementFee
  const pohPad = opExBase * POH_OPEX_PAD * pohShare
  const opEx = opExBase + pohPad
  const noi = egi - opEx

  if (!(noi > 0) || !(dscr > 0) || !(seniorLtv > 0) || !(K_bank > 0)) {
    return zeroCard({ key, label, padPct, egi, opEx, opExBase, managementFee, pohPad, noi })
  }

  const denom = dscr * seniorLtv * K_bank
  const rawPurchase = noi / denom
  const maxPurchase = Math.floor(rawPurchase / 1000) * 1000

  if (!(maxPurchase > 0)) {
    return zeroCard({ key, label, padPct, egi, opEx, opExBase, managementFee, pohPad, noi })
  }

  const maxSeniorLoan = maxPurchase * seniorLtv
  const remainingEquity = maxPurchase * (1 - seniorLtv)
  const sellerFiAmount = remainingEquity * sellerFiPct
  const cashEquity = remainingEquity * (1 - sellerFiPct)

  const bankAnnualDS = maxSeniorLoan * K_bank
  const sellerAnnualDS = sellerFiAmount * K_seller
  const totalAnnualDS = bankAnnualDS + sellerAnnualDS

  const bankPoints = maxSeniorLoan * bankPointsPct
  const lenderFees = maxSeniorLoan * lenderFeesPct
  const totalBankFees = bankPoints + lenderFees + appraisalFee + environmentalFee
  const buyerClosingCosts = maxPurchase * buyerClosingCostsPct
  const totalCashToClose = cashEquity + totalBankFees + buyerClosingCosts

  const pocketCashAnnual = noi - totalAnnualDS
  const pocketCashMonthly = pocketCashAnnual / 12
  const cashOnCash = (totalCashToClose > 0) ? pocketCashAnnual / totalCashToClose : 0
  const pocketFloorBinds = pocketCashAnnual < POCKET_FLOOR

  const impliedCap = (maxPurchase > 0) ? noi / maxPurchase : 0
  const occDenom = totalOccupied > 0 ? totalOccupied : 1
  const lotDenom = totalLots > 0 ? totalLots : 1
  const revenuePerLot = egi / occDenom
  const noiPerLot = noi / occDenom
  const valuePerLot = maxPurchase / lotDenom

  const seniorDscr = bankAnnualDS > 0 ? noi / bankAnnualDS : 0
  const allInDscr = totalAnnualDS > 0 ? noi / totalAnnualDS : 0

  return {
    key, label, padPct,
    egi, managementFee, opExBase, pohPad, opEx, noi,
    maxPurchase, maxSeniorLoan, remainingEquity, sellerFiAmount, cashEquity,
    bankAnnualDS, sellerAnnualDS, totalAnnualDS,
    bankPoints, lenderFees, appraisal: appraisalFee, environmental: environmentalFee,
    totalBankFees, buyerClosingCosts, totalCashToClose,
    pocketCashAnnual, pocketCashMonthly, cashOnCash, pocketFloorBinds,
    impliedCap, seniorDscr, allInDscr,
    revenuePerLot, noiPerLot, valuePerLot
  }
}

function zeroCard({ key, label, padPct, egi, opEx, opExBase, managementFee, pohPad, noi }) {
  return {
    key, label, padPct,
    egi, managementFee, opExBase, pohPad, opEx, noi,
    maxPurchase: 0, maxSeniorLoan: 0, remainingEquity: 0, sellerFiAmount: 0, cashEquity: 0,
    bankAnnualDS: 0, sellerAnnualDS: 0, totalAnnualDS: 0,
    bankPoints: 0, lenderFees: 0, appraisal: 0, environmental: 0,
    totalBankFees: 0, buyerClosingCosts: 0, totalCashToClose: 0,
    pocketCashAnnual: 0, pocketCashMonthly: 0, cashOnCash: 0, pocketFloorBinds: true,
    impliedCap: 0, seniorDscr: 0, allInDscr: 0,
    revenuePerLot: 0, noiPerLot: 0, valuePerLot: 0
  }
}

function numOr(v, fallback) {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v)
    if (Number.isFinite(n)) return n
  }
  return fallback
}

function clamp01(v) {
  if (!Number.isFinite(v)) return 0
  if (v < 0) return 0
  if (v > 1) return 1
  return v
}

export {
  POH_HEAVY_THRESHOLD,
  POH_VACANCY_THRESHOLD,
  VACANT_LOT_THRESHOLD,
  POH_OPEX_PAD,
  UTILITY_KEYS,
  PARK_BURDEN_MODES,
  POCKET_FLOOR,
  annualLoanConstant
}
