/* ============================
   Aesthetic Income & Expense Tracker
   - Calculator integrated inside Add Entry modal
   - Add/Edit/Delete entries
   - Categories with add
   - Export JSON (simple)
   - Storage in localStorage
   ============================ */

/* ========== Storage keys & defaults ========== */
const STORAGE = {
  ENTRIES: 'aesthetic_ie_entries_v1',
  CATEGORIES: 'aesthetic_ie_categories_v1'
};

const defaultCategories = {
  income: ['Salary', 'Freelance', 'Gift'],
  expense: ['Food', 'Transport', 'Bills', 'Shopping', 'Other']
};

// load or initialize data
let entries = JSON.parse(localStorage.getItem(STORAGE.ENTRIES)) || [];
let categories = JSON.parse(localStorage.getItem(STORAGE.CATEGORIES)) || defaultCategories;

/* ========== DOM refs ========== */
const floatingBtn = document.getElementById('floating-btn');
const entryModal = document.getElementById('entry-modal');
const closeEntryModal = document.getElementById('close-entry-modal');
const tabs = document.querySelectorAll('.tab');
const calcDisplay = document.getElementById('calculator-display');
const calcButtonsContainer = document.getElementById('calculator-buttons');
const useAmountBtn = document.getElementById('use-amount');
const clearCalcBtn = document.getElementById('clear-calc');

const entryForm = document.getElementById('entry-form');
const entryCategory = document.getElementById('entry-category');
const newCategoryInput = document.getElementById('new-category');
const addCategoryBtn = document.getElementById('add-category-btn');
const entrySource = document.getElementById('entry-source');
const entryDate = document.getElementById('entry-date');
const editIndexInput = document.getElementById('edit-index');

const entryList = document.getElementById('entry-list');
const totalIncomeEl = document.getElementById('total-income');
const totalExpenseEl = document.getElementById('total-expense');
const balanceEl = document.getElementById('balance');

const navExport = document.getElementById('nav-export');
const cancelEntryBtn = document.getElementById('cancel-entry-btn');

/* ========== UI state ========== */
let currentType = 'income';      // 'income' or 'expense'
let calcExpression = '';         // string expression shown on calculator
let memoryValue = 0;             // memory storage for calculator

/* ===== Utility helpers ===== */
function saveAll() {
  localStorage.setItem(STORAGE.ENTRIES, JSON.stringify(entries));
  localStorage.setItem(STORAGE.CATEGORIES, JSON.stringify(categories));
}
function fmt(num) {
  return '₱' + Number(num || 0).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});
}
function todayISO() { return new Date().toISOString().slice(0,10); }

/* ===== Render categories based on currentType ===== */
function renderCategoryOptions() {
  const list = categories[currentType] || [];
  entryCategory.innerHTML = '';
  list.forEach(c => {
    const o = document.createElement('option');
    o.value = c; o.textContent = c;
    entryCategory.appendChild(o);
  });
}

/* ===== Totals & history ===== */
function renderTotals() {
  let inc = 0, exp = 0;
  entries.forEach(e => { if (e.type === 'income') inc += Number(e.amount); else exp += Number(e.amount); });
  totalIncomeEl.textContent = fmt(inc);
  totalExpenseEl.textContent = fmt(exp);
  balanceEl.textContent = fmt(inc - exp);
}

function renderHistory() {
  entryList.innerHTML = '';
  for (let i = entries.length - 1; i >= 0; i--) {
    const e = entries[i];
    const li = document.createElement('li');

    const meta = document.createElement('div');
    meta.className = 'meta';
    const title = document.createElement('strong'); title.textContent = e.category;
    const sub = document.createElement('div'); sub.className = 'sub';
    sub.textContent = `${e.source || ''} • ${new Date(e.date).toLocaleDateString()}`;
    meta.appendChild(title); meta.appendChild(sub);

    const right = document.createElement('div'); right.style.display='flex'; right.style.alignItems='center'; right.style.gap='8px';
    const amt = document.createElement('div'); amt.style.fontWeight='800'; amt.style.color = e.type === 'income' ? '#1a9f6b' : '#e04e4e';
    amt.textContent = (e.type === 'income' ? '+ ' : '- ') + fmt(e.amount).slice(1);

    // Edit
    const edit = document.createElement('button'); edit.className='edit-btn'; edit.textContent='Edit';
    edit.addEventListener('click', ()=> openEditEntry(i));

    // Delete
    const del = document.createElement('button'); del.className='del-btn'; del.textContent='Delete';
    del.addEventListener('click', ()=> {
      if (!confirm('Delete this entry?')) return;
      entries.splice(i,1); saveAll(); renderTotals(); renderHistory();
    });

    right.appendChild(amt); right.appendChild(edit); right.appendChild(del);
    li.appendChild(meta); li.appendChild(right);
    entryList.appendChild(li);
  }
}

