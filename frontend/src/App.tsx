import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import RetailerPage from './pages/RetailerPage'
import DispatcherPage from './pages/DispatcherPage'
import RiderPage from './pages/RiderPage'
import './App.css'

interface HealthResponse {
  status: string
  service: string
}

function HomePage() {
  const navigate = useNavigate()
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

  const roles = [
    {
      icon: '🏪',
      title: 'Retailer Staff',
      description: 'Create a delivery request for a customer',
      path: '/retailer',
      id: 'role-retailer',
    },
    {
      icon: '📋',
      title: 'Dispatcher',
      description: 'View and assign pending delivery requests',
      path: '/dispatcher',
      id: 'role-dispatcher',
    },
    {
      icon: '🏍️',
      title: 'Rider',
      description: 'Track assigned deliveries and update status',
      path: '/rider',
      id: 'role-rider',
    },
  ]

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
        <h2 className="roles-heading">Select a Role to Continue</h2>
        <div className="roles-grid">
          {roles.map((role) => (
            <button
              key={role.path}
              id={role.id}
              className="role-card"
              onClick={() => navigate(role.path)}
            >
              <div className="role-icon">{role.icon}</div>
              <h3>{role.title}</h3>
              <p>{role.description}</p>
              <span className="role-arrow">→</span>
            </button>
          ))}
        </div>
      </div>

      <p className="footer">
        Reflex MVP · Sprint 2 · Node.js + Express + SQLite + React + Vite
      </p>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/retailer" element={<RetailerPage />} />
        <Route path="/dispatcher" element={<DispatcherPage />} />
        <Route path="/rider" element={<RiderPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
