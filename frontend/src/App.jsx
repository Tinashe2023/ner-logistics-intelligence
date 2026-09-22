import { useEffect, useState } from 'react'

const API_BASE = 'http://localhost:8000/api'

export default function App() {
  const [status, setStatus] = useState('checking backend...')

  useEffect(() => {
    fetch('http://localhost:8000/')
      .then((r) => r.json())
      .then((d) => setStatus(`Backend OK: ${d.service}`))
      .catch(() => setStatus('Backend not reachable — start it with uvicorn'))
  }, [])

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '2rem' }}>
      <h1>NER Logistics Intelligence — Command Center</h1>
      <p>{status}</p>
      <p style={{ color: '#888' }}>
        Week 1 scaffold. Map, KPIs, and alerts get built in Week 3.
      </p>
    </div>
  )
}
