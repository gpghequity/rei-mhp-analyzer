import { useState } from 'react'

export default function QuickAnalysisTab() {
  const [propertyType, setPropertyType] = useState('commercial')
  const [inputs, setInputs] = useState({
    propertyName: '',
    address: '',
    annualNOI: '',
    arv: '',
    rehab: '',
    purchase: '',
    grossDollars: '',
    expenseRatio: ''
  })
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const update = (field, value) => {
    setInputs(prev => ({ ...prev, [field]: value }))
    setError(null)
  }

  const analyze = async () => {
    setLoading(true)
    setError(null)
    setResults(null)

    try {
      let payload = {
        propertyName: inputs.propertyName,
        address: inputs.address
      }

      if (propertyType === 'commercial') {
        if (!inputs.annualNOI || Number(inputs.annualNOI) <= 0) {
          throw new Error('Enter NOI')
        }
        payload.type = 'commercial_dscr'
        payload.inputs = { annualNOI: Number(inputs.annualNOI) }
      } else if (propertyType === 'storage') {
        if (!inputs.annualNOI || Number(inputs.annualNOI) <= 0) {
          throw new Error('Enter NOI')
        }
        payload.type = 'storage_group_a'
        payload.inputs = { noi: Number(inputs.annualNOI) }
      } else if (propertyType === 'residential_flip') {
        if (!inputs.arv || !inputs.rehab || Number(inputs.arv) <= 0) {
          throw new Error('Enter ARV and rehab cost')
        }
        payload.type = 'residential_mao'
        payload.inputs = { arv: Number(inputs.arv), rehab: Number(inputs.rehab) }
      } else if (propertyType === 'residential_rental') {
        if (!inputs.annualNOI || !inputs.purchase || Number(inputs.annualNOI) <= 0) {
          throw new Error('Enter NOI and purchase price')
        }
        payload.type = 'residential_dscr'
        payload.inputs = { annualNOI: Number(inputs.annualNOI), purchase: Number(inputs.purchase) }
      }

      const resp = await fetch('/api/calc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!resp.ok) {
        throw new Error(`API error: ${resp.status}`)
      }

      const data = await resp.json()
      setResults(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setInputs({
      propertyName: '',
      address: '',
      annualNOI: '',
      arv: '',
      rehab: '',
      purchase: '',
      grossDollars: '',
      expenseRatio: ''
    })
    setResults(null)
    setError(null)
  }

  const fmtMoney = (n) => {
    if (n == null || !Number.isFinite(Number(n))) return '—'
    return '$' + Math.round(Number(n)).toLocaleString('en-US')
  }

  const fmtPct = (n, digits = 1) => {
    if (n == null || !Number.isFinite(Number(n))) return '—'
    return (Number(n) * 100).toFixed(digits) + '%'
  }

  return (
    <section>
      <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 600 }}>Quick Analysis</h2>
      <p style={{ color: '#5a6a8a', fontSize: 13, lineHeight: 1.6, margin: '0 0 16px' }}>
        Fast deal math. Enter property details and key metrics, get instant max-offer calculation with K-factors and debt service breakdown.
      </p>

      {/* Property Type Selector */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
        {[
          { val: 'commercial', label: 'Commercial DSCR' },
          { val: 'storage', label: 'Storage Group A' },
          { val: 'residential_flip', label: 'Residential Flip (MAO)' },
          { val: 'residential_rental', label: 'Residential Rental (DSCR)' }
        ].map(t => (
          <button
            key={t.val}
            type="button"
            onClick={() => setPropertyType(t.val)}
            style={{
              padding: '10px 12px',
              border: propertyType === t.val ? '2px solid #C9A84C' : '1px solid #d4dae8',
              background: propertyType === t.val ? '#fffbf0' : '#fff',
              color: propertyType === t.val ? '#1a2456' : '#475569',
              borderRadius: 6,
              fontWeight: propertyType === t.val ? 700 : 500,
              fontSize: 12,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <fieldset style={{ border: '1px solid #d4dae8', borderRadius: 6, background: '#fff', padding: 14, marginBottom: 14 }}>
        <legend style={{ padding: '0 8px', fontWeight: 700, fontSize: 13, color: '#1a2456', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Property Info</legend>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={inputLabel}>Property name</label>
            <input style={inputStyle} value={inputs.propertyName} onChange={e => update('propertyName', e.target.value)} placeholder="e.g., Acme Office Complex" />
          </div>
          <div>
            <label style={inputLabel}>Address</label>
            <input style={inputStyle} value={inputs.address} onChange={e => update('address', e.target.value)} placeholder="e.g., 123 Main St, Lancaster PA" />
          </div>

          {/* Commercial & Storage */}
          {(propertyType === 'commercial' || propertyType === 'storage') && (
            <div>
              <label style={inputLabel}>Annual NOI</label>
              <input type="number" style={inputStyle} value={inputs.annualNOI} onChange={e => update('annualNOI', e.target.value)} placeholder="Enter annual NOI" />
            </div>
          )}

          {/* Residential Flip */}
          {propertyType === 'residential_flip' && (
            <>
              <div>
                <label style={inputLabel}>ARV (After Repair Value)</label>
                <input type="number" style={inputStyle} value={inputs.arv} onChange={e => update('arv', e.target.value)} placeholder="Estimated value after rehab" />
              </div>
              <div>
                <label style={inputLabel}>Rehab Cost</label>
                <input type="number" style={inputStyle} value={inputs.rehab} onChange={e => update('rehab', e.target.value)} placeholder="Total rehab budget" />
              </div>
            </>
          )}

          {/* Residential Rental */}
          {propertyType === 'residential_rental' && (
            <>
              <div>
                <label style={inputLabel}>Annual NOI</label>
                <input type="number" style={inputStyle} value={inputs.annualNOI} onChange={e => update('annualNOI', e.target.value)} placeholder="Annual rental NOI" />
              </div>
              <div>
                <label style={inputLabel}>Purchase Price</label>
                <input type="number" style={inputStyle} value={inputs.purchase} onChange={e => update('purchase', e.target.value)} placeholder="Acquisition cost" />
              </div>
            </>
          )}
        </div>
      </fieldset>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <button
          type="button"
          onClick={analyze}
          disabled={loading}
          style={{
            padding: '12px 24px',
            background: '#C9A84C',
            color: '#1a2456',
            border: 0,
            borderRadius: 6,
            fontWeight: 700,
            fontSize: 15,
            cursor: loading ? 'wait' : 'pointer',
            opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? 'Analyzing...' : 'Analyze'}
        </button>
        <button
          type="button"
          onClick={reset}
          style={{
            padding: '12px 24px',
            background: '#fff',
            color: '#1a2456',
            border: '1px solid #1a2456',
            borderRadius: 6,
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          Reset
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 6, padding: 12, marginBottom: 16, color: '#991b1b', fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Results */}
      {results && (() => {
        const r = results.result
        return (
          <div style={{ background: '#f9fafb', borderRadius: 6, padding: 16, marginTop: 24 }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 700, color: '#1a2456' }}>
              {inputs.propertyName || 'Analysis'} {inputs.address && `• ${inputs.address}`}
            </h3>

            {/* Commercial DSCR */}
            {propertyType === 'commercial' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <AnalysisBox title="Conservative (1.25x DSCR)" result={r.conservative} />
                <AnalysisBox title="Stretch / Ramp (1.15x DSCR)" result={r.stretch} />
                <div style={{ gridColumn: '1 / -1', paddingTop: 12, borderTop: '1px solid #d4dae8', color: '#5a6a8a', fontSize: 12 }}>
                  <div>K-factor: {r.K?.toFixed(4)} • Debt Service Factor: {r.dsFactor?.toFixed(4)}</div>
                </div>
              </div>
            )}

            {/* Storage Group A */}
            {propertyType === 'storage' && (
              <div>
                <ResultRow k="NOI" v={fmtMoney(r.noi)} bold large />
                <ResultRow k="K-Factor" v={r.K?.toFixed(4)} />
                <ResultRow k="Debt Service Factor" v={r.dsFactor?.toFixed(4)} />
                <ResultRow k="Max Purchase Price" v={fmtMoney(r.maxPurchase)} bold large />
                <ResultRow k="Your Offer (after $10k fee)" v={fmtMoney(r.yourOffer)} bold />
                <ResultRow k="Bank Loan (75% LTV)" v={fmtMoney(r.bankLoan)} />
                <ResultRow k="Annual Debt Service" v={fmtMoney(r.annualDS)} />
                <ResultRow k="DSCR" v={r.actualDSCR?.toFixed(3)} pass={r.dscrPass} />
              </div>
            )}

            {/* Residential Flip */}
            {propertyType === 'residential_flip' && (
              <div>
                <ResultRow k="ARV (70% of value)" v={fmtMoney(r.step1)} />
                <ResultRow k="Less wholesale fee ($10k)" v={'-' + fmtMoney(r.wholesaleFee)} />
                <ResultRow k="Less rehab" v={'-' + fmtMoney(r.rehab)} />
                <ResultRow k="MAX OFFER" v={fmtMoney(r.maxOffer)} bold large />
              </div>
            )}

            {/* Residential Rental */}
            {propertyType === 'residential_rental' && (
              <div>
                <ResultRow k="Annual NOI" v={fmtMoney(r.annualNOI)} bold />
                <ResultRow k="Purchase Price" v={fmtMoney(r.purchase)} />
                <ResultRow k="Loan (80% LTV)" v={fmtMoney(r.loan)} />
                <ResultRow k="K-Factor" v={r.K?.toFixed(4)} />
                <ResultRow k="Annual Debt Service" v={fmtMoney(r.annualDS)} />
                <ResultRow k="DSCR" v={r.dscr?.toFixed(3)} pass={r.pass} bold />
                <ResultRow k="Monthly Cash Flow" v={fmtMoney(r.pocketCashMonthly)} bold large />
              </div>
            )}
          </div>
        )
      })()}
    </section>
  )
}

function AnalysisBox({ title, result }) {
  const fmtMoney = (n) => {
    if (n == null || !Number.isFinite(Number(n))) return '—'
    return '$' + Math.round(Number(n)).toLocaleString('en-US')
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #d4dae8', borderRadius: 6, padding: 12 }}>
      <h4 style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: '#1a2456', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{title}</h4>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px dashed #e2e8f0', fontSize: 13, marginBottom: 8 }}>
        <span style={{ color: '#5a6a8a' }}>Max Purchase</span>
        <span style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 700, color: '#0f172a' }}>{fmtMoney(result.maxPurchase)}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px dashed #e2e8f0', fontSize: 13, marginBottom: 8 }}>
        <span style={{ color: '#5a6a8a' }}>Your Offer</span>
        <span style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 700, color: '#0f172a' }}>{fmtMoney(result.yourOffer)}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px dashed #e2e8f0', fontSize: 13, marginBottom: 8 }}>
        <span style={{ color: '#5a6a8a' }}>Loan (75% LTV)</span>
        <span style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 400, color: '#0f172a' }}>{fmtMoney(result.loan)}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px dashed #e2e8f0', fontSize: 13, marginBottom: 8 }}>
        <span style={{ color: '#5a6a8a' }}>Annual DS</span>
        <span style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 400, color: '#0f172a' }}>{fmtMoney(result.annualDS)}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13, marginBottom: 4 }}>
        <span style={{ color: '#5a6a8a' }}>DSCR</span>
        <span style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 700, color: result.pass ? '#15803d' : '#991b1b' }}>
          {result.dscr?.toFixed(3)} {result.pass ? '✓' : '✗'}
        </span>
      </div>
    </div>
  )
}

function ResultRow({ k, v, bold, large, pass }) {
  const colors = {
    true: '#15803d',
    false: '#991b1b',
    null: '#0f172a'
  }
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px dashed #e2e8f0', fontSize: large ? 14 : 12 }}>
      <span style={{ color: pass === null ? '#5a6a8a' : pass ? '#15803d' : '#991b1b', fontWeight: bold ? 700 : 400 }}>
        {k}
      </span>
      <span style={{ fontFamily: 'ui-monospace, monospace', fontWeight: bold ? 700 : 400, color: colors[pass] }}>
        {v}
      </span>
    </div>
  )
}

const inputLabel = {
  display: 'block',
  fontSize: 10,
  color: '#5a6a8a',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  marginBottom: 3
}

const inputStyle = {
  width: '100%',
  padding: '8px 10px',
  border: '1px solid #cbd5e1',
  borderRadius: 4,
  font: 'inherit',
  fontSize: 13
}
