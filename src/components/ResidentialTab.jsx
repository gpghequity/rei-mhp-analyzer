export default function ResidentialTab() {
  return (
    <section>
      <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 600 }}>Residential</h2>
      <p style={{ color: '#5a6a8a', fontSize: 14, lineHeight: 1.6, margin: '0 0 16px' }}>
        Math Bible v3 residential engine — flip MAO (70% rule), rental DSCR (3-card pad stack: light / standard /
        harsh), 40th-percentile ARV from comps, Owner Hard Mode.
      </p>
      <Placeholder module="residential" />
    </section>
  )
}

function Placeholder({ module }) {
  return (
    <div style={{
      padding: 16,
      border: '1px dashed #c8d0e0',
      borderRadius: 6,
      backgroundColor: '#eef2fb',
      color: '#5a6a8a',
      fontSize: 13,
      lineHeight: 1.6
    }}>
      <strong style={{ color: '#1a2456' }}>Scaffold only (v0.0.1).</strong>{' '}
      Math engine wires in next commit (v0.1). Source files for the {module} math will live in{' '}
      <code style={{ background: '#fff', padding: '1px 5px', borderRadius: 3 }}>src/math/{module}.js</code>{' '}
      with full provenance comments showing the snapshot date and source commit.
    </div>
  )
}
