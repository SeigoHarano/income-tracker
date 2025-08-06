/* ============================
   STORAGE KEYS & DEFAULTS
   ============================ */
const KEYS = {
  HISTORY: 'iet_history_v3',
  CATEGORIES: 'iet_categories_v3'
};

// Load existing data or initialize defaults
let history = JSON.parse(localStorage.getItem(KEYS.HISTORY) || '[]');
let categories = JSON.parse(localStorage.getItem(KEYS.CATEGORIES) || 'null');
if(!categories){
  categories = {
    income: ['Salary','Freelance','Other'],
    expense: ['Food','Transport','Bills','Shopping','Other']
  };
  localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(categories));
}

/* ============================
   ELEMENT REFERENCES
   ============================ */
const sidebar = document.getElementById('sidebar');
const openSidebar = document.getElementById('openSidebar');
const drag = document.getElementById('drag');

const navBtns = document.querySelectorAll('.nav-btn');
const views = document.querySelectorAll('.view');

const typeEl = document.getElementById('type');
const catSelect = document.getElementById('category');
const srcEl = document.getElementById('source');
const amtEl = document.getElementById('amount');
const addBtn = document.getElementById('addBtn');
const recentEl = document.getElementById('recent');

const dashIncome = document.getElementById('dash-income');
const dashExpense = document.getElementById('dash-expense');
const dashBalance = document.getElementById('dash-balance');
const trendEl = document.getElementById('trend');
const miniBalance = document.getElementById('mini-balance');

const pieCanvas = document.getElementById('pie');
const pieLegend = document.getElementById('pie-legend');
const pieInfo = document.getElementById('pie-info');
const pieTf = document.getElementById('pie-timeframe');

const sparkCanvas = document.getElementById('spark');
const sparkInfo = document.getElementById('spark-info');

const newType = document.getElementById('newType');
const newName = document.getElementById('newName');
const addCatBtn = document.getElementById('addCatBtn');
const catContainer = document.getElementById('catContainer');

const exportBtn1 = document.getElementById('exportBtn');
const exportBtn3 = document.getElementById('exportBtn3');
const resetDataBtn = document.getElementById('resetDataBtn');

/* Calendar elements */
const calendarEl = document.getElementById('calendar');
const calendarMonthEl = document.getElementById('calendar-month');
const prevMonthBtn = document.getElementById('prevMonth');
const nextMonthBtn = document.getElementById('nextMonth');
const todayBtn = document.getElementById('todayBtn');

/* ============================
   UTILITIES
   ============================ */
function saveAll(){ localStorage.setItem(KEYS.HISTORY, JSON.stringify(history)); localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(categories)); }
function fmt(n){ return '₱' + Number(n).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2}); }
function monthKey(dateISO){ const d = new Date(dateISO); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0'); }
function dateKey(dateISO){ const d = new Date(dateISO); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); }

/* ============================
   NAVIGATION
   ============================ */
function showView(name){
  views.forEach(v => v.id === 'view-'+name ? v.classList.remove('hidden') : v.classList.add('hidden'));
  navBtns.forEach(b => b.dataset.view === name ? b.classList.add('active') : b.classList.remove('active'));
  if(window.innerWidth <= 900) sidebar.classList.remove('open');
}
navBtns.forEach(b => b.addEventListener('click', ()=> showView(b.dataset.view)));

/* ============================
   CATEGORIES: populate and UI
   ============================ */
function populateCategorySelect(){
  const t = typeEl.value; catSelect.innerHTML = '';
  const list = categories[t] || [];
  if(list.length === 0){ const opt = document.createElement('option'); opt.value=''; opt.textContent='(no categories)'; catSelect.appendChild(opt); return; }
  list.forEach(c => { const opt = document.createElement('option'); opt.value = c; opt.textContent = c; catSelect.appendChild(opt); });
}
typeEl.addEventListener('change', populateCategorySelect);

