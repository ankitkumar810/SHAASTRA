// src/shelterStatus.js
// Single source of truth for the green/yellow/red status used on the map
// pins, list badges, and detail page. Per Dev Guide Section 3:
//   green  = beds available
//   yellow = filling up (<20% capacity left)
//   red    = full

export function getShelterStatus(shelter) {
  const beds = shelter.beds_available
  const capacity = shelter.total_capacity

  if (beds == null) {
    return { key: 'unknown', label: 'No data yet', color: 'var(--color-neutral)' }
  }
  if (Number(beds) <= 0) {
    return { key: 'full', label: 'Full', color: 'var(--color-critical)' }
  }
  if (capacity && Number(beds) / Number(capacity) < 0.2) {
    return { key: 'filling', label: 'Filling up', color: 'var(--color-warn)' }
  }
  return { key: 'available', label: 'Beds available', color: 'var(--color-safe)' }
}

export function resourceBadge(status) {
  // adequate / low / critical -> label + color for food/medicine badges
  const map = {
    adequate: { label: 'Adequate', color: 'var(--color-safe)' },
    low: { label: 'Low', color: 'var(--color-warn)' },
    critical: { label: 'Critical', color: 'var(--color-critical)' },
  }
  return map[status] || { label: 'No data', color: 'var(--color-neutral)' }
}
