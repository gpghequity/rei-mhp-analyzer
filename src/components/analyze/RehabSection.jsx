import { useState, useEffect, useMemo, useRef } from 'react'
import { freshSystems, SIZING_FIELDS, RATE_SOURCE, TIER_LABELS, STANDARD_TIER_KEYS, OVERALL_TIERS } from '../../math/rehab/rehabSystems.js'
import { calcRehab, explainRow, pricesByCondition, pricesByConditionPerCount, resolveDefaultCount, isRowHidden, nationalTotal } from '../../math/rehab/rehabMath.js'

// Manual condition → rehab estimate, ported from Rehab Calc and embedded in the
// Analyze-a-Deal flow. Line-item breakout + total. Reports its total up via
// onTotalChange so the deal's flip MAO uses the condition-derived rehab number.
// Inline-styled to match AnalyzeDealTab (Baby uses inline styles, not Tailwind).

const money = (n) => (n == null || !Number.isFinite(Number(n))) ? '$0' : '$' + Math.round(Number(n)).toLocaleString()
const lbl = { display: 'block', fontSize: 12, fontWeight: 600, color: '#1E2A45', margin: '8px 0 3px' }
const inp = { width: '100%', padding: '7px 9px', border: '1px solid #d4dae8', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }
const COUNT_OPTS = [0, 1, 2, 3, 4, 5, 6, 8, 10]
const COUNT_OPTS_BY_ID = { windows: [0, 5, 10, 15, 20, 30, 40, 50], rollupDoors: [0, 50, 100, 200, 300, 500], doorHardware: [0, 50, 100, 200, 300, 500], cameras: [0, 4, 8, 12, 16, 24, 32], poleLights: [0, 2, 4, 6, 8, 12, 20], unitInterior: [0, 50, 100, 200, 300, 500] }

export default function RehabSection({ mode = 'residential', seed = {}, onTotalChange }) {
  const sizingFields = SIZING_FIELDS[mode] || SIZING_FIELDS.residential
  const [sizing, setSizing] = useState(() => {
    const s = {}
    sizingFields.forEach(f => { s[f.key] = seed[f.key] ?? '' })
    return s
  })
  const [systems, setSystems] = useState(() => freshSystems(mode))
  const [overallTier, setOverallTier] = useState('medium_rehab')
  // Flat override — type one number and skip the line items entirely.
  const [flat, setFlat] = useState('')
  const flatNum = Number(flat) > 0 ? Math.round(Number(flat)) : null

  // Keep the sizing (square footage etc.) in sync with the deal's numbers coming
  // from the form/comps, until the operator overrides a field by hand. Without
  // this the area stays blank and every condition price computes to $0.
  const editedRef = useRef(new Set())
  const seedKey = JSON.stringify(seed || {})
  useEffect(() => {
    setSizing(prev => {
      const next = { ...prev }; let changed = false
      sizingFields.forEach(f => {
        const sv = seed?.[f.key]
        if (sv != null && sv !== '' && !editedRef.current.has(f.key) && String(prev[f.key] ?? '') !== String(sv)) {
          next[f.key] = sv; changed = true
        }
      })
      return changed ? next : prev
    })
  }, [seedKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // Recompute on every change; surface BOTH totals (Steve's line-item engine and
  // the national $/sf benchmark) to the parent.
  const result = useMemo(() => calcRehab(systems, sizing), [systems, sizing])
  const nat = useMemo(() => nationalTotal(mode, sizing, overallTier), [mode, sizing, overallTier])
  // The number that actually feeds the offer math: the flat override if set,
  // otherwise the line-item total.
  const reportedTotal = flatNum != null ? flatNum : result.totalRehab
  // Per-line breakdown (label + chosen condition/budget + $) for the report.
  const breakdown = useMemo(() => {
    const condById = {}
    systems.forEach(s => {
      condById[s.id] = s.pricing?.kind === 'amounts'
        ? (Number(s.selectedAmount) > 0 ? money(Number(s.selectedAmount)) : '—')
        : (s.condition ? (TIER_LABELS[s.condition] || s.condition) : '—')
    })
    return result.lineItems.map(li => ({ id: li.id, label: li.label, condition: condById[li.id] || '—', total: li.total }))
  }, [systems, result])
  useEffect(() => {
    onTotalChange?.(reportedTotal, { ...result, totalRehab: reportedTotal, lineItemTotal: result.totalRehab, flatOverride: flatNum, national: nat, breakdown })
  }, [reportedTotal, nat.total]) // eslint-disable-line react-hooks/exhaustive-deps

  const setSizeField = (k, v) => { editedRef.current.add(k); setSizing(p => ({ ...p, [k]: v })) }
  const patchSystem = (id, patch) => setSystems(p => p.map(s => s.id === id ? { ...s, ...patch } : s))

  const visible = systems.filter(s => !isRowHidden(s, sizing))

  return (
    <div>
      <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 8px' }}>
        Rates: <b>{RATE_SOURCE[mode]}</b>. Pick a condition (or budget) per system — the total feeds the offer math below.
      </p>

      {/* Flat override — one number, skip the line items */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginBottom: 10, padding: '10px 12px', background: '#fff7e6', border: '1px solid #e3c685', borderRadius: 8 }}>
        <div style={{ flex: 1 }}>
          <label style={{ ...lbl, margin: '0 0 3px' }}>Flat rehab total — skip the line items below</label>
          <input style={inp} inputMode="decimal" value={flat} placeholder="e.g. 45000"
            onChange={e => setFlat(e.target.value.replace(/[^0-9.]/g, ''))} />
        </div>
        {flatNum != null
          ? <div style={{ fontSize: 12, color: '#9a6700', fontWeight: 700, paddingBottom: 8 }}>Using {money(flatNum)} — line items ignored</div>
          : <div style={{ fontSize: 11, color: '#9a6700', paddingBottom: 8, maxWidth: 220 }}>Leave blank to build it up from the condition lines below.</div>}
      </div>

      {/* Sizing inputs that scale the formulas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 8, padding: '10px', background: '#f1f3f7', borderRadius: 8, marginBottom: 10 }}>
        {sizingFields.map(f => (
          <div key={f.key}>
            <label style={lbl}>{f.label}</label>
            <input style={inp} inputMode="decimal" value={sizing[f.key] ?? ''} placeholder={f.placeholder}
              onChange={e => setSizeField(f.key, e.target.value)} />
          </div>
        ))}
      </div>

      {/* One row per system — dimmed when a flat override is in effect */}
      <div style={{ display: 'grid', gap: 6, opacity: flatNum != null ? 0.45 : 1, pointerEvents: flatNum != null ? 'none' : 'auto' }}>
        {visible.map(s => <Row key={s.id} system={s} sizing={sizing} onChange={patch => patchSystem(s.id, patch)} />)}
      </div>

      {/* Overall condition → drives the national-average benchmark column */}
      <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, alignItems: 'end' }}>
        <div>
          <label style={lbl}>Overall condition (for national-average benchmark)</label>
          <select style={inp} value={overallTier} onChange={e => setOverallTier(e.target.value)}>
            {OVERALL_TIERS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>
        <div style={{ fontSize: 11, color: '#6b7280' }}>National benchmark = {money(nat.psf)}/sf × {nat.area.toLocaleString()} sf (mid-Atlantic, source: data-enrichment)</div>
      </div>

      {/* Two totals: Steve's line-item engine vs national $/sf benchmark */}
      <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div style={{ padding: '10px 14px', background: '#0A0F2C', color: '#fff', borderRadius: 8 }}>
          <div style={{ fontWeight: 700, color: '#C9A84C', fontSize: 12 }}>Total — your numbers</div>
          <div style={{ fontWeight: 800, fontSize: 18 }}>{money(reportedTotal)}</div>
          <div style={{ fontSize: 10, color: '#cdd6ec' }}>{flatNum != null ? 'Flat override (line items ignored)' : RATE_SOURCE[mode]}</div>
        </div>
        <div style={{ padding: '10px 14px', background: '#1E2A45', color: '#fff', borderRadius: 8 }}>
          <div style={{ fontWeight: 700, color: '#C9A84C', fontSize: 12 }}>Total — national average</div>
          <div style={{ fontWeight: 800, fontSize: 18 }}>{money(nat.total)}</div>
          <div style={{ fontSize: 10, color: '#cdd6ec' }}>{nat.area.toLocaleString()} sf × {money(nat.psf)}/sf</div>
        </div>
      </div>
      {result.holdingCost > 0 && (
        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>+ Holding {money(result.holdingCost)} (carried separately, not in rehab total)</div>
      )}
    </div>
  )
}

