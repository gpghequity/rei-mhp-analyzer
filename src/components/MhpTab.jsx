export default function MhpTab() {
  return (
    <section>
      <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 600 }}>MHP</h2>
      <p style={{ color: '#5a6a8a', fontSize: 14, lineHeight: 1.6, margin: '0 0 16px' }}>
        Fast Calc V2.6 mobile-home-park engine (Math Bible has no MHP module — Fast Calc is the only source).
        Three MVM scenarios, lot-count validation, POH OpEx pad, utility-responsibility matrix.
      </p>
      <Placeholder module="mhp" />
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
