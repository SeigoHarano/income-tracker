/* ============================
   Storage keys & defaults
   ============================ */
const KEYS = {
  HISTORY: 'iet_v4_history',
  CATEGORIES: 'iet_v4_categories'
};

let history = JSON.parse(localStorage.getItem(KEYS.HISTORY) || '[]');
let categories = JSON.parse(localStorage.getItem(KEYS.CATEGORIES) || 'null');
if(!categories){
  categories = { income: ['Salary','Freelance','Other'], expense: ['Food','Transport','Bills','Shopping','Other'] };
  localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(categories));
}

/* ============================
   Element refs
   ============================ */
const views = document.querySelectorAll('.view');
const navItems = document.querySelectorAll('.nav-item');

const topBalance = document.getElementById('top-balance');
const topIncome = document.getElementById('top-income');
const topExpense = document.getElementById('top-expense');
const topSub = document.getElementById('top-sub');

const typeEl = document.getElementById('type');
const catSelect = document.getElementById('category');
const sourceEl = document.getElementById('source');
const amountEl = document.getElementById('amount');
const addBtn = document.getElementById('addBtn');
const exportBtn = document.getElementById('exportBtn');
const recentEl = document.getElementById('recent');
const filterClearHolder = document.getElementById('filter-clear-holder');

const dashBalance = document.getElementById('dash-balance');
const dashIncome = document.getElementById('dash-income');
const dashExpense = document.getElementById('dash-expense');

const pieCanvas = document.getElementById('pie');
const pieLegend = document.getElementById('pie-legend');
const pieInfo = document.getElementById('pie-info');
const pieTf = document.getElementById('pie-timeframe');

const sparkCanvas = document.getElementById('spark');
const sparkInfo = document.getElementById('spark-info');

const calEl = document.getElementById('calendar');
const calMonthEl = document.getElementById('cal-month');
const calPrev = document.getElementById('cal-prev');
const calNext = document.getElementById('cal-next');
const calToday = document.getElementById('cal-today');

const newType = document.getElementById('newType');
const newName = document.getElementById('newName');
const addCatBtn = document.getElementById('addCatBtn');
const catContainer = document.getElementById('catContainer');

const exportBtn2 = document.getElementById('exportBtn2');
const resetDataBtn = document.getElementById('resetDataBtn');

/* ============================
   Utilities
   ============================ */
function saveAll(){ localStorage.setItem(KEYS.HISTORY, JSON.stringify(history)); localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(categories)); }
function fmt(n){ return '₱' + Number(n).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2}); }
function monthKey(dateISO){ const d=new Date(dateISO); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0'); }
function dateKey(dateISO){ const d=new Date(dateISO); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); }

/* ============================
   Navigation (bottom nav)
   ============================ */
function showView(name){
  views.forEach(v => { if(v.id === 'view-'+name) v.classList.remove('hidden'); else v.classList.add('hidden'); });
  navItems.forEach(n => n.dataset.view === name ? n.classList.add('active') : n.classList.remove('active'));
  window.scrollTo(0,0);
}
navItems.forEach(n => n.addEventListener('click', ()=> showView(n.dataset.view)));

/* ============================
   Populate categories select & UI
   ============================ */
function populateCategorySelect(){
  catSelect.innerHTML = '';
  const list = categories[typeEl.value] || [];
  if(list.length === 0){ const o=document.createElement('option'); o.value=''; o.textContent='(no categories)'; catSelect.appendChild(o); return; }
  list.forEach(c => { const o=document.createElement('option'); o.value=c; o.textContent=c; catSelect.appendChild(o); });
}
typeEl.addEventListener('change', populateCategorySelect);

function renderCategoriesUI(){
  catContainer.innerHTML = '';
  ['income','expense'].forEach(t => {
    const h = document.createElement('div'); h.style.fontWeight='700'; h.textContent = t.toUpperCase();
    catContainer.appendChild(h);
    categories[t].forEach((c,i) => {
      const row = document.createElement('div'); row.style.display='flex'; row.style.justifyContent='space-between'; row.style.alignItems='center'; row.style.padding='8px'; row.style.marginTop='6px'; row.style.background='#fff'; row.style.border='1px solid #f0f2f6'; row.style.borderRadius='8px';
      const left = document.createElement('div'); left.textContent = c;
      const del = document.createElement('button'); del.className='btn ghost'; del.textContent='Delete';
      del.onclick = ()=> { if(!confirm('Delete category "'+c+'"?')) return; categories[t].splice(i,1); saveAll(); renderAll(); };
      row.appendChild(left); row.appendChild(del); catContainer.appendChild(row);
    });
  });
}

