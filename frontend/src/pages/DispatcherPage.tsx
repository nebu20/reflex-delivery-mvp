import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../api/client'
import type { Delivery } from '../types/delivery'
import '../styles/pages.css'

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-KE', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

export default function DispatcherPage() {
  const navigate = useNavigate()
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDeliveries = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch<Delivery[]>('/deliveries')
      setDeliveries(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load delivery requests')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDeliveries()
  }, [fetchDeliveries])

  return (
    <div className="page-container">
      <header className="page-header">
        <button className="back-btn" onClick={() => navigate('/')}>← Back</button>
        <div className="page-header-content">
          <span className="page-icon">📋</span>
          <div>
            <h1 className="page-title">Dispatcher — Delivery Requests</h1>
            <p className="page-subtitle">View and monitor all incoming delivery requests</p>
          </div>
        </div>
        <button className="btn-secondary" onClick={fetchDeliveries} disabled={loading}>
          {loading ? '⟳' : '↻ Refresh'}
        </button>
      </header>

      {loading && (
        <div className="state-box">
          <div className="spinner" />
          <p>Loading deliveries…</p>
        </div>
      )}

      {!loading && error && (
        <div className="alert alert--error" role="alert">⚠ {error}</div>
      )}

      {!loading && !error && deliveries.length === 0 && (
        <div className="state-box state-box--empty">
          <span className="state-icon">📭</span>
          <p>No delivery requests found.</p>
          <p className="state-hint">Requests created by retailers will appear here.</p>
        </div>
      )}

      {!loading && !error && deliveries.length > 0 && (
        <div className="delivery-list">
          <div className="list-meta">{deliveries.length} delivery request{deliveries.length !== 1 ? 's' : ''}</div>
          {deliveries.map((d) => (
            <div className="delivery-card" key={d.id} id={`delivery-${d.id}`}>
              <div className="delivery-card-header">
                <span className="delivery-id">ID: {d.id}</span>
                <span className={`status-badge status-${(d.status || 'REQUESTED').toLowerCase()}`}>{d.status}</span>
              </div>
              <div className="delivery-card-body">
                <div className="delivery-field">
                  <span className="field-label">👤 Customer</span>
                  <span className="field-value">{d.customerName}</span>
                </div>
                <div className="delivery-field">
                  <span className="field-label">📞 Phone</span>
                  <span className="field-value">{d.customerPhone}</span>
                </div>
                <div className="delivery-field delivery-field--full">
                  <span className="field-label">📍 Address</span>
                  <span className="field-value">{d.deliveryAddress || d.address}</span>
                </div>
                <div className="delivery-field delivery-field--full">
                  <span className="field-label">📦 Item</span>
                  <span className="field-value">{d.itemDescription}</span>
                </div>
              </div>
              <div className="delivery-card-footer">
                <span className="field-label">🕐 Created</span>
                <span className="field-value">{formatDate(d.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
