const shelters = [
  { name: "St. Teresa's Relief Centre", area: "Ernakulam North · 1.2 km", beds: 72, total: 110, food: "Food 3 days", medicine: "Medicine ready", status: "Open" },
  { name: "Kalamassery Community Hall", area: "Kalamassery · 3.8 km", beds: 18, total: 150, food: "Food 1 day", medicine: "Medicine low", status: "Limited" },
  { name: "Aluva Town Hall", area: "Aluva · 5.4 km", beds: 94, total: 120, food: "Food 4 days", medicine: "Medicine ready", status: "Open" },
  { name: "Edappally School Shelter", area: "Edappally · 4.1 km", beds: 0, total: 85, food: "Food 2 days", medicine: "Medicine ready", status: "Full" }
];
const people = [
  { name: "Ananya Nair", shelter: "St. Teresa's Relief Centre", message: "I am with my sister and safe." },
  { name: "Ravi Kumar", shelter: "Aluva Town Hall", message: "Safe and awaiting transport." },
  { name: "Meera Joseph", shelter: "Kalamassery Community Hall", message: "Safe. Please do not worry." }
];
const alerts = [
  ["⚠", "Medicine stock is low", "Kalamassery Community Hall has less than 24 hours of essential medicine."],
  ["◒", "Shelter approaching capacity", "St. Teresa's Relief Centre is at 35% available beds."],
  ["⚑", "Supply confirmation overdue", "Edappally School Shelter has not updated food stock for 6 hours."]
];
const activities = [
  ["✓", "Ananya Nair marked safe at St. Teresa's Relief Centre", "2 min ago"],
  ["⌂", "Aluva Town Hall updated capacity: 94 beds available", "12 min ago"],
  ["⚑", "Resource alert created for Kalamassery Community Hall", "18 min ago"],
  ["♡", "Family reconnection request verified", "24 min ago"]
];
let extraBeds = 0, safeRegistrations = 2184;
const capacityClass = s => s.status === "Open" ? "" : s.status === "Limited" ? "warning" : "critical";
function shelterCard(s) { const pct = Math.round(((s.total-s.beds)/s.total)*100); return `<article class="shelter-card"><span class="status ${capacityClass(s)}">${s.status}</span><h3>${s.name}</h3><p>⌖ ${s.area}</p><div class="shelter-meta"><span>▣ ${s.food}</span><span>✚ ${s.medicine}</span></div><div class="capacity"><div class="capacity-top"><span><b>${s.beds + (s === shelters[0] ? extraBeds : 0)}</b> beds available</span><span>${pct}% occupied</span></div><div class="capacity-track"><i style="width:${pct}%"></i></div></div></article>`; }
function renderShelters() { const term = document.querySelector('#shelterSearch').value.toLowerCase(); const filter = document.querySelector('#capacityFilter').value; let list = shelters.filter(s => `${s.name} ${s.area}`.toLowerCase().includes(term)); if(filter==='available') list=list.filter(s=>s.status==='Open'); if(filter==='limited') list=list.filter(s=>s.status==='Limited'); document.querySelector('#shelterList').innerHTML = list.length ? list.map(shelterCard).join('') : '<p class="empty-state">No shelters match those filters.</p>'; }
function renderDashboard() { document.querySelector('#alertsList').innerHTML = alerts.map(a=>`<div class="alert"><span class="alert-icon">${a[0]}</span><div><h3>${a[1]}</h3><p>${a[2]}</p></div></div>`).join(''); document.querySelector('#activityList').innerHTML = activities.map(a=>`<div class="activity"><span class="activity-icon">${a[0]}</span><span>${a[1]}</span><time>${a[2]}</time></div>`).join(''); }
function toast(message){ const el=document.querySelector('#toast'); el.textContent=message; el.classList.add('show'); setTimeout(()=>el.classList.remove('show'),3600); }
function go(view){ document.querySelectorAll('.view').forEach(x=>x.classList.toggle('active',x.id===view)); document.querySelectorAll('.nav-item').forEach(x=>x.classList.toggle('active',x.dataset.view===view)); window.scrollTo({top:0,behavior:'smooth'}); }
document.querySelector('#featuredShelters').innerHTML=shelters.slice(0,3).map(shelterCard).join(''); renderShelters(); renderDashboard();
document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.go)));
document.querySelectorAll('.nav-item').forEach(b=>b.addEventListener('click',()=>go(b.dataset.view)));
document.querySelector('#shelterSearch').addEventListener('input',renderShelters); document.querySelector('#capacityFilter').addEventListener('change',renderShelters);
document.querySelector('#sortDistance').addEventListener('click',()=>toast('Shelters are already ordered by distance.'));
document.querySelectorAll('.map-marker').forEach(b=>b.addEventListener('click',()=>{ const s=shelters[b.dataset.shelter]; toast(`${s.name}: ${s.beds} beds available`); }));
document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x===b));document.querySelectorAll('.tab-panel').forEach(x=>x.classList.toggle('active',x.id===b.dataset.tab));}));
document.querySelector('#safeForm').addEventListener('submit',e=>{e.preventDefault();const data=new FormData(e.target); const person={name:data.get('name'),shelter:data.get('shelter'),message:data.get('message')||'Marked safe via SHAASTRA.'};people.unshift(person);safeRegistrations++;document.querySelector('#safeMetric').textContent=safeRegistrations.toLocaleString();e.target.reset();toast(`You're marked safe. Your status can now be found by verified family searches.`);});
document.querySelector('#searchPersonForm').addEventListener('submit',e=>{e.preventDefault(); const name=new FormData(e.target).get('name').toLowerCase().trim();const matches=people.filter(p=>p.name.toLowerCase().includes(name));document.querySelector('#searchResults').innerHTML=matches.length?matches.map(p=>`<article class="result-card"><div><h3>${p.name}</h3><p>✓ Verified at ${p.shelter}<br>“${p.message}”</p></div><span class="verified">SAFE ✓</span></article>`).join(''):`<p class="empty-state">No verified safe record found yet. Try another spelling or check back shortly.</p>`;});
document.querySelector('#simulateUpdate').addEventListener('click',()=>{extraBeds+=6; safeRegistrations+=3;document.querySelector('#availableBeds').textContent=248+extraBeds;document.querySelector('#bedsMetric').textContent=248+extraBeds;document.querySelector('#occupancyMetric').textContent=(1286-extraBeds).toLocaleString();document.querySelector('#safeMetric').textContent=safeRegistrations.toLocaleString();activities.unshift(['⌂',`St. Teresa's Relief Centre updated capacity: ${72+extraBeds} beds available`,'just now']);renderDashboard();renderShelters();document.querySelector('#featuredShelters').innerHTML=shelters.slice(0,3).map(shelterCard).join('');toast('Live update received from St. Teresa’s Relief Centre.');});
document.querySelector('[data-action="emergency"]').addEventListener('click',()=>toast('Emergency contact: call 112. Share your location if it is safe to do so.'));
