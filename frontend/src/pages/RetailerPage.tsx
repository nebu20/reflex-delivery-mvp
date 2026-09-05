import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../api/client'
import type { Delivery } from '../types/delivery'
import '../styles/pages.css'

interface FormState {
  customerName: string
  customerPhone: string
  address: string
  itemDescription: string
}

const EMPTY_FORM: FormState = {
  customerName: '',
  customerPhone: '',
  address: '',
  itemDescription: '',
}

export default function RetailerPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [successDelivery, setSuccessDelivery] = useState<Delivery | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    setError(null)
    setSuccessDelivery(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setSuccessDelivery(null)

    try {
      const delivery = await apiFetch<Delivery>('/deliveries', {
        method: 'POST',
        body: JSON.stringify(form),
      })
      setSuccessDelivery(delivery)
      setForm(EMPTY_FORM)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page-container">
      <header className="page-header">
        <button className="back-btn" onClick={() => navigate('/')}>← Back</button>
        <div className="page-header-content">
          <span className="page-icon">🏪</span>
          <div>
            <h1 className="page-title">Retailer — Create Delivery</h1>
            <p className="page-subtitle">Submit a new delivery request for a customer</p>
          </div>
        </div>
      </header>

      <div className="form-card">
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="customerName">Customer Name</label>
              <input
                id="customerName"
                name="customerName"
                type="text"
                placeholder="e.g. John Kamau"
                value={form.customerName}
                onChange={handleChange}
                autoComplete="off"
              />
            </div>

            <div className="form-field">
              <label htmlFor="customerPhone">Customer Phone</label>
              <input
                id="customerPhone"
                name="customerPhone"
                type="tel"
                placeholder="e.g. 0712 345 678"
                value={form.customerPhone}
                onChange={handleChange}
                autoComplete="off"
              />
            </div>

            <div className="form-field form-field--full">
              <label htmlFor="address">Delivery Address</label>
              <input
                id="address"
                name="address"
                type="text"
                placeholder="e.g. Nairobi, Westlands — Mpaka Road"
                value={form.address}
                onChange={handleChange}
                autoComplete="off"
              />
            </div>

            <div className="form-field form-field--full">
              <label htmlFor="itemDescription">Item Description</label>
              <textarea
                id="itemDescription"
                name="itemDescription"
                rows={3}
                placeholder="e.g. Laptop, charger included"
                value={form.itemDescription}
                onChange={handleChange}
              />
            </div>
          </div>

          {error && (
            <div className="alert alert--error" role="alert">
              ⚠ {error}
            </div>
          )}

          {successDelivery && (
            <div className="alert alert--success" role="status">
              <div className="alert-title">✓ Delivery request created!</div>
              <div className="delivery-summary">
                <span><strong>ID:</strong> #{successDelivery.id}</span>
                <span><strong>Customer:</strong> {successDelivery.customerName}</span>
                <span><strong>Status:</strong> <span className="status-badge status-pending">{successDelivery.status}</span></span>
              </div>
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={submitting}
            id="create-delivery-btn"
          >
            {submitting ? '⟳ Creating…' : '+ Create Delivery'}
          </button>
        </form>
      </div>
    </div>
  )
}