function Row({ system, sizing, onChange }) {
  const { total, label } = explainRow(system, sizing)
  const p = system.pricing
  const isAmount = p?.kind === 'amounts'
  const isCount = p?.kind === 'rate_x_count'
  const isPerCount = p?.kind === 'static_per_count'

  return (
    <div style={{ border: '1px solid #d4dae8', borderRadius: 6, padding: '8px 10px', background: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <b style={{ fontSize: 13, color: '#0A0F2C' }}>{system.label}</b>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#1a2456', fontFamily: 'monospace' }}>{money(total)}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: (isCount || isPerCount) ? '1fr 1fr' : '1fr', gap: 6, marginTop: 4 }}>
        {(isCount || isPerCount) && (
          <select style={inp} value={countValue(system, sizing)} onChange={e => onChange({ count: Number(e.target.value) })}>
            {countOptions(system, sizing).map(n => <option key={n} value={n}>{(p.countLabel || 'Qty') + ': ' + n}</option>)}
          </select>
        )}
        {isAmount ? (
          <select style={inp} value={Number(system.selectedAmount ?? 0)} onChange={e => onChange({ selectedAmount: Number(e.target.value) })}>
            {(p.amounts || [0]).map(v => <option key={v} value={v}>{money(v)}</option>)}
          </select>
        ) : (
          <select style={inp} value={system.condition || ''} onChange={e => onChange({ condition: e.target.value || null })}>
            <option value="">— condition —</option>
            {conditionOptions(system, sizing).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        )}
      </div>
      {label && <div style={{ fontSize: 10, color: '#9aa3b2', marginTop: 3, fontFamily: 'monospace' }}>{label}</div>}
    </div>
  )
}

function conditionOptions(system, sizing) {
  const keys = system?.pricing?.tierKeys || STANDARD_TIER_KEYS
  if (system?.pricing?.kind === 'static_per_count') {
    const per = pricesByConditionPerCount(system)
    return keys.map(k => ({ value: k, label: `${TIER_LABELS[k] || k} ($${(per[k] || 0).toLocaleString()}/ea)` }))
  }
  const prices = pricesByCondition(system, sizing)
  return keys.map(k => ({ value: k, label: `${TIER_LABELS[k] || k} (${money(prices[k] || 0)})` }))
}
function countValue(system, sizing) {
  return system.count != null && Number.isFinite(Number(system.count)) ? Number(system.count) : resolveDefaultCount(system.pricing?.defaultCount, sizing)
}
function countOptions(system, sizing) {
  const base = (COUNT_OPTS_BY_ID[system.id] || COUNT_OPTS).slice()
  const cur = countValue(system, sizing)
  if (cur != null && Number.isFinite(cur) && !base.includes(cur)) { base.push(cur); base.sort((a, b) => a - b) }
  return base
}
