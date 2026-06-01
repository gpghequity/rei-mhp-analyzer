// src/components/analyze/incomeMatrix.js
//
// Builds the standardized Financing Matrix for ANY income/NOI asset
// (Self Storage, Multifamily, Commercial, MHP/RV, Mixed Use). This is a
// REPORTING layer only — it composes existing Math Bible primitives and
// constants. NO new underwriting math, NO changes to src/math/* or defaults.json.
//
// Framework (Math Bible storage Group-A generalized):
//   bankLoan      = noi / (DSCR × K_bank)         (DSCR-sized senior debt)
//   supportedOffer= floor(bankLoan / LTV)          (LTV converts loan → price)
//   equity        = supportedOffer − bankLoan      (borrower's gap)
// Equity cost (8%) and seller financing apply ONLY to that equity gap — never
// the full purchase price (the bank always funds its LTV share).
//
// 8 rows = 4 structures × 2 DSCR lenses (1.25 conservative, 1.15 aggressive):
//   Bank Only · Equity 8% IO · Equity 8% Amortized 25yr · $100k Buyer + Seller FI.
//
// Per-class bank terms (LTV + rate/amort) are pulled/derived from the existing
// engines; everything else (DSCR lenses, 8% equity, 5%/25yr seller note, balloon
// helper, fees, pocket floor) comes straight from loadConstants().

import { loadConstants, annualLoanConstant } from '../../math/constants.js'
import { ownerEquityCost } from '../../math/storage.js'
import { remainingPrincipal } from '../../math/sunsetTest.js'

const BUYER_CASH = 100000
const SELLER_BALLOON_YEARS = 15 // per spec for the $100k + seller structure

export const INCOME_ASSET_TYPES = ['self_storage', 'multifamily', 'commercial', 'mhp_rv', 'mixed_use']

export function isIncomeAsset(typeId) {
  return INCOME_ASSET_TYPES.includes(typeId)
}

// Per-class bank terms. LTV = 0.70 across the board per the storage rule
// (bank funds 70%, equity 30%); rate/amort taken from each class's engine.
// Documented assumptions — surfaced in the report + questions file.
export function bankTermsFor(typeId, C) {
  switch (typeId) {
    case 'self_storage':
    case 'multifamily':
      return { ltv: 0.70, K: C.K_BANK_STORAGE, rateLabel: '7.25% / 25-yr (Math Bible storage bank terms)' }
    case 'commercial':
    case 'mixed_use':
      return { ltv: 0.70, K: annualLoanConstant(0.07, 30), rateLabel: '7% / 30-yr (Math Bible commercial lender defaults)' }
    case 'mhp_rv':
      return { ltv: 0.70, K: annualLoanConstant(0.07, 30), rateLabel: '7% / 30-yr (MHP/RV bank terms)' }
    default:
      return { ltv: 0.70, K: C.K_BANK_STORAGE, rateLabel: '7.25% / 25-yr' }
  }
}

const STRUCTURES = [
  { key: 'bank_only', label: 'Bank Only' },
  { key: 'equity_io', label: 'Equity 8% IO' },
  { key: 'equity_amort', label: 'Equity 8% Amortized' },
  { key: 'seller_fi', label: '$100k Buyer + Seller Finance' }
]

function round1000(n) { return Math.floor(n / 1000) * 1000 }

// Build one matrix row for a given structure + DSCR lens.
function buildRow(structureKey, label, dscr, noi, terms, C) {
  const bankLoanRaw = noi / (dscr * terms.K)
  const supportedOffer = round1000(bankLoanRaw / terms.ltv)
  const bankLoan = Math.round(supportedOffer * terms.ltv)
  const equity = supportedOffer - bankLoan
  const bankPayment = bankLoan * terms.K

  let borrowerBrings = equity      // cash the borrower must bring
  let borrowerCost = 0             // annual cost of the borrower's equity capital
  let sellerFinance = 0
  let sellerPayment = 0
  let balloon = 0

  if (structureKey === 'equity_io') {
    borrowerCost = ownerEquityCost(equity, 'io')        // equity × 8%
  } else if (structureKey === 'equity_amort') {
    borrowerCost = ownerEquityCost(equity, 'amort')     // equity × K_OWNER_AMORT (8%/25yr)
  } else if (structureKey === 'seller_fi') {
    const buyerCash = Math.min(BUYER_CASH, equity)
    sellerFinance = Math.max(0, equity - BUYER_CASH)
    borrowerBrings = buyerCash
    borrowerCost = ownerEquityCost(buyerCash, 'io')     // 8% IO on the $100k only
    sellerPayment = sellerFinance * C.K_SELLER          // seller note 5%/25yr
    balloon = sellerFinance > 0
      ? remainingPrincipal(sellerFinance, C.RATE_SELLER, C.AMORT_SELLER, SELLER_BALLOON_YEARS)
      : 0
  }

  const totalCapitalCost = bankPayment + borrowerCost + sellerPayment
  const pocketMoney = noi - totalCapitalCost
  const cashInvested = borrowerBrings // operator's actual cash in the deal

  return {
    structureKey,
    structure: label,
    dscr,
    noi,
    offer: supportedOffer,
    bank: bankLoan,
    borrower: borrowerBrings,
    sellerFi: sellerFinance,
    bankPayment,
    borrowerCost,
    sellerPayment,
    totalCapitalCost,
    pocketMoney,
    balloon,
    // derived ratios (existing-output ratios, not new underwriting):
    capRate: supportedOffer > 0 ? noi / supportedOffer : null,
    debtYield: bankLoan > 0 ? noi / bankLoan : null,
    cashOnCash: cashInvested > 0 ? pocketMoney / cashInvested : null,
    clearsPocketFloor: pocketMoney >= C.POCKET_FLOOR
  }
}

