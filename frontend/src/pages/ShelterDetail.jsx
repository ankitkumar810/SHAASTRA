import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { MapContainer, TileLayer, CircleMarker } from 'react-leaflet'
import api from '../api'
import StatusBadge from '../components/StatusBadge'
import { getShelterStatus, resourceBadge } from '../shelterStatus'

export default function ShelterDetail() {
  const { id } = useParams()
  const [shelter, setShelter] = useState(null)
  const [status, setStatus] = useState('loading') // loading | ready | error | not-found

  useEffect(() => {
    setStatus('loading')
    api
      .get(`/shelters/${id}`)
      .then((res) => {
        setShelter(res.data)
        setStatus('ready')
      })
      .catch((err) => {
        setStatus(err.response?.status === 404 ? 'not-found' : 'error')
      })
  }, [id])

  if (status === 'loading') {
    return (
      <div className="page-container">
        <div className="skeleton" style={{ height: 32, width: '50%', marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 200, width: '100%' }} />
      </div>
    )
  }

  if (status === 'not-found') {
    return (
      <div className="page-container">
        <div className="state-message">
          <h3>Shelter not found</h3>
          <p>It may have been removed. <Link to="/shelters">Back to the list</Link></p>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="page-container">
        <div className="state-message">
          <h3>Couldn't load this shelter</h3>
          <p>Check that the backend is running, then refresh.</p>
        </div>
      </div>
    )
  }

  const overall = getShelterStatus(shelter)
  const food = resourceBadge(shelter.food_status)
  const medicine = resourceBadge(shelter.medicine_status)

  return (
    <div className="page-container">
      <div className="detail-header">
        <div>
          <h1>{shelter.name}</h1>
          <p style={{ color: 'var(--color-ink-soft)', margin: 0 }}>{shelter.address}</p>
          {shelter.contact_phone && (
            <p style={{ color: 'var(--color-ink-soft)', margin: 0 }}>{shelter.contact_phone}</p>
          )}
        </div>
        <StatusBadge label={overall.label} color={overall.color} />
      </div>

      <div className="detail-stats-grid">
        <div className="stat-box">
          <div className="stat-box-label">Occupancy</div>
          <div className="stat-box-value">
            {shelter.current_occupancy ?? '—'} / {shelter.total_capacity}
          </div>
        </div>
        <div className="stat-box">
          <div className="stat-box-label">Beds available</div>
          <div className="stat-box-value">{shelter.beds_available ?? '—'}</div>
        </div>
        <div className="stat-box">
          <div className="stat-box-label">Food status</div>
          <StatusBadge label={food.label} color={food.color} />
        </div>
        <div className="stat-box">
          <div className="stat-box-label">Medicine status</div>
          <StatusBadge label={medicine.label} color={medicine.color} />
        </div>
      </div>

      {shelter.updated_at && (
        <p style={{ color: 'var(--color-ink-soft)', fontSize: '0.85rem' }}>
          Last updated {new Date(shelter.updated_at).toLocaleString()}
        </p>
      )}

      <div className="map-wrap" style={{ height: 240, margin: '16px 0' }}>
        <MapContainer
          center={[shelter.latitude, shelter.longitude]}
          zoom={15}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <CircleMarker
            center={[shelter.latitude, shelter.longitude]}
            radius={10}
            pathOptions={{ color: overall.color, fillColor: overall.color, fillOpacity: 0.85, weight: 2 }}
          />
        </MapContainer>
      </div>

      <h2>People marked safe here</h2>
      {shelter.safe_persons?.length > 0 ? (
        <ul className="safe-list">
          {shelter.safe_persons.map((person) => (
            <li key={person.id} className="safe-list-item">
              <Link to={`/persons/${person.id}`}>{person.full_name}</Link>
              {person.age_approx && <span style={{ color: 'var(--color-ink-soft)' }}>~{person.age_approx} yrs</span>}
            </li>
          ))}
        </ul>
      ) : (
        <p style={{ color: 'var(--color-ink-soft)' }}>No one has been marked safe at this shelter yet.</p>
      )}
    </div>
  )
}
