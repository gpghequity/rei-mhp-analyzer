import { useState } from 'react'
import StorageTab from './components/StorageTab.jsx'
import ResidentialTab from './components/ResidentialTab.jsx'
import MhpTab from './components/MhpTab.jsx'
import CommercialTab from './components/CommercialTab.jsx'

const TABS = [
  { id: 'storage', label: 'Storage', component: StorageTab },
  { id: 'residential', label: 'Residential', component: ResidentialTab },
  { id: 'mhp', label: 'MHP', component: MhpTab },
  { id: 'commercial', label: 'Commercial', component: CommercialTab }
]

const VERSION = '0.0.1'
const BUILD_DATE = '2026-05-08'

export default function App() {
  const [activeTab, setActiveTab] = useState('storage')
  const ActiveComponent = TABS.find(t => t.id === activeTab).component

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 24px 64px' }}>
      <header>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>REI Baby Analyzer</h1>
        <p style={{ margin: '4px 0 24px', color: '#5a6a8a', fontSize: 14 }}>
          Operator-grade pre-LOI deal analysis · v{VERSION}
        </p>
      </header>

      <nav style={{ borderBottom: '1px solid #d4dae8', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '10px 18px',
                border: 'none',
                borderBottom: isActive ? '2px solid #1a2456' : '2px solid transparent',
                background: 'transparent',
                cursor: 'pointer',
                color: isActive ? '#1a2456' : '#5a6a8a',
                fontWeight: isActive ? 600 : 400,
                fontSize: 14,
                marginBottom: -1
              }}
            >
              {tab.label}
            </button>
          )
        })}
      </nav>

      <main style={{ paddingTop: 24 }}>
        <ActiveComponent />
      </main>

      <footer style={{
        marginTop: 48,
        paddingTop: 16,
        borderTop: '1px solid #d4dae8',
        color: '#8a96b0',
        fontSize: 12,
        lineHeight: 1.6
      }}>
        REI Baby Analyzer v{VERSION} · build {BUILD_DATE}
        <br />
        Math Bible v3 (Storage · Residential · Kicker · Sunset · Ramp) + Fast Calc V2.6 (MHP) — both ported, drift-tolerant.
        <br />
        Standalone repo · zero code dependencies on any other rei-* tool.
      </footer>
    </div>
  )
}
