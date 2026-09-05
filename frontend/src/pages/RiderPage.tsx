import { useNavigate } from 'react-router-dom'
import '../styles/pages.css'

export default function RiderPage() {
  const navigate = useNavigate()

  return (
    <div className="page-container">
      <header className="page-header">
        <button className="back-btn" onClick={() => navigate('/')}>← Back</button>
        <div className="page-header-content">
          <span className="page-icon">🏍️</span>
          <div>
            <h1 className="page-title">Rider — My Deliveries</h1>
            <p className="page-subtitle">View assigned deliveries and update status</p>
          </div>
        </div>
      </header>

      <div className="state-box state-box--coming-soon">
        <span className="state-icon">🚧</span>
        <h2>Coming in Sprint 3</h2>
        <p>Rider delivery tracking and status updates (ASSIGNED → PICKED_UP → DELIVERED) will be implemented here.</p>
      </div>
    </div>
  )
}
