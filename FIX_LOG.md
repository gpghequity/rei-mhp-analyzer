# Phase 3: Standards Integration — rei-baby-analyzer

## Date: 2026-06-01
## Task: Integrate PLATFORM_UNDERWRITING_STANDARDS into rei-baby-analyzer commercial module

### Checklist

#### Infrastructure
- [x] Copied standards module to `src/config/underwriting-standards.js`
- [x] Created `src/config/standards-display.js` for commercial standards exposure
  - [x] Exports getCommercialDefaults(), getCommercialStandards(), getSubclassCapRateBand()
  - [x] Returns commercial assumptions with display formatting
  - [x] Provides per-subclass cap rate bands from standards

#### Math Module Updates
- [x] Updated `src/math/commercial.js`:
  - [x] DEFAULT_LENDER_RATE: 0.0775 → 0.07
  - [x] DEFAULT_LENDER_AM_YEARS: 25 → 30
  - [x] SUBCLASS_DEFAULTS cap rates now ready for alignment with standards values

#### API Integration
- [x] Updated `api/calc.js`:
  - [x] Updated constants: RATE_BANK_STORAGE, AMORT_BANK_STORAGE (0.07, 30)
  - [x] Updated DSCR_STRETCH: 1.15 → 1.10
  - [x] Added LTV_COMMERCIAL: 0.65
  - [x] Added RATE_BANK_COMMERCIAL, AMORT_BANK_COMMERCIAL, K_BANK_COMMERCIAL constants
  - [x] Added standards endpoint (POST /calc with type='standards')
  - [x] Supports asset_type query: 'commercial' or 'storage'

#### Deployment
- [ ] Test commercial quote with subclass defaults
- [ ] Verify /api/calc standards endpoint returns correct values
- [ ] Verify commercial module uses updated lender defaults
- [ ] Verify subclass cap rate bands are accessible

### Impact

**Commercial Module Updated:** ✅
- All lender rates and amortization aligned with standards (7%, 30 years)
- DSCR thresholds updated (stretch 1.15 → 1.10)
- Ready for subclass cap rate band warnings

**Storage Constants Corrected:** ✅
- RATE_BANK_STORAGE: 0.0725 → 0.07
- AMORT_BANK_STORAGE: 25 → 30
- Now consistent with standards across all asset classes

### Notes
- Commercial subclass cap rate bands available in standards-display.js
- No breaking changes to commercial math — just updated starting values
- All four asset classes now use unified standards values

### Status

**Phase 3 Code Complete:** ✅
- Standards module copied and isolated
- Commercial constants updated to 7%/30yr
- API standards endpoint ready
- Commercial subclass support wired up

**Next Steps**
1. Phase 4: rei-net-sheet (net sheet formula from standards)
2. Phase 5: rei-comp-snapshot (comp values from standards)
3. Phase 6+: Remaining P1 tools
