// Display and adjustment utilities for PLATFORM_UNDERWRITING_STANDARDS
// in rei-baby-analyzer. Provides commercial standards exposure.

const STANDARDS = require('./underwriting-standards.js');

// Get commercial standards for display
function getCommercialDefaults() {
  return {
    rate: STANDARDS.COMMERCIAL.mortgageRate,
    amort: STANDARDS.COMMERCIAL.amortizationYears,
    ltv: STANDARDS.COMMERCIAL.ltv,
    dscrConservative: STANDARDS.COMMERCIAL.dscr.standard,
    dscrStretch: STANDARDS.COMMERCIAL.dscr.stretch,
    subclasses: STANDARDS.COMMERCIAL.subclasses
  };
}

// Return all commercial standards with display formatting
function getCommercialStandards() {
  const defaults = getCommercialDefaults();
  return {
    assetClass: 'commercial',
    mortgageRate: defaults.rate,
    mortgageRateDisplay: `${(defaults.rate * 100).toFixed(2)}%`,
    amortizationYears: defaults.amort,
    ltv: defaults.ltv,
    ltvDisplay: `${(defaults.ltv * 100).toFixed(0)}%`,
    dscrConservative: defaults.dscrConservative,
    dscrStretch: defaults.dscrStretch,
    subclasses: defaults.subclasses,
    globalDefaults: {
      commissionPercent: STANDARDS.GLOBAL.commissionDefaultPercent,
      arvPercentile: STANDARDS.GLOBAL.arvPercentile
    }
  };
}

// Get cap rate band for a specific subclass
function getSubclassCapRateBand(subclass) {
  const subclassStandards = STANDARDS.COMMERCIAL.subclasses[subclass];
  if (!subclassStandards) {
    return { capRate: 0.08, vacancyFloor: 0.05 };
  }
  return {
    capRate: subclassStandards.capRate,
    vacancyFloor: subclassStandards.vacancyFloor
  };
}

// Get all standards (for reference/audit)
function getAllStandards() {
  return STANDARDS;
}

// Apply adjustments (internal use only)
function applyStandardsOverride(baseStandards, adjustments = {}) {
  const result = JSON.parse(JSON.stringify(baseStandards));
  const allowedOverrides = ['rate', 'ltv', 'dscrConservative', 'dscrStretch'];

  for (const [key, value] of Object.entries(adjustments)) {
    if (allowedOverrides.includes(key) && baseStandards[key] !== undefined) {
      result[key] = value;
    }
  }

  return result;
}

module.exports = {
  getCommercialDefaults,
  getCommercialStandards,
  getSubclassCapRateBand,
  getAllStandards,
  applyStandardsOverride,
  STANDARDS
};
