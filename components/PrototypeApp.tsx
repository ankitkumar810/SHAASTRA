"use client";

import { FormEvent, useMemo, useState } from "react";
import { demoActivity, demoAlerts, demoPeople, demoShelters } from "@/lib/demo-data";
import type { SafeRecord, Shelter, ShelterStatus } from "@/types/domain";

type View = "home" | "shelters" | "family" | "dashboard";
type FamilyTab = "safe" | "looking";

const statusClass: Record<ShelterStatus, string> = {
  Open: "",
  Limited: "warning",
  Full: "critical",
};

function ShelterCard({ shelter, extraBeds = 0 }: { shelter: Shelter; extraBeds?: number }) {
  const availableBeds = shelter.availableBeds + extraBeds;
  const occupancy = Math.round(((shelter.totalBeds - availableBeds) / shelter.totalBeds) * 100);

  return (
    <article className="shelter-card">
      <span className={`status ${statusClass[shelter.status]}`}>{shelter.status}</span>
      <h3>{shelter.name}</h3>
      <p>⌖ {shelter.area}</p>
      <div className="shelter-meta"><span>▣ {shelter.food}</span><span>✚ {shelter.medicine}</span></div>
      <div className="capacity">
        <div className="capacity-top"><span><b>{availableBeds}</b> beds available</span><span>{occupancy}% occupied</span></div>
        <div className="capacity-track"><i style={{ width: `${occupancy}%` }} /></div>
      </div>
    </article>
  );
}

