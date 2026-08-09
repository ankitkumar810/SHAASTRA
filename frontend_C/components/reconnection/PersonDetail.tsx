'use client'

import { useState } from 'react'
import type { RegistryPerson } from './FindSomeone'

export function PersonDetail({ person, onBack }: { person: RegistryPerson; onBack: () => void }) {
  const [revealed, setRevealed] = useState(false)
  const initials = person.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('') || '•'
  const contactValue = person.contact || 'Contact not provided'

  return <section className="detail-panel" aria-labelledby="detail-heading">
    <button className="back-button" type="button" onClick={onBack}>← Back to registry</button>
    <div className="profile-card">
      <div className="profile-header"><span className="profile-photo" aria-hidden="true">{initials}</span><div><span className={person.status === 'safe' ? 'status-pill safe' : 'status-pill looking'}>{person.status === 'safe' ? 'Marked safe' : 'Looking for'}</span><h2 id="detail-heading">{person.name}</h2><p>{person.age ? `${person.age} years old` : 'Age not provided'} · {person.district}</p></div></div>
      <div className="detail-meta"><div><span className="meta-label">Current update</span><strong>{person.location}</strong></div><div><span className="meta-label">Last updated</span><strong>{person.updated}</strong></div></div>
      <div className="privacy-gate"><span className="lock-mark" aria-hidden="true">⊙</span><div><strong>Contact information is protected</strong><p>Only verified emergency response partners can access personal contact details.</p></div>{revealed ? <span className="revealed-contact">{contactValue}</span> : <button className="secondary-button" type="button" onClick={() => setRevealed(true)}>Request contact</button>}</div>
      <p className="detail-disclaimer">If you believe this record is urgent or inaccurate, contact the local response desk and reference <b>RC-{person.id}</b>.</p>
    </div>
  </section>
}
