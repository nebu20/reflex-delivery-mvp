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

export default function DispatcherPage() {
  const navigate = useNavigate()
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [riders, setRiders] = useState<Rider[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // State for assignment controls per delivery
  const [selectedRiders, setSelectedRiders] = useState<Record<string, string>>({})
  const [assigningMap, setAssigningMap] = useState<Record<string, boolean>>({})
  const [actionErrorMap, setActionErrorMap] = useState<Record<string, string>>({})

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [deliveriesData, ridersData] = await Promise.all([
        apiFetch<Delivery[]>('/deliveries'),
        apiFetch<Rider[]>('/riders'),
      ])
      setDeliveries(deliveriesData)
      setRiders(ridersData)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load dispatch data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  function handleRiderSelect(deliveryId: string, riderId: string) {
    setSelectedRiders((prev) => ({ ...prev, [deliveryId]: riderId }))
    setActionErrorMap((prev) => ({ ...prev, [deliveryId]: '' }))
  }

  async function handleAssignRider(deliveryId: string) {
    const riderId = selectedRiders[deliveryId]
    if (!riderId) {
      setActionErrorMap((prev) => ({ ...prev, [deliveryId]: 'Please select a rider' }))
      return
    }

    setAssigningMap((prev) => ({ ...prev, [deliveryId]: true }))
    setActionErrorMap((prev) => ({ ...prev, [deliveryId]: '' }))

    try {
      const updatedDelivery = await apiFetch<Delivery>(`/deliveries/${deliveryId}/assignment`, {
        method: 'PATCH',
        body: JSON.stringify({ riderId }),
      })

      setDeliveries((prev) =>
        prev.map((d) => (d.id === deliveryId ? updatedDelivery : d))
      )
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Assignment failed'
      setActionErrorMap((prev) => ({ ...prev, [deliveryId]: msg }))
    } finally {
      setAssigningMap((prev) => ({ ...prev, [deliveryId]: false }))
    }
  }

  function getRiderName(riderId?: string | null): string {
    if (!riderId) return 'Unassigned'
    const found = riders.find((r) => r.id === riderId)
    return found ? `${found.name} (${found.id})` : riderId
  }

  return (
    <div className="page-container">
      <header className="page-header">
        <button className="back-btn" onClick={() => navigate('/')}>← Back</button>
        <div className="page-header-content">
          <span className="page-icon">📋</span>
          <div>
            <h1 className="page-title">Dispatcher — Delivery Management</h1>
            <p className="page-subtitle">View delivery requests and assign riders</p>
          </div>
        </div>
        <button className="btn-secondary" onClick={fetchData} disabled={loading}>
          {loading ? '⟳' : '↻ Refresh'}
        </button>
      </header>

      {loading && (
        <div className="state-box">
          <div className="spinner" />
          <p>Loading deliveries and riders…</p>
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
          {deliveries.map((d) => {
            const canAssign = d.status === 'REQUESTED' || d.status === 'PENDING'
            const isAssigning = assigningMap[d.id]
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

                {/* Assignment section */}
                <div className="assignment-section">
                  {canAssign ? (
                    <div className="assignment-controls">
                      <label htmlFor={`rider-select-${d.id}`} className="field-label">Assign Rider:</label>
                      <div className="assignment-row">
                        <select
                          id={`rider-select-${d.id}`}
                          className="rider-select"
                          value={selectedRiders[d.id] || ''}
                          onChange={(e) => handleRiderSelect(d.id, e.target.value)}
                          disabled={isAssigning}
                        >
                          <option value="">-- Select Rider --</option>
                          {riders.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name} ({r.id})
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="btn-assign"
                          onClick={() => handleAssignRider(d.id)}
                          disabled={isAssigning || !selectedRiders[d.id]}
                        >
                          {isAssigning ? 'Assigning…' : 'Assign Rider'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="assigned-info">
                      <span className="field-label">Assigned to:</span>
                      <span className="assigned-rider-name">🏍️ {getRiderName(d.assignedRider)}</span>
                    </div>
                  )}

                  {/* Proof status for delivered orders */}
                  {d.status === 'DELIVERED' && (
                    <div className="dispatcher-proof-status">
                      <span className="field-label">Proof of Delivery:</span>
                      {d.proofOfDelivery ? (
                        <span className="badge badge-green">✓ Confirmed</span>
                      ) : (
                        <span className="badge badge-yellow">Pending</span>
                      )}
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