export function PrototypeApp() {
  const [view, setView] = useState<View>("home");
  const [familyTab, setFamilyTab] = useState<FamilyTab>("safe");
  const [query, setQuery] = useState("");
  const [capacityFilter, setCapacityFilter] = useState("all");
  const [people, setPeople] = useState<SafeRecord[]>(demoPeople);
  const [results, setResults] = useState<SafeRecord[] | null>(null);
  const [safeRegistrations, setSafeRegistrations] = useState(2184);
  const [extraBeds, setExtraBeds] = useState(0);
  const [toast, setToast] = useState("");

  const visibleShelters = useMemo(() => demoShelters.filter((shelter) => {
    const matchesSearch = `${shelter.name} ${shelter.area}`.toLowerCase().includes(query.toLowerCase());
    const matchesCapacity = capacityFilter === "all" || (capacityFilter === "available" && shelter.status === "Open") || (capacityFilter === "limited" && shelter.status === "Limited");
    return matchesSearch && matchesCapacity;
  }), [capacityFilter, query]);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3600);
  };

  const switchView = (nextView: View) => {
    setView(nextView);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submitSafeRecord = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const record: SafeRecord = {
      id: crypto.randomUUID(),
      name: String(form.get("name")),
      shelter: String(form.get("shelter")),
      message: String(form.get("message") || "Marked safe via SHAASTRA."),
    };
    setPeople((current) => [record, ...current]);
    setSafeRegistrations((current) => current + 1);
    event.currentTarget.reset();
    showToast("You are marked safe. Your status can now be found by verified family searches.");
  };

  const searchPeople = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const searchName = String(new FormData(event.currentTarget).get("name")).trim().toLowerCase();
    setResults(people.filter((person) => person.name.toLowerCase().includes(searchName)));
  };

  const simulateUpdate = () => {
    setExtraBeds((current) => current + 6);
    setSafeRegistrations((current) => current + 3);
    showToast("Live update received from St. Teresa’s Relief Centre.");
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#home" aria-label="SHAASTRA home" onClick={() => switchView("home")}><span className="brand-mark">S</span><span>SHAASTRA<small>Disaster response</small></span></a>
        <nav aria-label="Main navigation">
          {([ ["home", "⌂", "Overview"], ["shelters", "⌖", "Find a shelter"], ["family", "♡", "Family reconnect"], ["dashboard", "▦", "Authority dashboard"] ] as const).map(([id, icon, label]) => <button key={id} className={`nav-item ${view === id ? "active" : ""}`} onClick={() => switchView(id)}><span>{icon}</span>{label}</button>)}
        </nav>
        <div className="sidebar-foot"><span className="live-dot" /> Live demo data<br /><small>Last sync: just now</small></div>
      </aside>
      <main>
        <header className="topbar"><button className="mobile-menu" aria-label="Open menu">☰</button><div className="incident"><span className="incident-dot" /><span><strong>Kerala Flood Response</strong><small>Ernakulam district · Moderate alert</small></span></div><div className="top-actions"><button className="icon-button" aria-label="Language">अ</button><button className="emergency" onClick={() => showToast("Emergency contact: call 112. Share your location if it is safe to do so.")}>Emergency help <b>112</b></button></div></header>

        {view === "home" && <section id="home" className="view active"><div className="hero"><div><p className="eyebrow">ONE PLACE. REAL-TIME SUPPORT.</p><h1>Help arrives faster<br />when everyone is <em>connected.</em></h1><p className="lead">Find safe shelter, let loved ones know you are safe, and keep relief teams informed.</p><div className="hero-actions"><button className="button primary" onClick={() => switchView("shelters")}>Find nearby shelter <span>→</span></button><button className="button secondary" onClick={() => switchView("family")}>Reconnect with family</button></div></div><div className="hero-visual"><div className="signal-card"><span className="pulse" /><b>Response network active</b><small>14 shelters updating in real time</small></div><div className="map-shape"><i className="pin pin-a">⌖</i><i className="pin pin-b">⌖</i><i className="pin pin-c">⌖</i></div></div></div><div className="quick-grid"><article className="quick-card teal"><span className="card-icon">⌂</span><div><strong>{248 + extraBeds}</strong><small>safe beds available nearby</small></div><button onClick={() => switchView("shelters")}>View shelters →</button></article><article className="quick-card amber"><span className="card-icon">♡</span><div><strong>2,184</strong><small>people marked safe today</small></div><button onClick={() => switchView("family")}>Find someone →</button></article><article className="quick-card coral"><span className="card-icon">⚑</span><div><strong>3</strong><small>resource alerts need attention</small></div><button onClick={() => switchView("dashboard")}>See alerts →</button></article></div><section className="section"><div className="section-heading"><div><p className="eyebrow">LIVE STATUS</p><h2>Nearby shelters</h2></div><button className="text-link" onClick={() => switchView("shelters")}>Explore all shelters →</button></div><div className="shelter-grid">{demoShelters.slice(0, 3).map((shelter, index) => <ShelterCard key={shelter.id} shelter={shelter} extraBeds={index === 0 ? extraBeds : 0} />)}</div></section></section>}

        {view === "shelters" && <section id="shelters" className="view active"><div className="page-heading"><p className="eyebrow">SHELTER MANAGEMENT</p><h1>Find a safe place, <em>nearby.</em></h1><p>Live availability from verified relief centres in Ernakulam.</p></div><div className="filter-bar"><label className="search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by shelter or area" /></label><select value={capacityFilter} onChange={(event) => setCapacityFilter(event.target.value)}><option value="all">Any availability</option><option value="available">Beds available</option><option value="limited">Limited space</option></select><button className="button secondary compact" onClick={() => showToast("Shelters are already ordered by distance.")}>⌖ Nearest first</button></div><div className="shelter-layout"><div className="shelter-list">{visibleShelters.length ? visibleShelters.map((shelter) => <ShelterCard key={shelter.id} shelter={shelter} extraBeds={shelter.id === "st-teresas" ? extraBeds : 0} />) : <p className="empty-state">No shelters match those filters.</p>}</div><div className="map-panel"><div className="map-label"><span className="live-dot" /> Live shelter map</div><div className="map-road r1" /><div className="map-road r2" /><div className="map-road r3" />{demoShelters.map((shelter, index) => <button key={shelter.id} className={`map-marker marker-${index + 1} ${statusClass[shelter.status]}`} onClick={() => showToast(`${shelter.name}: ${shelter.availableBeds + (index === 0 ? extraBeds : 0)} beds available`)}>{shelter.availableBeds + (index === 0 ? extraBeds : 0)}</button>)}<div className="map-legend">● Beds available &nbsp; <span>● Limited</span></div></div></div></section>}

        {view === "family" && <section id="family" className="view active"><div className="page-heading family-title"><p className="eyebrow">FAMILY RECONNECTION</p><h1>Every person deserves<br />to be <em>found.</em></h1><p>Use verified shelter records to let family know you are safe or search for a loved one.</p></div><div className="reconnect-tabs"><button className={`tab ${familyTab === "safe" ? "active" : ""}`} onClick={() => setFamilyTab("safe")}>I&apos;m safe</button><button className={`tab ${familyTab === "looking" ? "active" : ""}`} onClick={() => setFamilyTab("looking")}>Looking for someone</button></div><div className="reconnect-content">{familyTab === "safe" ? <div className="tab-panel active"><div className="form-intro"><span className="large-icon safe-icon">✓</span><div><h2>Let your people breathe easy.</h2><p>Your status is shared with verified family searches. You can update or remove it anytime.</p></div></div><form className="form-card" onSubmit={submitSafeRecord}><label>Full name<input required name="name" placeholder="e.g. Ananya Nair" /></label><div className="form-row"><label>Mobile number<input required name="phone" inputMode="tel" placeholder="10-digit number" /></label><label>Current shelter<select name="shelter"><option>St. Teresa&apos;s Relief Centre</option><option>Kalamassery Community Hall</option><option>Aluva Town Hall</option><option>Not at a shelter</option></select></label></div><label>Message for family<input name="message" placeholder="e.g. I am with my sister and safe." /></label><button className="button primary" type="submit">Mark me safe <span>→</span></button></form></div> : <div className="tab-panel active"><div className="form-intro"><span className="large-icon looking-icon">⌕</span><div><h2>Search the safe registry.</h2><p>We only show verified matches, with the shelter recorded by the person or shelter administrator.</p></div></div><form className="form-card inline-form" onSubmit={searchPeople}><label>Name of person<input required name="name" placeholder="Enter full or first name" /></label><button className="button primary" type="submit">Search registry</button></form><div className="search-results">{results === null ? <p className="empty-state">Start with a name to search the verified registry.</p> : results.length ? results.map((person) => <article className="result-card" key={person.id}><div><h3>{person.name}</h3><p>✓ Verified at {person.shelter}<br />“{person.message}”</p></div><span className="verified">SAFE ✓</span></article>) : <p className="empty-state">No verified safe record found yet. Try another spelling or check back shortly.</p>}</div></div>}</div><div className="privacy-note">🔒 Your contact details are never public. A confirmed match unlocks a protected callback request.</div></section>}

        {view === "dashboard" && <section id="dashboard" className="view active"><div className="dashboard-head"><div className="page-heading"><p className="eyebrow">DISTRICT COMMAND CENTRE</p><h1>Response at a glance.</h1><p>Operational overview for Ernakulam district.</p></div><button className="button primary" onClick={simulateUpdate}>Simulate live update</button></div><div className="metrics"><article><span>ACTIVE SHELTERS</span><strong>14</strong><small className="positive">↑ 2 opened today</small></article><article><span>TOTAL OCCUPANCY</span><strong>{(1286 - extraBeds).toLocaleString()}</strong><small>of 1,534 capacity</small></article><article><span>AVAILABLE BEDS</span><strong>{248 + extraBeds}</strong><small className="positive">16.2% district capacity</small></article><article><span>SAFE REGISTRATIONS</span><strong>{safeRegistrations.toLocaleString()}</strong><small className="positive">↑ 148 in last hour</small></article></div><div className="dashboard-grid"><section className="dash-card alerts"><div className="card-title"><h2>Attention needed</h2><span className="badge">3 alerts</span></div>{demoAlerts.map((alert) => <div className="alert" key={alert.title}><span className="alert-icon">{alert.icon}</span><div><h3>{alert.title}</h3><p>{alert.description}</p></div></div>)}</section><section className="dash-card"><div className="card-title"><h2>Occupancy by zone</h2><span className="muted">Live</span></div><div className="zone-chart">{[["Aluva", 82], ["Kochi", 67], ["Kalamassery", 53], ["North Paravur", 38]].map(([zone, occupancy]) => <div key={String(zone)}><span>{zone}</span><i><b style={{ width: `${occupancy}%` }} /></i><strong>{occupancy}%</strong></div>)}</div></section><section className="dash-card wide"><div className="card-title"><h2>Recent activity</h2><button className="text-link">View log →</button></div><div className="activity-list">{demoActivity.map((activity) => <div className="activity" key={activity.description}><span className="activity-icon">{activity.icon}</span><span>{activity.description}</span><time>{activity.time}</time></div>)}</div></section></div></section>}
      </main>
      <div className={`toast ${toast ? "show" : ""}`} role="status">{toast}</div>
    </div>
  );
}