// Main: returns the 8 rows (in spec order), a summary, a practical
// recommendation, and the documented assumptions.
export function buildIncomeMatrix({ assetType, noi }) {
  const C = loadConstants()
  const terms = bankTermsFor(assetType, C)
  const lenses = [C.DSCR_CONSERVATIVE, C.DSCR_STRETCH] // 1.25, 1.15

  // Spec row order: structure-major, DSCR 1.25 then 1.15 within each structure.
  const rows = []
  for (const s of STRUCTURES) {
    for (const dscr of lenses) {
      rows.push(buildRow(s.key, s.label, dscr, noi, terms, C))
    }
  }

  const bankOnly125 = rows.find(r => r.structureKey === 'bank_only' && r.dscr === C.DSCR_CONSERVATIVE)
  const bankOnly115 = rows.find(r => r.structureKey === 'bank_only' && r.dscr === C.DSCR_STRETCH)
  const sellerRows = rows.filter(r => r.structureKey === 'seller_fi')
  const bestSeller = sellerRows.reduce((a, b) => (b.offer > a.offer ? b : a), sellerRows[0])

  const pockets = rows.map(r => r.pocketMoney)
  const offers = rows.map(r => r.offer)

  const summary = {
    noi,
    assetType,
    conservativeValue: bankOnly125.offer,   // 1.25 bank-only
    aggressiveValue: bankOnly115.offer,      // 1.15 bank-only
    bestSellerFinanceValue: bestSeller.offer,
    pocketRange: [Math.min(...pockets), Math.max(...pockets)],
    offerRange: [Math.min(...offers), Math.max(...offers)],
    recommendedOfferRange: [bankOnly125.offer, bankOnly115.offer]
  }

  const recommendation = buildRecommendation(rows, summary, C)

  const assumptions = {
    bankLtv: terms.ltv,
    bankTerms: terms.rateLabel,
    dscrLenses: lenses,
    equityRate: '8% (IO = 8% interest-only; Amortized = 8% / 25-yr)',
    sellerNote: `5% / ${C.AMORT_SELLER}-yr, balloon at year ${SELLER_BALLOON_YEARS}`,
    buyerCashInSellerStructure: BUYER_CASH,
    pocketFloor: C.POCKET_FLOOR,
    note: 'Bank funds its LTV share; equity cost and seller financing apply ONLY to the equity gap, never the full price. Non-storage LTVs are documented defaults pending operator confirmation.'
  }

  return { rows, summary, recommendation, assumptions, bankTerms: terms }
}

// Practical recommendation — not just the highest offer. If structures cluster
// within 5%, prefer the simplest (bank-only) and say why.
function buildRecommendation(rows, summary, C) {
  const notes = []
  const bankOnly125 = rows.find(r => r.structureKey === 'bank_only' && r.dscr === 1.25)
  const bankOnly115 = rows.find(r => r.structureKey === 'bank_only' && r.dscr === 1.15)
  const seller125 = rows.find(r => r.structureKey === 'seller_fi' && r.dscr === 1.25)
  const amort125 = rows.find(r => r.structureKey === 'equity_amort' && r.dscr === 1.25)

  // Seller-finance vs bank-only at the conservative lens (same DSCR-sized offer).
  const sellerDelta = seller125.offer - bankOnly125.offer
  if (Math.abs(sellerDelta) <= bankOnly125.offer * 0.05) {
    notes.push(`Seller financing changes the supported offer by only ${fmtSigned(sellerDelta)} vs bank-only at 1.25 DSCR — within 5%. Its real benefit here is lower cash in the deal ($${BUYER_CASH.toLocaleString()} vs $${bankOnly125.borrower.toLocaleString()}), not a higher price.`)
  } else if (sellerDelta > 0) {
    notes.push(`Seller financing raises the supported offer by ${fmtSigned(sellerDelta)} — materially better; worth the added complexity.`)
  }

  // Amortized equity destroying pocket money.
  if (amort125.pocketMoney < C.POCKET_FLOOR) {
    notes.push(`Amortizing the equity at 8%/25-yr drops pocket money to $${Math.round(amort125.pocketMoney).toLocaleString()} (below the $${C.POCKET_FLOOR.toLocaleString()} floor) — interest-only or seller financing preserves cash flow.`)
  }

  // Aggressive lens caution.
  if (bankOnly115.pocketMoney < C.POCKET_FLOOR) {
    notes.push(`At 1.15 DSCR the deal clears a higher offer ($${bankOnly115.offer.toLocaleString()}) but pocket money falls to $${Math.round(bankOnly115.pocketMoney).toLocaleString()} — aggressive; little margin for vacancy/expense surprises.`)
  } else {
    notes.push(`1.15 DSCR supports up to $${bankOnly115.offer.toLocaleString()} with $${Math.round(bankOnly115.pocketMoney).toLocaleString()} pocket money — usable but tighter than the 1.25 conservative case.`)
  }

  // Headline pick.
  let headline
  if (Math.abs(sellerDelta) <= bankOnly125.offer * 0.05) {
    headline = `Recommended: Bank-Only at 1.25 DSCR ($${bankOnly125.offer.toLocaleString()}). The financing add-ons don't raise the offer enough to justify the complexity — use them only to reduce cash in the deal.`
  } else {
    headline = `Recommended: the best-value structure (${summary.bestSellerFinanceValue.toLocaleString()}) — see notes.`
  }

  return { headline, notes }
}

function fmtSigned(n) {
  const s = Math.round(n)
  return (s >= 0 ? '+$' : '-$') + Math.abs(s).toLocaleString()
}
