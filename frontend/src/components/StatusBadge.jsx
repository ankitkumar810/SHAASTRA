export default function StatusBadge({ label, color }) {
  return (
    <span
      className="badge"
      style={{ color, background: `color-mix(in srgb, ${color} 14%, white)` }}
    >
      <span className="badge-dot" />
      {label}
    </span>
  )
}
