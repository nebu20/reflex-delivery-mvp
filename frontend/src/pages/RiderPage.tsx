import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../api/client'
import type { Delivery } from '../types/delivery'
import '../styles/pages.css'

interface Rider {
  id: string
  name: string
}

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

export default function RiderPage() {
  const navigate = useNavigate()
  const [riders, setRiders] = useState<Rider[]>([])
  const [selectedRiderId, setSelectedRiderId] = useState<string>('RIDER-001')
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [updatingMap, setUpdatingMap] = useState<Record<string, boolean>>({})
  const [actionErrorMap, setActionErrorMap] = useState<Record<string, string>>({})

  // Fetch riders list
  useEffect(() => {
    apiFetch<Rider[]>('/riders')
      .then((data) => {
        setRiders(data)
        if (data.length > 0 && !selectedRiderId) {
          setSelectedRiderId(data[0].id)
        }
      })
      .catch(() => {})
  }, [])

  // Fetch rider deliveries
  const fetchDeliveries = useCallback(async () => {
    if (!selectedRiderId) return
    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch<Delivery[]>(`/riders/${selectedRiderId}/deliveries`)
      setDeliveries(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load assigned deliveries')
    } finally {
      setLoading(false)
    }
  }, [selectedRiderId])

  useEffect(() => {
    fetchDeliveries()
  }, [fetchDeliveries])

  async function handleStatusUpdate(deliveryId: string, newStatus: 'PICKED_UP' | 'DELIVERED') {
    setUpdatingMap((prev) => ({ ...prev, [deliveryId]: true }))
    setActionErrorMap((prev) => ({ ...prev, [deliveryId]: '' }))

    try {
      const updated = await apiFetch<Delivery>(`/deliveries/${deliveryId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      })

      // Update state locally
      setDeliveries((prev) => prev.map((d) => (d.id === deliveryId ? updated : d)))
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Status update failed'
      setActionErrorMap((prev) => ({ ...prev, [deliveryId]: msg }))
    } finally {
      setUpdatingMap((prev) => ({ ...prev, [deliveryId]: false }))
    }
  }

  const selectedRiderName = riders.find((r) => r.id === selectedRiderId)?.name || selectedRiderId

  return (
    <div className="page-container">
      <header className="page-header">
        <button className="back-btn" onClick={() => navigate('/')}>← Back</button>
        <div className="page-header-content">
          <span className="page-icon">🏍️</span>
          <div>
            <h1 className="page-title">Rider — Delivery Status</h1>
            <p className="page-subtitle">Track assigned deliveries and update status</p>
          </div>
        </div>
        <button className="btn-secondary" onClick={fetchDeliveries} disabled={loading}>
          {loading ? '⟳' : '↻ Refresh'}
        </button>
      </header>

      {/* Rider selection card */}
      <div className="rider-selector-card">
        <label htmlFor="rider-select-dropdown" className="field-label">Active Rider Profile:</label>
        <select
          id="rider-select-dropdown"
          className="rider-select"
          value={selectedRiderId}
          onChange={(e) => setSelectedRiderId(e.target.value)}
        >
          {riders.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} ({r.id})
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="state-box">
          <div className="spinner" />
          <p>Loading assigned deliveries for {selectedRiderName}…</p>
        </div>
      )}

      {!loading && error && (
        <div className="alert alert--error" role="alert">⚠ {error}</div>
      )}

      {!loading && !error && deliveries.length === 0 && (
        <div className="state-box state-box--empty">
          <span className="state-icon">🏍️</span>
          <p>No assigned deliveries for {selectedRiderName}.</p>
          <p className="state-hint">Deliveries assigned by dispatchers will appear here.</p>
        </div>
      )}

      {!loading && !error && deliveries.length > 0 && (
        <div className="delivery-list">
          <div className="list-meta">{deliveries.length} assigned deliver{deliveries.length !== 1 ? 'ies' : 'y'}</div>
          {deliveries.map((d) => {
            const isUpdating = updatingMap[d.id]
            const actionError = actionErrorMap[d.id]

            return (
              <div className="delivery-card" key={d.id} id={`delivery-${d.id}`}>
                <div className="delivery-card-header">
                  <span className="delivery-id">ID: {d.id}</span>
                  <span className={`status-badge status-${d.status.toLowerCase()}`}>{d.status}</span>
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

                {/* Rider Action section */}
                <div className="rider-action-section">
                  {d.status === 'ASSIGNED' && (
                    <button
                      type="button"
                      className="btn-status btn-status--pickup"
                      onClick={() => handleStatusUpdate(d.id, 'PICKED_UP')}
                      disabled={isUpdating}
                    >
                      {isUpdating ? 'Updating…' : 'Mark as Picked Up'}
                    </button>
                  )}

                  {d.status === 'PICKED_UP' && (
                    <button
                      type="button"
                      className="btn-status btn-status--deliver"
                      onClick={() => handleStatusUpdate(d.id, 'DELIVERED')}
                      disabled={isUpdating}
                    >
                      {isUpdating ? 'Updating…' : 'Mark as Delivered'}
                    </button>
                  )}

                  {d.status === 'DELIVERED' && (
                    <div className="delivered-badge">
                      ✓ Delivered
                    </div>
                  )}

                  {actionError && (
                    <div className="alert alert--error alert--sm">⚠ {actionError}</div>
                  )}
                </div>

                <div className="delivery-card-footer">
                  <span className="field-label">🕐 Created</span>
                  <span className="field-value">{formatDate(d.createdAt)}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
