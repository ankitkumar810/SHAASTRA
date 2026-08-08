import { useEffect, useState } from 'react'
import api from '../api'
import FilterBar from '../components/FilterBar'
import { DEFAULT_FILTERS, applyGeolocatedOrigin } from '../filterUtils'
import ShelterCard from '../components/ShelterCard'

const SORTS = {
  nearest: (a, b) => (a.distance_km ?? Infinity) - (b.distance_km ?? Infinity),
  beds: (a, b) => (b.beds_available ?? -1) - (a.beds_available ?? -1),
  recent: (a, b) => new Date(b.updated_at ?? 0) - new Date(a.updated_at ?? 0),
}

export default function ShelterList() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [sort, setSort] = useState('nearest')
  const [shelters, setShelters] = useState([])
  const [status, setStatus] = useState('loading')

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

  const sorted = [...shelters].sort(SORTS[sort])

  return (
    <div className="page-container">
      <h1>Shelters</h1>
      <FilterBar filters={filters} onChange={setFilters} />

      <div className="list-toolbar">
        <span className="result-count">
          {status === 'ready' && `${sorted.length} shelter${sorted.length === 1 ? '' : 's'}`}
        </span>
        <div className="filter-field" style={{ minWidth: 180 }}>
          <span>Sort by</span>
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="nearest">Nearest</option>
            <option value="beds">Most beds available</option>
            <option value="recent">Recently updated</option>
          </select>
        </div>
      </div>

      {status === 'loading' && (
        <div className="shelter-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="shelter-card">
              <div className="skeleton" style={{ height: 20, width: '70%' }} />
              <div className="skeleton" style={{ height: 14, width: '50%' }} />
              <div className="skeleton" style={{ height: 14, width: '40%' }} />
            </div>
          ))}
        </div>
      )}

      {status === 'error' && (
        <div className="state-message">
          <h3>Couldn't load shelters</h3>
          <p>Check that the backend is running, then refresh.</p>
        </div>
      )}

      {status === 'ready' && sorted.length === 0 && (
        <div className="state-message">
          <h3>No shelters match these filters</h3>
          <p>Try widening the distance or clearing "beds available only".</p>
        </div>
      )}

      {status === 'ready' && sorted.length > 0 && (
        <div className="shelter-grid">
          {sorted.map((shelter) => (
            <ShelterCard key={shelter.id} shelter={shelter} />
          ))}
        </div>
      )}
    </div>
  )
}
