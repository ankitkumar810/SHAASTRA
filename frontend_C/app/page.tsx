'use client'

import { useState } from 'react'
import { FindSomeone, RegistryPerson } from '@/components/reconnection/FindSomeone'
import { PersonDetail } from '@/components/reconnection/PersonDetail'
import { PersonForm, RecordType } from '@/components/reconnection/PersonForm'

type View = 'find' | 'safe' | 'missing' | 'detail'

export default function Page() {
  const [view, setView] = useState<View>('find')
  const [selectedPerson, setSelectedPerson] = useState<RegistryPerson | null>(null)
  const [notice, setNotice] = useState('')

  function openDetail(person: RegistryPerson) { setSelectedPerson(person); setView('detail'); setNotice('') }
  function showNotice(message: string) { setNotice(message); window.setTimeout(() => setNotice(''), 4000) }

  const activeView = view === 'detail' ? 'find' : view

  return <main className="site-shell">
    <header className="site-header"><div className="header-inner"><button className="brand" type="button" onClick={() => setView('find')}><span className="brand-mark" aria-hidden="true">+</span><span><strong>SHAASTRA</strong><small>Community response registry</small></span></button><div className="header-status"><span className="live-dot" aria-hidden="true" /> Registry operational <span className="header-divider" /> <span>Updated just now</span></div><button className="help-link" type="button" onClick={() => showNotice('For urgent danger, call 911. For registry help, call 311.')}>Need help?</button></div></header>
    <div className="context-banner"><div><strong>Emergency response information</strong><span>This registry supports reunification after a disaster. For immediate danger, call 911.</span></div><button type="button" onClick={() => showNotice('For urgent danger, call 911. For registry help, call 311.')}>View safety guidance →</button></div>
    <div className="page-content">
      <div className="page-title"><span className="eyebrow">Family reunification</span><h1>SHAASTRA</h1><p>Find updates, share a safe status, or let response teams know who you are looking for.</p></div>
      <nav className="view-tabs" aria-label="Registry actions"><button className={activeView === 'find' ? 'tab active' : 'tab'} type="button" onClick={() => setView('find')}>Find someone</button><button className={activeView === 'safe' ? 'tab active' : 'tab'} type="button" onClick={() => setView('safe')}>Mark as safe</button><button className={activeView === 'missing' ? 'tab active' : 'tab'} type="button" onClick={() => setView('missing')}>Report missing</button></nav>
      {notice && <div className="toast" role="status">{notice}<button type="button" aria-label="Dismiss notification" onClick={() => setNotice('')}>×</button></div>}
      {view === 'find' && <FindSomeone onSelectPerson={openDetail} onReportMissing={() => setView('missing')} />}
      {view === 'detail' && selectedPerson && <PersonDetail person={selectedPerson} onBack={() => setView('find')} />}
      {view === 'safe' && <PersonForm initialRecordType="safe" onSubmitted={() => showNotice('Safe record submitted to the community registry.')} />}
      {view === 'missing' && <PersonForm initialRecordType={'looking_for' as RecordType} onSubmitted={() => showNotice('Looking-for report submitted to response partners.')} />}
    </div>
    <footer className="site-footer"><span>RECONNECT · Public emergency registry</span><span>Information may be delayed during active response.</span></footer>
  </main>
}
