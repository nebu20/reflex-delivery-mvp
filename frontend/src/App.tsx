import { useEffect, useState } from 'react'
import './App.css'

interface HealthResponse {
  status: string
  service: string
}

function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('http://localhost:3001/api/health')
      .then((res) => res.json())
      .then((data: HealthResponse) => {
        setHealth(data)
        setLoading(false)
      })
      .catch(() => {
        setError('API unreachable — start the backend with: npm run dev')
        setLoading(false)
      })
  }, [])

  return (
    <div className="container">
      <div className="hero">
        <div className="logo-mark">⚡</div>
        <h1 className="title">Reflex</h1>
        <p className="subtitle">Delivery Management System</p>
        <p className="tagline">
          Fast, trackable, accountable — built for Kenyan retailers.
        </p>
      </div>

      <div className="status-card">
        <h2 className="status-heading">System Status</h2>

        <div className="status-row">
          <span className="status-label">Frontend</span>
          <span className="badge badge-green">✓ Running</span>
        </div>

        <div className="status-row">
          <span className="status-label">Backend API</span>
          {loading ? (
            <span className="badge badge-yellow">⟳ Checking…</span>
          ) : health ? (
            <span className="badge badge-green">✓ {health.service} · {health.status}</span>
          ) : (
            <span className="badge badge-red">✗ Offline</span>
          )}
        </div>

        <div className="status-row">
          <span className="status-label">Database</span>
          {loading ? (
            <span className="badge badge-yellow">⟳ Checking…</span>
          ) : health ? (
            <span className="badge badge-green">✓ SQLite connected</span>
          ) : (
            <span className="badge badge-red">✗ Not reachable</span>
          )}
        </div>

        {error && <p className="error-hint">{error}</p>}
      </div>

      <div className="roles-section">
        <h2 className="roles-heading">Personas (Coming Next)</h2>
        <div className="roles-grid">
          <div className="role-card">
            <div className="role-icon">🏪</div>
            <h3>Retailer Staff</h3>
            <p>Create delivery requests for customers</p>
          </div>
          <div className="role-card">
            <div className="role-icon">📋</div>
            <h3>Dispatcher</h3>
            <p>Assign open deliveries to riders</p>
          </div>
          <div className="role-card">
            <div className="role-icon">🏍️</div>
            <h3>Rider</h3>
            <p>Track and update delivery status</p>
          </div>
        </div>
      </div>

      <p className="footer">
        Reflex MVP · Sprint 1 Foundation · Node.js + Express + SQLite + React + Vite
      </p>
    </div>
  )
}

export default App
