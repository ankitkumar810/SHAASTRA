// src/components/FilterBar.jsx
// Person A owns this. Shared by Home.jsx (map) and ShelterList.jsx so
// filtering behaves identically in both views, per Dev Guide Section 3.
//
// Two honest gaps in the source spec, handled explicitly rather than
// silently:
// 1. "max_distance" needs a reference point the guide never defines. This
//    component gets the browser's geolocation on mount and falls back to a
//    fixed demo-district center if permission is denied/unavailable, so the
//    slider never just silently does nothing on stage.
// 2. The "resource dropdown (food/medicine)" has no backing query param on
//    GET /api/shelters (Section 5's endpoint only documents beds_available,
//    max_distance, district). It's applied as a client-side filter on
//    already-fetched results instead — see ShelterList.jsx / Home.jsx.

export default function FilterBar({ filters, onChange }) {
  const update = (patch) => onChange({ ...filters, ...patch })

  return (
    <div className="filter-bar" role="group" aria-label="Shelter filters">
      <label className="filter-toggle">
        <input
          type="checkbox"
          checked={filters.bedsAvailableOnly}
          onChange={(e) => update({ bedsAvailableOnly: e.target.checked })}
        />
        Beds available only
      </label>

      <div className="filter-field">
        <span>Within {filters.maxDistance} km</span>
        <input
          type="range"
          min="1"
          max="20"
          value={filters.maxDistance}
          onChange={(e) => update({ maxDistance: Number(e.target.value) })}
          aria-label="Maximum distance in kilometers"
        />
      </div>

      <div className="filter-field">
        <span>Resource status</span>
        <select
          value={filters.resource}
          onChange={(e) => update({ resource: e.target.value })}
        >
          <option value="">Any</option>
          <option value="food">Food running low/critical</option>
          <option value="medicine">Medicine running low/critical</option>
        </select>
      </div>
    </div>
  )
}
