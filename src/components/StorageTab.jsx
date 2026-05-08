export default function StorageTab() {
  return (
    <section>
      <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 600 }}>Storage</h2>
      <p style={{ color: '#5a6a8a', fontSize: 14, lineHeight: 1.6, margin: '0 0 16px' }}>
        Math Bible v3 storage engine — Group A/B/C max purchase, pocket cash, equity required, kicker overlay,
        Sunset Test (Y3/5/7/10 refi gap), Ramp Test (Y1 stretch → Y2 conservative).
      </p>
      <Placeholder module="storage" />
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