/* ============================
   Current filter state (calendar or pie or none)
   ============================ */
let currentFilter = null; // {type:'date'|'category-tf', value:...}

/* ============================
   Recent list render (applies filter)
   ============================ */
function renderRecent(){
  recentEl.innerHTML = '';
  let list = history.slice();
  if(currentFilter){
    if(currentFilter.type === 'date'){
      list = list.filter(h => dateKey(h.date) === currentFilter.value);
    } else if(currentFilter.type === 'category-tf'){
      const {cat, tf} = currentFilter.value;
      const now = new Date();
      list = list.filter(h => {
        if(h.type !== 'expense' || h.category !== cat) return false;
        const d = new Date(h.date);
        if(tf === 'today') return d.getFullYear()===now.getFullYear() && d.getMonth()===now.getMonth() && d.getDate()===now.getDate();
        if(tf === 'month') return d.getFullYear()===now.getFullYear() && d.getMonth()===now.getMonth();
        if(tf === 'year') return d.getFullYear()===now.getFullYear();
        return true;
      });
    }
  }

  const recent = list.slice().reverse().slice(0,20);
  if(recent.length === 0){ recentEl.innerHTML = '<div style="color:var(--muted);padding:8px">No transactions.</div>'; filterClearHolder.innerHTML = ''; return; }

  // show clear filter button if filter active
  if(currentFilter){
    const btn = document.createElement('button'); btn.className='btn ghost'; btn.textContent='Clear filter';
    btn.onclick = ()=> { currentFilter = null; renderAll(); };
    filterClearHolder.innerHTML = ''; filterClearHolder.appendChild(btn);
  } else filterClearHolder.innerHTML = '';

  recent.forEach(h => {
    const el = document.createElement('div'); el.className='entry';
    const left = document.createElement('div'); left.style.display='flex'; left.style.flexDirection='column';
    const title = document.createElement('div'); title.style.fontWeight='700'; title.textContent = h.source || h.category || h.type;
    const meta = document.createElement('div'); meta.className='meta'; meta.textContent = `${h.type.toUpperCase()} • ${h.category || '-'} • ${new Date(h.date).toLocaleString()}`;
    left.appendChild(title); left.appendChild(meta);

    const right = document.createElement('div'); right.style.display='flex'; right.style.gap='8px'; right.style.alignItems='center';
    const amt = document.createElement('div'); amt.style.fontWeight=800; amt.style.color = h.type === 'income' ? 'var(--primary)' : 'var(--danger)'; amt.textContent = (h.type==='income'?'':'-') + fmt(h.amount);
    const del = document.createElement('button'); del.className='btn ghost'; del.textContent='Delete';
    del.onclick = ()=> { if(!confirm('Delete this transaction?')) return; const idx = history.indexOf(h); if(idx>-1) history.splice(idx,1); saveAll(); renderAll(); };
    right.appendChild(amt); right.appendChild(del);

    el.appendChild(left); el.appendChild(right); recentEl.appendChild(el);
  });
}

/* ============================
   Dashboard computing & rendering
   ============================ */
