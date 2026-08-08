import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import { Link } from 'react-router-dom'
import api from '../api'
import FilterBar from '../components/FilterBar'
import { DEFAULT_FILTERS, applyGeolocatedOrigin } from '../filterUtils'
import { getShelterStatus } from '../shelterStatus'

export default function Home() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [shelters, setShelters] = useState([])
  const [status, setStatus] = useState('loading') // loading | ready | error

  useEffect(() => {
    applyGeolocatedOrigin(setFilters)
  }, [])

  useEffect(() => {
    let cancelled = false
    setStatus((s) => (s === 'ready' ? 'ready' : 'loading'))

    api
      .get('/shelters', {
        params: {
          beds_available: filters.bedsAvailableOnly || undefined,
          max_distance: filters.maxDistance,
          lat: filters.origin.lat,
          lng: filters.origin.lng,
        },
      })
      .then((res) => {
        if (cancelled) return
        let data = res.data
        if (filters.resource) {
          const key = `${filters.resource}_status`
          data = data.filter((s) => s[key] === 'low' || s[key] === 'critical')
        }
        setShelters(data)
        setStatus('ready')
      })
      .catch(() => !cancelled && setStatus('error'))

    return () => {
      cancelled = true
    }
  }, [filters])

  const center = [filters.origin.lat, filters.origin.lng]

  return (
    <div className="page-container">
      <h1>Live shelter map</h1>
      <p style={{ color: 'var(--color-ink-soft)' }}>
        {status === 'ready' && `${shelters.length} shelter${shelters.length === 1 ? '' : 's'} shown`}
      </p>

      <FilterBar filters={filters} onChange={setFilters} />

      {status === 'error' && (
        <div className="state-message">
          <h3>Couldn't load the map</h3>
          <p>Check that the backend is running, then refresh.</p>
        </div>
      )}

      {status !== 'error' && (
        <div className="map-wrap">
          <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {shelters.map((shelter) => {
              const st = getShelterStatus(shelter)
              return (
                <CircleMarker
                  key={shelter.id}
                  center={[shelter.latitude, shelter.longitude]}
                  radius={10}
                  pathOptions={{ color: st.color, fillColor: st.color, fillOpacity: 0.85, weight: 2 }}
                >
                  <Popup>
                    <p className="popup-title">{shelter.name}</p>
                    <p style={{ margin: '0 0 4px' }}>
                      {shelter.beds_available ?? '—'} / {shelter.total_capacity} beds available
                    </p>
                    <p style={{ margin: '0 0 8px', fontSize: '0.85rem', color: 'var(--color-ink-soft)' }}>
                      Food: {shelter.food_status ?? 'n/a'} · Medicine: {shelter.medicine_status ?? 'n/a'}
                    </p>
                    <Link to={`/shelters/${shelter.id}`}>View details →</Link>
                  </Popup>
                </CircleMarker>
              )
            })}
          </MapContainer>
        </div>
      )}
    </div>
  )
}
