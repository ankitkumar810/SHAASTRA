// src/filterUtils.js
// Split out of FilterBar.jsx so that file only exports a component
// (keeps Vite Fast Refresh working — oxlint's react/only-export-components
// flags mixed component+non-component exports in one file).

const DEMO_CENTER = { lat: 22.3072, lng: 73.1812 } // Vadodara — change if your demo targets elsewhere

export const DEFAULT_FILTERS = {
  bedsAvailableOnly: false,
  maxDistance: 20,
  resource: '',
  origin: DEMO_CENTER,
}

export function applyGeolocatedOrigin(setFilters) {
  // Call once from the page that owns filter state.
  if (typeof window === 'undefined' || !navigator.geolocation) return
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      setFilters((f) => ({
        ...f,
        origin: { lat: pos.coords.latitude, lng: pos.coords.longitude },
      }))
    },
    () => {
      // Permission denied or unavailable — keep the demo-district fallback.
    },
    { timeout: 4000 }
  )
}