function renderDashboard(){
  const now = new Date(); const nowKey = monthKey(now.toISOString());
  const prev = new Date(); prev.setMonth(prev.getMonth()-1); const prevKey = monthKey(prev.toISOString());

  let incNow=0, expNow=0, incPrev=0, expPrev=0;
  history.forEach(h => {
    const k = monthKey(h.date);
    if(k === nowKey){ if(h.type==='income') incNow+=Number(h.amount); else expNow+=Number(h.amount); }
    else if(k === prevKey){ if(h.type==='income') incPrev+=Number(h.amount); else expPrev+=Number(h.amount); }
  });

  const balNow = incNow - expNow;
  topBalance.textContent = fmt(balNow);
  topIncome.textContent = fmt(incNow);
  topExpense.textContent = fmt(expNow);

  dashIncome.textContent = fmt(incNow);
  dashExpense.textContent = fmt(expNow);
  dashBalance.textContent = fmt(balNow);

  const diff = balNow - (incPrev - expPrev);
  const trend = document.getElementById('trend');
  if(!trend) return;
  if(diff >= 0) trend.innerHTML = `Trend: <span style="color:#16a34a">▲ ${fmt(Math.abs(diff))}</span>`;
  else trend.innerHTML = `Trend: <span style="color:#dc2626">▼ ${fmt(Math.abs(diff))}</span>`;

  // pie entries: totals by expense category this month
  const totals = {}; categories.expense.forEach(c => totals[c]=0);
  history.forEach(h => { if(h.type==='expense' && monthKey(h.date) === nowKey) totals[h.category] = (totals[h.category]||0) + Number(h.amount); });
  const entries = Object.entries(totals).filter(([k,v])=>v>0);
  drawPie(entries); renderPieLegend(entries);
  drawSparkline();
}

/* ============================
   PIE chart functions (interactive)
   ============================ */
function drawPie(entries){
  const ctx = pieCanvas.getContext('2d');
  const DPR = devicePixelRatio || 1;
  pieCanvas.width = pieCanvas.clientWidth * DPR;
  pieCanvas.height = pieCanvas.clientHeight * DPR;
  ctx.setTransform(DPR,0,0,DPR,0,0);
  ctx.clearRect(0,0,pieCanvas.clientWidth,pieCanvas.clientHeight);

  const w = pieCanvas.clientWidth, h = pieCanvas.clientHeight;
  const cx = w/2, cy = h/2 - 10, r = Math.min(w,h)/3;
  if(!entries || entries.length === 0){
    ctx.fillStyle = '#f3f4f6'; ctx.font='14px sans-serif'; ctx.textAlign='center';
    ctx.fillText('No expense data for this month', cx, cy);
    pieInfo.textContent = 'No expense slices yet';
    pieCanvas.onmousemove = null; pieCanvas.onclick = null;
    return;
  }

  const palette = ['#f97316','#fb7185','#facc15','#60a5fa','#34d399','#a78bfa','#f472b6','#7dd3fc','#fca5a5','#c4b5fd'];
  const total = entries.reduce((s,[k,v])=>s+v,0);
  let start = -Math.PI/2;
  const slices = [];
  entries.forEach(([cat,val], i) => {
    const angle = (val/total) * (Math.PI*2);
    const end = start + angle;
    const color = palette[i % palette.length];
    ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,r,start,end); ctx.closePath();
    ctx.fillStyle = color; ctx.fill();
    slices.push({start,end,cat,val,color,index:i});
    start = end;
  });

  pieCanvas.onmousemove = (e) => {
    const rect = pieCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const dx = x - cx, dy = y - cy, dist = Math.sqrt(dx*dx+dy*dy), angle = Math.atan2(dy,dx);
    let found = null;
    if(dist <= r){
      let a = angle; if(a < -Math.PI/2) a += Math.PI*2;
      for(const s of slices) if(a>=s.start && a<=s.end){ found = s; break; }
    }
    ctx.clearRect(0,0,w,h);
    slices.forEach(s => {
      const isHover = found && found.index === s.index;
      const rr = isHover ? r*1.06 : r;
      ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,rr,s.start,s.end); ctx.closePath();
      ctx.fillStyle = s.color; ctx.fill();
      if(isHover){ ctx.fillStyle='#111827'; ctx.font='600 14px sans-serif'; ctx.textAlign='center'; ctx.fillText(`${s.cat} — ${fmt(s.val)}`, cx, cy+4); }
    });
    pieInfo.textContent = found ? `Hovering: ${found.cat} — ${fmt(found.val)}` : 'Hover to highlight a slice';
  };

  pieCanvas.onclick = (e) => {
    const rect = pieCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const dx = x - cx, dy = y - cy, dist = Math.sqrt(dx*dx+dy*dy);
    if(dist > r) return;
    const angle = Math.atan2(dy,dx); let a = angle; if(a < -Math.PI/2) a += Math.PI*2;
    let clicked = null; for(const s of slices) if(a>=s.start && a<=s.end){ clicked = s; break; }
    if(!clicked) return;
    const tf = pieTf.value; currentFilter = { type:'category-tf', value:{cat:clicked.cat, tf} };
    showView('home'); renderAll();
    pieInfo.textContent = `${clicked.cat} — filtered (${tf})`;
  };
}

