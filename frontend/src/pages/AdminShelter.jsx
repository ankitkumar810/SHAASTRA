import { useEffect, useState } from 'react'
import api from '../api'

export default function AdminShelter() {
  const [user, setUser] = useState(null)
  const [shelter, setShelter] = useState(null)

  const [form, setForm] = useState({
    current_occupancy: '',
    beds_available: '',
    food_status: 'adequate',
    medicine_status: 'adequate',
  })

  const [status, setStatus] = useState('loading')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const storedUser = localStorage.getItem('user')

    if (!storedUser) {
      setError('You are not logged in.')
      setStatus('error')
      return
    }

    try {
      const parsedUser = JSON.parse(storedUser)

      if (parsedUser.role !== 'shelter_admin') {
        setError('Access denied. Shelter admin account required.')
        setStatus('error')
        return
      }

      if (!parsedUser.shelter_id) {
        setError('No shelter is assigned to this account.')
        setStatus('error')
        return
      }

      setUser(parsedUser)

      api
        .get(`/shelters/${parsedUser.shelter_id}`)
        .then((res) => {
          const data = res.data

          setShelter(data)

          setForm({
            current_occupancy: data.current_occupancy ?? '',
            beds_available: data.beds_available ?? '',
            food_status: data.food_status ?? 'adequate',
            medicine_status: data.medicine_status ?? 'adequate',
          })

          setStatus('ready')
        })
        .catch((err) => {
          console.error(err)
          setError('Could not load your shelter.')
          setStatus('error')
        })
    } catch (err) {
      console.error(err)
      setError('Invalid login session.')
      setStatus('error')
    }
  }, [])

  const handleChange = (event) => {
    const { name, value } = event.target

    setForm((current) => ({
      ...current,
      [name]: value,
    }))

    setMessage('')
    setError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!user?.shelter_id) {
      setError('No shelter is assigned to this account.')
      return
    }

    if (
      form.current_occupancy === '' ||
      form.beds_available === ''
    ) {
      setError(
        'Current occupancy and beds available are required.'
      )
      return
    }

    const occupancy = Number(form.current_occupancy)
    const beds = Number(form.beds_available)

    if (!Number.isFinite(occupancy) || occupancy < 0) {
      setError(
        'Current occupancy must be a valid non-negative number.'
      )
      return
    }

    if (!Number.isFinite(beds) || beds < 0) {
      setError(
        'Beds available must be a valid non-negative number.'
      )
      return
    }

    if (
      shelter?.total_capacity != null &&
      occupancy > shelter.total_capacity
    ) {
      setError(
        `Occupancy cannot exceed shelter capacity of ${shelter.total_capacity}.`
      )
      return
    }

    setSaving(true)
    setMessage('')
    setError('')

    try {
      const res = await api.post(
        `/shelters/${user.shelter_id}/updates`,
        {
          current_occupancy: occupancy,
          beds_available: beds,
          food_status: form.food_status,
          medicine_status: form.medicine_status,
        }
      )

      setMessage('Shelter status updated successfully.')

      setShelter((current) => ({
        ...current,
        current_occupancy: res.data.current_occupancy,
        beds_available: res.data.beds_available,
        food_status: res.data.food_status,
        medicine_status: res.data.medicine_status,
        updated_at: res.data.updated_at,
      }))
    } catch (err) {
      console.error('Shelter update failed:', err)

      setError(
        err.response?.data?.error ||
          'Failed to update shelter status.'
      )
    } finally {
      setSaving(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="page-container">
        <div className="state-message">
          <h2>Loading shelter dashboard</h2>
          <p>Please wait while your shelter information is loaded.</p>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="page-container">
        <div className="state-message">
          <h2>Unable to open shelter dashboard</h2>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  const capacity = shelter?.total_capacity || 0
  const occupancy = shelter?.current_occupancy || 0
  const beds = shelter?.beds_available || 0

  const occupancyPercent =
    capacity > 0
      ? Math.round((occupancy / capacity) * 100)
      : 0

  const getStatusClass = (value) => {
    if (value === 'critical') return 'status-critical'
    if (value === 'low') return 'status-warning'
    return 'status-safe'
  }

  const operationalStatus =
    occupancyPercent >= 90 ||
    shelter?.food_status === 'critical' ||
    shelter?.medicine_status === 'critical'
      ? 'Critical'
      : occupancyPercent >= 75 ||
          shelter?.food_status === 'low' ||
          shelter?.medicine_status === 'low'
        ? 'Attention'
        : 'Operational'

  const operationalClass =
    operationalStatus === 'Critical'
      ? 'status-critical'
      : operationalStatus === 'Attention'
        ? 'status-warning'
        : 'status-safe'

  return (
    <div className="dashboard-page">
      <div className="dashboard-container">

        {/* HEADER */}
        <header className="dashboard-header">
          <div>
            <div className="dashboard-eyebrow">
              SHA A S T R A&nbsp; · &nbsp;EMERGENCY OPERATIONS
            </div>

            <h1>Shelter Admin Dashboard</h1>

            <p className="dashboard-subtitle">
              Welcome back, <strong>{user?.username}</strong>.
              Manage shelter capacity, resources and readiness.
            </p>
          </div>
        </header>

        {/* SHELTER IDENTITY */}
        <section className="shelter-admin-hero">
          <div>
            <div className="dashboard-eyebrow">
              ASSIGNED SHELTER
            </div>

            <h2>{shelter?.name}</h2>

            <p className="shelter-location">
              {shelter?.district || '—'}
              {shelter?.address
                ? ` · ${shelter.address}`
                : ''}
            </p>
          </div>

          <div className={`status-pill ${operationalClass}`}>
            <span className="status-dot"></span>
            {operationalStatus}
          </div>
        </section>

        {/* SUMMARY CARDS */}
        <section className="summary-grid">

          <div className="summary-card">
            <div className="summary-label">
              TOTAL CAPACITY
            </div>

            <div className="summary-value">
              {capacity}
            </div>

            <div className="summary-description">
              Maximum people accommodated
            </div>
          </div>

          <div className="summary-card">
            <div className="summary-label">
              OCCUPANCY
            </div>

            <div className="summary-value">
              {occupancyPercent}%
            </div>

            <div className="summary-description">
              {occupancy} people currently sheltered
            </div>
          </div>

          <div className="summary-card">
            <div className="summary-label">
              BEDS AVAILABLE
            </div>

            <div className="summary-value">
              {beds}
            </div>

            <div className="summary-description">
              Ready for allocation
            </div>
          </div>

          <div
            className={`summary-card ${
              operationalStatus === 'Critical'
                ? 'summary-card-critical'
                : ''
            }`}
          >
            <div className="summary-label">
              SHELTER STATUS
            </div>

            <div className="summary-value">
              {operationalStatus}
            </div>

            <div className="summary-description">
              Current operational condition
            </div>
          </div>

        </section>

        {/* OCCUPANCY */}
        <section className="admin-section">

          <div className="section-heading">
            <div>
              <div className="dashboard-eyebrow">
                LIVE CAPACITY
              </div>

              <h2>Occupancy Overview</h2>

              <p>
                Current shelter utilization and available capacity.
              </p>
            </div>

            <strong className="section-count">
              {occupancy} / {capacity}
            </strong>
          </div>

          <div className="occupancy-panel">

            <div className="occupancy-header">
              <span>Current occupancy</span>

              <strong>
                {occupancyPercent}% occupied
              </strong>
            </div>

            <div className="occupancy-track">
              <div
                className={`occupancy-fill ${
                  occupancyPercent >= 90
                    ? 'occupancy-critical'
                    : occupancyPercent >= 75
                      ? 'occupancy-warning'
                      : 'occupancy-safe'
                }`}
                style={{
                  width: `${Math.min(
                    occupancyPercent,
                    100
                  )}%`,
                }}
              ></div>
            </div>

            <div className="occupancy-footer">
              <span>
                {occupancy} people sheltered
              </span>

              <span>
                {Math.max(capacity - occupancy, 0)} spaces remaining
              </span>
            </div>

          </div>

        </section>

        {/* UPDATE STATUS */}
        <section className="admin-section">

          <div className="section-heading">
            <div>
              <div className="dashboard-eyebrow">
                RESOURCE MANAGEMENT
              </div>

              <h2>Update Shelter Status</h2>

              <p>
                Keep the emergency operations team informed of
                current shelter conditions.
              </p>
            </div>
          </div>

          {message && (
            <div className="alert alert-success">
              <strong>Updated successfully</strong>
              <span>{message}</span>
            </div>
          )}

          {error && (
            <div className="alert alert-error">
              <strong>Update failed</strong>
              <span>{error}</span>
            </div>
          )}

          <form
            className="admin-form"
            onSubmit={handleSubmit}
          >

            <div className="form-grid">

              <div className="form-field">
                <label htmlFor="current_occupancy">
                  Current Occupancy
                </label>

                <input
                  id="current_occupancy"
                  name="current_occupancy"
                  type="number"
                  min="0"
                  max={capacity || undefined}
                  value={form.current_occupancy}
                  onChange={handleChange}
                  required
                />

                <small>
                  Maximum allowed: {capacity}
                </small>
              </div>

              <div className="form-field">
                <label htmlFor="beds_available">
                  Beds Available
                </label>

                <input
                  id="beds_available"
                  name="beds_available"
                  type="number"
                  min="0"
                  value={form.beds_available}
                  onChange={handleChange}
                  required
                />

                <small>
                  Beds currently ready for allocation
                </small>
              </div>

              <div className="form-field">
                <label htmlFor="food_status">
                  Food Status
                </label>

                <select
                  id="food_status"
                  name="food_status"
                  value={form.food_status}
                  onChange={handleChange}
                >
                  <option value="adequate">
                    Adequate
                  </option>

                  <option value="low">
                    Low
                  </option>

                  <option value="critical">
                    Critical
                  </option>
                </select>

                <span
                  className={`resource-status ${getStatusClass(
                    form.food_status
                  )}`}
                >
                  ● {form.food_status}
                </span>
              </div>

              <div className="form-field">
                <label htmlFor="medicine_status">
                  Medicine Status
                </label>

                <select
                  id="medicine_status"
                  name="medicine_status"
                  value={form.medicine_status}
                  onChange={handleChange}
                >
                  <option value="adequate">
                    Adequate
                  </option>

                  <option value="low">
                    Low
                  </option>

                  <option value="critical">
                    Critical
                  </option>
                </select>

                <span
                  className={`resource-status ${getStatusClass(
                    form.medicine_status
                  )}`}
                >
                  ● {form.medicine_status}
                </span>
              </div>

            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
              >
                {saving
                  ? 'Saving...'
                  : 'Update Shelter Status'}
              </button>
            </div>

          </form>

        </section>

        {/* CURRENT RESOURCES */}
        <section className="admin-section">

          <div className="section-heading">
            <div>
              <div className="dashboard-eyebrow">
                CURRENT RESOURCES
              </div>

              <h2>Resource Readiness</h2>

              <p>
                Current availability of essential shelter resources.
              </p>
            </div>
          </div>

          <div className="resource-grid">

            <div className="resource-card">
              <div className="resource-card-header">
                <span>Food</span>

                <span
                  className={`status-pill ${getStatusClass(
                    shelter?.food_status
                  )}`}
                >
                  <span className="status-dot"></span>
                  {shelter?.food_status || '—'}
                </span>
              </div>

              <div className="resource-card-value">
                {shelter?.food_status
                  ? shelter.food_status.charAt(0).toUpperCase() +
                    shelter.food_status.slice(1)
                  : '—'}
              </div>

              <p>
                Current food supply status
              </p>
            </div>

            <div className="resource-card">
              <div className="resource-card-header">
                <span>Medicine</span>

                <span
                  className={`status-pill ${getStatusClass(
                    shelter?.medicine_status
                  )}`}
                >
                  <span className="status-dot"></span>
                  {shelter?.medicine_status || '—'}
                </span>
              </div>

              <div className="resource-card-value">
                {shelter?.medicine_status
                  ? shelter.medicine_status.charAt(0).toUpperCase() +
                    shelter.medicine_status.slice(1)
                  : '—'}
              </div>

              <p>
                Current medicine supply status
              </p>
            </div>

            <div className="resource-card">
              <div className="resource-card-header">
                <span>Beds</span>
              </div>

              <div className="resource-card-value">
                {beds}
              </div>

              <p>
                Beds ready for allocation
              </p>
            </div>

          </div>

        </section>

        {/* LAST UPDATED */}
        {shelter?.updated_at && (
          <div className="last-updated">
            Last updated:{' '}
            {new Date(
              shelter.updated_at
            ).toLocaleString()}
          </div>
        )}

      </div>
    </div>
  )
}