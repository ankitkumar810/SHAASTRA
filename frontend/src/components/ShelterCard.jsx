import { Link } from 'react-router-dom'
import StatusBadge from './StatusBadge'
import { getShelterStatus } from '../shelterStatus'

export default function ShelterCard({ shelter }) {
  const status = getShelterStatus(shelter)

  return (
    <Link to={`/shelters/${shelter.id}`} className="shelter-card" style={{ color: 'inherit', textDecoration: 'none' }}>
      <div className="shelter-card-top">
        <h3 className="shelter-card-name">{shelter.name}</h3>
        <StatusBadge label={status.label} color={status.color} />
      </div>
      <div className="shelter-card-meta">{shelter.address}</div>
      <div className="shelter-card-stats">
        {shelter.distance_km != null && <span>{shelter.distance_km.toFixed(1)} km away</span>}
        <span><strong>{shelter.beds_available ?? '—'}</strong> / {shelter.total_capacity} beds</span>
      </div>
    </Link>
  )
}