/* ============================
   Pie legend rendering
   ============================ */
function renderPieLegend(entries){
  pieLegend.innerHTML = '';
  const palette = ['#f97316','#fb7185','#facc15','#60a5fa','#34d399','#a78bfa','#f472b6','#7dd3fc','#fca5a5','#c4b5fd'];
  entries.forEach(([cat,val], i) => {
    const el = document.createElement('div'); el.className='pie-legend-item';
    el.innerHTML = `<div class="pie-legend-color" style="background:${palette[i % palette.length]}"></div><div style="font-weight:700">${cat}</div><div style="margin-left:8px;color:var(--muted)">${fmt(val)}</div>`;
    el.onclick = ()=> { currentFilter = { type:'category-tf', value:{cat, tf:pieTf.value} }; showView('home'); renderAll(); pieInfo.textContent = `${cat} — filtered (${pieTf.value})`; };
    pieLegend.appendChild(el);
  });
}

/* ============================
   Sparkline: 12 months
   ============================ */
function drawSparkline(){
  const ctx = sparkCanvas.getContext('2d');
  const DPR = devicePixelRatio || 1;
  sparkCanvas.width = sparkCanvas.clientWidth * DPR;
  sparkCanvas.height = sparkCanvas.clientHeight * DPR;
  ctx.setTransform(DPR,0,0,DPR,0,0);
  ctx.clearRect(0,0,sparkCanvas.clientWidth,sparkCanvas.clientHeight);

  const now = new Date();
  const months = [];
  for(let i=11;i>=0;i--){ const d=new Date(now.getFullYear(), now.getMonth()-i,1); months.push({key:d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'), label:d.toLocaleString(undefined,{month:'short', year:'numeric'})}); }
  const balances = months.map(m => { let inc=0, exp=0; history.forEach(h => { if(monthKey(h.date)===m.key){ if(h.type==='income') inc+=Number(h.amount); else exp+=Number(h.amount); }}); return inc-exp; });

  const w = sparkCanvas.clientWidth, h = sparkCanvas.clientHeight, pad = 10;
  const min = Math.min(...balances,0), max = Math.max(...balances,0), range = (max-min) || 1;
  const zeroY = pad + (1 - (0-min)/range) * (h - pad*2);

  ctx.strokeStyle = '#eef2f6'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0,zeroY); ctx.lineTo(w,zeroY); ctx.stroke();

  ctx.beginPath();
  balances.forEach((b,i)=>{ const x=pad+(i/(balances.length-1))*(w-pad*2); const y=pad+(1-(b-min)/range)*(h-pad*2); if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y); });
  ctx.strokeStyle='#2E7D32'; ctx.lineWidth=2; ctx.stroke();

  balances.forEach((b,i)=>{ const x=pad+(i/(balances.length-1))*(w-pad*2); const y=pad+(1-(b-min)/range)*(h-pad*2); ctx.beginPath(); ctx.arc(x,y,3,0,Math.PI*2); ctx.fillStyle='#fff'; ctx.fill(); ctx.strokeStyle='#2E7D32'; ctx.stroke(); });

  sparkCanvas.onmousemove = (e)=>{ const rect=sparkCanvas.getBoundingClientRect(); const x=e.clientX-rect.left; let nearest=0, best=Infinity; months.forEach((m,i)=>{ const px=pad+(i/(months.length-1))*(rect.width-pad*2); const d=Math.abs(px-x); if(d<best){best=d;nearest=i;} }); sparkInfo.textContent = `${months[nearest].label}: ${fmt(balances[nearest])}`; };
  sparkCanvas.onmouseleave = ()=> { sparkInfo.textContent = 'Hover the line to see values'; };
}

/* ============================
   Calendar rendering & interactions
   ============================ */
let calDate = new Date();
let selectedDateKey = null;

function startOfMonth(d){ return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d){ return new Date(d.getFullYear(), d.getMonth()+1, 0); }

function renderCalendar(){
  calEl.innerHTML = '';
  const first = startOfMonth(calDate), last = endOfMonth(calDate);
  calMonthEl.textContent = first.toLocaleString(undefined,{month:'long', year:'numeric'});
  const startDow = first.getDay(); const days = last.getDate();
  const totalCells = startDow + days;
  for(let i=0;i<totalCells;i++){
    if(i < startDow){ const e=document.createElement('div'); e.className='calendar-cell'; e.style.opacity=.4; calEl.appendChild(e); continue; }
    const dayNum = i - startDow + 1;
    const d = new Date(first.getFullYear(), first.getMonth(), dayNum);
    const key = dateKey(d.toISOString());
    let inc=0, exp=0;
    history.forEach(h => { if(dateKey(h.date) === key){ if(h.type==='income') inc+=Number(h.amount); else exp+=Number(h.amount); }});
    const cell = document.createElement('div'); cell.className='calendar-cell';
    if(dateKey(new Date().toISOString()) === key) cell.classList.add('today');
    if(selectedDateKey === key) cell.classList.add('selected');
    const top = document.createElement('div'); top.className='date'; top.textContent = dayNum;
    const mid = document.createElement('div'); mid.innerHTML = `<div class="small" style="color:var(--primary)">${inc?fmt(inc):''}</div><div class="small" style="color:var(--danger)">${exp?fmt(exp):''}</div>`;
    const bot = document.createElement('div'); bot.className='small'; bot.textContent = inc||exp ? `${inc? 'Income' : ''}${inc&&exp? ' • ' : ''}${exp? 'Expense' : ''}` : '';
    cell.appendChild(top); cell.appendChild(mid); cell.appendChild(bot);
    cell.onclick = ()=> {
      selectedDateKey = key === selectedDateKey ? null : key;
      currentFilter = selectedDateKey ? { type:'date', value:selectedDateKey } : null;
      renderAll(); // re-render calendar + recent
    };
    calEl.appendChild(cell);
  }
}

calPrev.addEventListener('click', ()=> { calDate.setMonth(calDate.getMonth()-1); renderCalendar(); });
calNext.addEventListener('click', ()=> { calDate.setMonth(calDate.getMonth()+1); renderCalendar(); });
calToday.addEventListener('click', ()=> { calDate = new Date(); renderCalendar(); });

/* ============================
   Core actions: add, export, reset
   ============================ */
addBtn.addEventListener('click', ()=> {
  const type = typeEl.value; const category = catSelect.value || ''; const source = sourceEl.value.trim(); const amt = parseFloat(amountEl.value);
  if(!amt || isNaN(amt) || amt <= 0){ alert('Enter amount > 0'); amountEl.focus(); return; }
  const tx = { type, category, source, amount:Number(amt), date:new Date().toISOString() };
  history.push(tx); saveAll(); renderAll(); sourceEl.value=''; amountEl.value='';
});

function exportCSV(){
  if(history.length===0){ alert('No data to export'); return; }
  const rows=[['type','category','source','amount','date']]; history.forEach(h=>rows.push([h.type,h.category,h.source.replace(/"/g,'""'),h.amount,h.date]));
  const csv = rows.map(r=>r.map(c=>`"${c}"`).join(',')).join('\n'); const blob = new Blob([csv],{type:'text/csv'}); const url=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download='transactions.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}
exportBtn.addEventListener('click', exportCSV); if(exportBtn2) exportBtn2.addEventListener('click', exportCSV);

resetDataBtn.addEventListener('click', ()=>{ if(!confirm('Clear all transactions?')) return; history=[]; saveAll(); renderAll(); });

addCatBtn.addEventListener('click', ()=> { const t=newType.value; const name=newName.value.trim(); if(!name){ alert('Enter category'); newName.focus(); return; } if(categories[t].some(c=>c.toLowerCase()===name.toLowerCase())){ alert('Category exists'); return; } categories[t].push(name); saveAll(); newName.