/* ===== Calculator safe eval ===== */
function sanitizeExpression(expr) {
  // convert ×/÷ to JS, remove invalid chars
  let s = expr.replace(/×/g, '*').replace(/÷/g, '/');
  s = s.replace(/[^0-9+\-*/().]/g, '');
  return s;
}
function safeEval(expr) {
  try {
    const val = Function('"use strict";return (' + sanitizeExpression(expr) + ')')();
    return Number(val);
  } catch {
    return NaN;
  }
}

/* ===== Calculator input handling ===== */
function updateCalcDisplay() {
  calcDisplay.value = calcExpression === '' ? '0' : calcExpression;
}

function appendToCalc(token) {
  // numbers
  if (/^\d$/.test(token)) { calcExpression += token; updateCalcDisplay(); return; }

  // dot
  if (token === '.') {
    const lastNum = (calcExpression.match(/(\d+(\.\d+)?)$/) || [])[0];
    if (!lastNum) calcExpression += '0.';
    else if (lastNum.indexOf('.') === -1) calcExpression += '.';
    updateCalcDisplay(); return;
  }

  // DEL (backspace)
  if (token === 'DEL') { calcExpression = calcExpression.slice(0,-1); updateCalcDisplay(); return; }

  // AC clear
  if (token === 'AC') { calcExpression = ''; updateCalcDisplay(); return; }

  // operators
  if (['+','-','×','÷'].includes(token)) {
    if (calcExpression === '') {
      // if empty, allow negative sign
      if (token === '-') { calcExpression = '-'; }
    } else {
      // replace last operator if present
      if (/[+\-×÷]$/.test(calcExpression)) calcExpression = calcExpression.slice(0,-1) + token;
      else calcExpression += token;
    }
    updateCalcDisplay(); return;
  }

  // percent: convert last number to percent (x% => x/100)
  if (token === '%') {
    const m = calcExpression.match(/(\d+(\.\d+)?)$/);
    if (m) {
      const v = Number(m[0]) / 100;
      calcExpression = calcExpression.replace(/(\d+(\.\d+)?)$/, v.toString());
    } else {
      const whole = safeEval(calcExpression);
      if (!isNaN(whole)) calcExpression = String(whole/100);
    }
    updateCalcDisplay(); return;
  }

  // equals
  if (token === '=') {
    const r = safeEval(calcExpression);
    calcExpression = isFinite(r) ? String(r) : 'Error';
    updateCalcDisplay(); return;
  }

  // memory functions
  if (token === 'MC') { memoryValue = 0; return; }
  if (token === 'MR') { calcExpression = String(memoryValue); updateCalcDisplay(); return; }
  if (token === 'M+') { const v = safeEval(calcExpression); if (!isNaN(v)) memoryValue = Number(memoryValue) + Number(v); return; }
  if (token === 'M-') { const v = safeEval(calcExpression); if (!isNaN(v)) memoryValue = Number(memoryValue) - Number(v); return; }
}

/* Build calculator buttons (aesthetic layout) */
const calcLayout = [
  ['MC','MR','M+','M-'],
  ['AC','%','÷','×'],
  ['7','8','9','-'],
  ['4','5','6','+'],
  ['1','2','3','='],
  ['0','.','DEL',''] // blank cell for grid
];
function buildCalculator() {
  calcButtonsContainer.innerHTML = '';
  calcLayout.forEach(row => {
    row.forEach(token => {
      const cell = document.createElement('button');
      if (!token) { const spacer = document.createElement('div'); calcButtonsContainer.appendChild(spacer); return; }
      cell.type = 'button';
      cell.textContent = token;
      // classes
      if (['+','-','×','÷'].includes(token)) cell.classList.add('operator');
      if (token === '=') cell.classList.add('equal');
      if (['MC','MR','M+','M-'].includes(token)) cell.classList.add('memory');
      cell.addEventListener('click', ()=> appendToCalc(token));
      calcButtonsContainer.appendChild(cell);
    });
  });
}