function renderCategoriesUI(){
  catContainer.innerHTML = '';
  ['income','expense'].forEach(t => {
    const header = document.createElement('div'); header.style.fontWeight='700'; header.textContent = t.toUpperCase();
    catContainer.appendChild(header);
    categories[t].forEach((c,i) => {
      const row = document.createElement('div'); row.style.display='flex'; row.style.justifyContent='space-between'; row.style.alignItems='center';
      row.style.padding='8px'; row.style.borderRadius='8px'; row.style.background='#fff'; row.style.marginTop='6px'; row.style.border='1px solid #f0f2f6';
      const left = document.createElement('div'); left.textContent = c;
      const del = document.createElement('button'); del.className='btn ghost'; del.textContent='Delete';
      del.onclick = ()=> { if(!confirm('Delete category "'+c+'"? Existing transactions will keep the category text.')) return; categories[t].splice(i,1); saveAll(); renderAll(); };
      row.appendChild(left); row.appendChild(del); catContainer.appendChild(row);
    });
  });
}

/* ============================
   HISTORY & RECENT (with optional filter)
   ============================ */
let currentFilter = null; // {type:'category'|'date', value:...} or null

function renderRecent(){
  recentEl.innerHTML = '';
  // apply filter: if currentFilter set, filter history accordingly
  let list = history.slice();
  if(currentFilter){
    if(currentFilter.type === 'date'){
      list = list.filter(h => dateKey(h.date) === currentFilter.value);
    } else if(currentFilter.type === 'category'){
      list = list.filter(h => h.type === 'expense' && h.category === currentFilter.value);
    } else if(currentFilter.type === 'category-tf'){ // category + timeframe
      const { cat, tf } = currentFilter.value; // tf: today|month|year|all
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

  const recent = list.slice().reverse().slice(0,12); // show up to 12 items after filter
  if(recent.length === 0){ recentEl.innerHTML = '<div style="color:var(--muted);padding:8px">No transactions found.</div>'; return; }
  recent.forEach(h => {
    const el = document.createElement('div'); el.className='entry';
    const left = document.createElement('div'); left.style.display='flex'; left.style.flexDirection='column';
    const title = document.createElement('div'); title.style.fontWeight='700'; title.textContent = (h.source || h.category || h.type);
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
   DASHBOARD calculations
   ============================ */
function renderDashboard(){
  const now = new Date(); const nowKey = monthKey(now.toISOString());
  const prev = new Date(); prev.setMonth(prev.getMonth()-1); const prevKey = monthKey(prev.toISOString());

  let incomeNow=0, expenseNow=0, incomePrev=0, expensePrev=0;
  history.forEach(h => {
    const k = monthKey(h.date);
    if(k === nowKey){ if(h.type==='income') incomeNow += Number(h.amount); else expenseNow += Number(h.amount); }
    else if(k === prevKey){ if(h.type==='income') incomePrev += Number(h.amount); else expensePrev += Number(h.amount); }
  });

  const balNow = incomeNow - expenseNow;
  const balPrev = incomePrev - expensePrev;
  dashIncome.textContent = fmt(incomeNow);
  dashExpense.textContent = fmt(expenseNow);
  dashBalance.textContent = fmt(balNow);
  miniBalance.textContent = fmt(balNow);

  const diff = balNow - balPrev;
  if(balPrev === 0 && balNow === 0) trendEl.textContent = 'Trend: —';
  else if(diff >= 0) trendEl.innerHTML = `Trend: <span style="color:#16a34a">▲ ${fmt(Math.abs(diff))}</span>`;
  else trendEl.innerHTML = `Trend: <span style="color:#dc2626">▼ ${fmt(Math.abs(diff))}</span>`;

  // prepare pie data: totals per expense category for current month
  const totals = {}; categories.expense.forEach(c => totals[c]=0);
  history.forEach(h => { if(h.type==='expense' && monthKey(h.date) === nowKey){ totals[h.category] = (totals[h.category] || 0) + Number(h.amount); }});
  const entries = Object.entries(totals).filter(([k,v]) => v > 0);
  drawPie(entries); renderPieLegend(entries);
  drawSparkline();
}

/* ============================
   PIE CHART (interactive):
   - hover shows label on center
   - click filters recent view by category + timeframe
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
    ctx.fillStyle = '#f3f4f6'; ctx.font = '14px sans-serif'; ctx.textAlign='center';
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
    const angle = (val/total) * (Math.PI * 2);
    const end = start + angle;
    const color = palette[i % palette.length];
    // draw slice
    ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,r,start,end); ctx.closePath();
    ctx.fillStyle = color; ctx.fill();
    slices.push({start,end,cat,val,color,index:i});
    start = end;
  });

  // hover handling
  pieCanvas.onmousemove = (e) => {
    const rect = pieCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const dx = x - cx, dy = y - cy, dist = Math.sqrt(dx*dx + dy*dy), angle = Math.atan2(dy,dx);
    let found = null;
    if(dist <= r){
      let a = angle; if(a < -Math.PI/2) a += Math.PI*2;
      for(const s of slices) if(a >= s.start && a <= s.end){ found = s; break; }
    }
    // redraw: highlight hovered slice
    ctx.clearRect(0,0,w,h);
    slices.forEach(s => {
      const isHover = found && found.index === s.index;
      const rr = isHover ? r * 1.06 : r;
      ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,rr,s.start,s.end); ctx.closePath();
      ctx.fillStyle = s.color; ctx.fill();
      if(isHover){
        ctx.fillStyle = '#111827'; ctx.font = '600 14px sans-serif'; ctx.textAlign='center';
        ctx.fillText(`${s.cat} — ${fmt(s.val)}`, cx, cy + 4);
      }
    });
    pieInfo.textContent = found ? `Hovering: ${found.cat} — ${fmt(found.val)}` : 'Hover to highlight a slice';
  };

  // click: filter recent by category + timeframe (pieTf)
  pieCanvas.onclick = (e) => {
    const rect = pieCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const dx = x - cx, dy = y - cy, dist = Math.sqrt(dx*dx + dy*dy);
    if(dist > r) return;
    const angle = Math.atan2(dy,dx);
    let a = angle; if(a < -Math.PI/2) a += Math.PI*2;
    let clicked = null;
    for(const s of slices) if(a >= s.start && a <= s.end){ clicked = s; break; }
    if(!clicked) return;
    // set filter to category + timeframe (today/month/year/all)
    const tf = pieTf.value;
    currentFilter = { type:'category-tf', value: { cat: clicked.cat, tf } };
    // switch to home view and render
    showView('home');
    renderAll();
    pieInfo.textContent = `${clicked.cat} — filtered (${tf})`;
  };
}

/* ============================
   PIE LEGEND (clickable)
   ============================ */
function renderPieLegend(entries){
  pieLegend.innerHTML = '';
  const palette = ['#f97316','#fb7185','#facc15','#60a5fa','#34d399','#a78bfa','#f472b6','#7dd3fc','#fca5a5','#c4b5fd'];
  entries.forEach(([cat,val], i) => {
    const el = document.createElement('div'); el.className='pie-legend-item';
    el.innerHTML = `<div class="pie-legend-color" style="background:${palette[i % palette.length]}"></div><div style="font-weight:700">${cat}</div><div style="margin-left:8px;color:var(--muted)">${fmt(val)}</div>`;
    el.onclick = () => {
      // same as slice click: set filter to category for selected timeframe
      currentFilter = { type:'category-tf', value: { cat, tf: pieTf.value } };
      showView('home'); renderAll();
      pieInfo.textContent = `${cat} — filtered (${pieTf.value})`;
    };
    pieLegend.appendChild(el);
  });
}

/* ============================
   SPARKLINE (12 months) with tooltip
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
  for(let i=11;i>=0;i--){
    const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
    months.push({ key: d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0'), label: d.toLocaleString(undefined,{month:'short', year:'numeric'}) });
  }
  const balances = months.map(m => {
    let inc=0, exp=0;
    history.forEach(h => { if(monthKey(h.date) === m.key){ if(h.type==='income') inc += Number(h.amount); else exp += Number(h.amount); }});
    return inc - exp;
  });

  const w = sparkCanvas.clientWidth, h = sparkCanvas.clientHeight, pad = 10;
  const min = Math.min(...balances, 0), max = Math.max(...balances, 0), range = (max - min) || 1;
  // zero line
  const zeroY = pad + (1 - (0 - min)/range) * (h - pad*2);
  ctx.strokeStyle = '#eef2f6'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, zeroY); ctx.lineTo(w, zeroY); ctx.stroke();

  // line
  ctx.beginPath();
  balances.forEach((b,i)=> {
    const x = pad + (i/(balances.length-1)) * (w - pad*2);
    const y = pad + (1 - (b - min)/range) * (h - pad*2);
    if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  });
  ctx.strokeStyle = '#2E7D32'; ctx.lineWidth = 2; ctx.stroke();

  // points
  balances.forEach((b,i)=> {
    const x = pad + (i/(balances.length-1)) * (w - pad*2);
    const y = pad + (1 - (b - min)/range) * (h - pad*2);
    ctx.beginPath(); ctx.arc(x,y,3,0,Math.PI*2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#2E7D32'; ctx.stroke();
  });

  // tooltip behavior: show nearest month and value
  sparkCanvas.onmousemove = (e) => {
    const rect = sparkCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    let nearest = 0; let bestDist = Infinity;
    months.forEach((m,i)=> {
      const px = pad + (i/(months.length-1)) * (rect.width - pad*2);
      const d = Math.abs(px - x);
      if(d < bestDist){ bestDist = d; nearest = i; }
    });
    sparkInfo.textContent = `${months[nearest].label}: ${fmt(balances[nearest])}`;
  };
  sparkCanvas.onmouseleave = ()=> { sparkInfo.textContent = 'Hover the line to see values'; };
}

/* ============================
   CALENDAR: render simple month grid
   - shows small income & expense totals per day
   - clicking a day filters recent to that date
   ============================ */
let calendarDate = new Date(); // month being shown
let selectedDateKey = null;

function startOfMonth(d){ return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d){ return new Date(d.getFullYear(), d.getMonth()+1, 0); }

function renderCalendar(){
  calendarEl.innerHTML = '';
  const first = startOfMonth(calendarDate);
  const last = endOfMonth(calendarDate);
  const monthName = first.toLocaleString(undefined,{month:'long', year:'numeric'});
  calendarMonthEl.textContent = monthName;

  // day of week for first (0 Sun..6 Sat) - we want Mon..Sun? keep Sun..Sat for simplicity
  const startDow = first.getDay();
  // total cells = startDow blanks + days
  const days = last.getDate();
  // show 7x up to 6 rows
  const totalCells = startDow + days;
  for(let i=0;i<totalCells;i++){
    if(i < startDow){
      // empty cell
      const empty = document.createElement('div'); empty.className='calendar-cell'; empty.style.opacity=.4; calendarEl.appendChild(empty); continue;
    }
    const dayNum = i - startDow + 1;
    const cellDate = new Date(first.getFullYear(), first.getMonth(), dayNum);
    const key = dateKey(cellDate.toISOString());

    // compute totals for this day
    let inc = 0, exp = 0;
    history.forEach(h => { if(dateKey(h.date) === key){ if(h.type==='income') inc += Number(h.amount); else exp += Number(h.amount); }});

    const cell = document.createElement('div'); cell.className = 'calendar-cell';
    const isToday = dateKey(new Date().toISOString()) === key;
    if(isToday) cell.classList.add('today');
    if(selectedDateKey === key) cell.classList.add('selected');

    // top: date
    const top = document.createElement('div'); top.className = 'date'; top.textContent = dayNum;
    // middle: small amounts
    const mid = document.createElement('div'); mid.innerHTML = `<div class="small" style="color:var(--primary)">${inc ? fmt(inc) : ''}</div><div class="small" style="color:var(--danger)">${exp ? fmt(exp) : ''}</div>`;
    // bottom: action hint
    const bot = document.createElement('div'); bot.className = 'small'; bot.textContent = inc||exp ? `${inc ? 'Income' : ''}${inc && exp ? ' • ' : ''}${exp ? 'Expense' : ''}` : '';

    cell.appendChild(top); cell.appendChild(mid); cell.appendChild(bot);

    // click -> set calendar filter
    cell.onclick = () => {
      selectedDateKey = key === selectedDateKey ? null : key; // toggle
      if(selectedDateKey) currentFilter = { type:'date', value: selectedDateKey };
      else currentFilter = null;
      showView('home');
      renderAll();
    };

    calendarEl.appendChild(cell);
  }
}

// month navigation
prevMonthBtn.addEventListener('click', ()=> { calendarDate.setMonth(calendarDate.getMonth()-1); renderCalendar(); });
nextMonthBtn.addEventListener('click', ()=> { calendarDate.setMonth(calendarDate.getMonth()+1); renderCalendar(); });
todayBtn.addEventListener('click', ()=> { calendarDate = new Date(); renderCalendar(); });

/* ============================
   CORE ACTIONS: add txn, export, reset
   ============================ */
addBtn.addEven