/* Use calculated amount into the form amount (we use calcExpression as numeric)
   We don't have a separate amount input — calculator is the source of truth.
*/
function useCalculatedAmount() {
  const val = safeEval(calcExpression);
  if (!isFinite(val) || val <= 0) { alert('Enter a valid amount with calculator'); return; }
  // The form will read calcExpression when saving; ensure value is a clean numeric string
  calcExpression = String(Number(val.toFixed(2)));
  updateCalcDisplay();
  // focus next input (category)
  entryCategory.focus();
}

/* ===== Entry create / edit ===== */
function openNewEntry() {
  calcExpression = '';
  updateCalcDisplay();
  editIndexInput.value = '';
  currentType = 'income';
  tabs.forEach(t=> t.classList.toggle('active', t.dataset.type === currentType));
  renderCategoryOptions();
  entryForm.reset();
  entryDate.value = todayISO();
  entryModal.setAttribute('aria-hidden','false'); entryModal.style.display = 'flex';
}

function openEditEntry(idx) {
  const e = entries[idx];
  if (!e) return;
  currentType = e.type;
  tabs.forEach(t=> t.classList.toggle('active', t.dataset.type === currentType));
  renderCategoryOptions();
  // set calculator to amount for editing
  calcExpression = String(e.amount);
  updateCalcDisplay();
  entryCategory.value = e.category;
  entrySource.value = e.source || '';
  entryDate.value = e.date.slice(0,10);
  editIndexInput.value = idx;
  entryModal.setAttribute('aria-hidden','false'); entryModal.style.display = 'flex';
}

function saveEntry(e) {
  e.preventDefault();
  const amt = safeEval(calcExpression);
  if (!isFinite(amt) || amt <= 0) { alert('Please enter a valid amount using the calculator.'); return; }
  const category = entryCategory.value || '';
  if (!category) { alert('Select or add a category'); return; }
  const source = entrySource.value.trim();
  const dateVal = entryDate.value || todayISO();
  const obj = { type: currentType, category, source, amount: Number( Number(amt).toFixed(2) ), date: new Date(dateVal).toISOString() };

  const editIdx = editIndexInput.value;
  if (editIdx !== '') entries[Number(editIdx)] = obj;
  else entries.push(obj);

  saveAll(); renderTotals(); renderHistory();
  closeEntryModalFunc();
}

/* close modal helper */
function closeEntryModalFunc() {
  entryModal.style.display = 'none'; entryModal.setAttribute('aria-hidden','true');
}

/* ===== Add category ===== */
addCategoryBtn.addEventListener('click', ()=> {
  const name = newCategoryInput.value.trim();
  if (!name) return alert('Type a category name');
  const arr = categories[currentType] || [];
  if (arr.some(c => c.toLowerCase() === name.toLowerCase())) { newCategoryInput.value = ''; return alert('Category exists'); }
  arr.push(name);
  categories[currentType] = arr;
  saveAll(); renderCategoryOptions();
  newCategoryInput.value = '';
});

/* ===== Export JSON (simple) ===== */
navExport.addEventListener('click', ()=> {
  const blob = new Blob([JSON.stringify(entries, null, 2)], {type:'application/json'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'entries-export.json'; document.body.appendChild(a); a.click(); a.remove();
});

/* ===== Event wiring ===== */
floatingBtn.addEventListener('click', openNewEntry);
closeEntryModal.addEventListener('click', closeEntryModalFunc);
cancelEntryBtn.addEventListener('click', closeEntryModalFunc);
entryModal.addEventListener('click', (ev)=> { if (ev.target === entryModal) closeEntryModalFunc(); });

tabs.forEach(t => t.addEventListener('click', ()=> {
  currentType = t.dataset.type;
  tabs.forEach(x => x.classList.toggle('active', x === t));
  renderCategoryOptions();
}));

useAmountBtn.addEventListener('click', useCalculatedAmount);
clearCalcBtn.addEventListener('click', ()=> { calcExpression = ''; updateCalcDisplay(); });

entryForm.addEventListener('submit', saveEntry);

/* ===== Initialize UI on load ===== */
function init() {
  buildCalculator();
  renderCategoryOptions();
  renderTotals();
  renderHistory();
  updateCalcDisplay();
  entryDate.value = todayISO();
  // small accessibility: focus floating button
  floatingBtn.focus();
}
document.addEventListener('DOMContentLoaded', init);