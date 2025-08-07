// ======= Storage & State =======
let history = [];
let categories = ["Salary", "Food", "Transport", "Shopping"];
let entryType = "income"; // default tab

if (localStorage.getItem('history')) history = JSON.parse(localStorage.getItem('history'));
if (localStorage.getItem('categories')) categories = JSON.parse(localStorage.getItem('categories'));

function saveAll() { localStorage.setItem('history', JSON.stringify(history)); }
function saveCategories() { localStorage.setItem('categories', JSON.stringify(categories)); }

// ======= UI Rendering =======
function renderCategories() {
  const select = document.getElementById('modal-category');
  select.innerHTML = '';
  categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    select.appendChild(opt);
  });
}

function renderAll() {
  // Totals
  let totalIncome = 0;
  let totalExpense = 0;
  history.forEach(entry => {
    if (entry.type === 'income') totalIncome += entry.amount;
    else totalExpense += entry.amount;
  });
  document.getElementById('total-income').textContent = `₱${totalIncome.toFixed(2)}`;
  document.getElementById('total-expense').textContent = `₱${totalExpense.toFixed(2)}`;
  document.getElementById('balance').textContent = `₱${(totalIncome - totalExpense).toFixed(2)}`;

  // History
  const entryList = document.getElementById('entry-list');
  entryList.innerHTML = '';
  history.slice().reverse().forEach((entry, idx) => {
    const li = document.createElement('li');
    li.innerHTML =
      `${entry.type === 'income' ? '+' : '-'} ₱${entry.amount} | ${entry.category} | ${entry.source || ''} | ${new Date(entry.date).toLocaleDateString()} 
      <button class="edit-btn" data-idx="${history.length - 1 - idx}">Edit</button>
      <button class="del-btn" data-idx="${history.length - 1 - idx}">Delete</button>`;
    entryList.appendChild(li);
  });
}

// ======= Calculator Logic =======
const calcBtnLayout = [
  ['7','8','9','/'],
  ['4','5','6','*'],
  ['1','2','3','-'],
  ['0','.','=','+'],
  ['C']
];
function renderCalculatorButtons() {
  const calculatorButtons = document.getElementById('calculator-buttons');
  calculatorButtons.innerHTML = '';
  calcBtnLayout.forEach(row => {
    const div = document.createElement('div');
    row.forEach(btn => {
      const b = document.createElement('button');
      b.type = "button";
      b.textContent = btn;
      b.className = "calc-btn";
      b.onclick = () => calcBtnPress(btn);
      div.appendChild(b);
    });
    calculatorButtons.appendChild(div);
  });
}

let calcValue = "";
function calcBtnPress(btn) {
  const calculatorDisplay = document.getElementById('calculator-display');
  if (btn === 'C') {
    calcValue = '';
    calculatorDisplay.value = '';
  } else if (btn === '=') {
    try {
      calcValue = eval(calcValue.replace(/[^-()\d/*+.]/g, '')) + '';
      calculatorDisplay.value = calcValue;
    } catch {
      calculatorDisplay.value = "Error";
      calcValue = '';
    }
  } else {
    calcValue += btn;
    calculatorDisplay.value = calcValue;
  }
}

// ======= Modal Logic =======
document.addEventListener('DOMContentLoaded', function() {
  renderCategories();
  renderCalculatorButtons();
  renderAll();

  // Show modal
  document.getElementById('floating-btn').onclick = () => {
    document.getElementById('calculator-modal').style.display = 'flex';
    document.getElementById('calculator-form').reset();
    document.getElementById('modal-date').value = new Date().toISOString().slice(0,10);
    document.getElementById('calculator-display').value = calcValue = '';
    entryType = "income";
    document.getElementById('income-tab').classList.add('active');
    document.getElementById('expense-tab').classList.remove('active');
    document.getElementById('calculator-form').setAttribute('data-edit-idx', "");
  };

  // Hide modal
  document.getElementById('close-modal').onclick = () => {
    document.getElementById('calculator-modal').style.display = 'none';
  };
  document.getElementById('calculator-modal').onclick = function(e) {
    if (e.target === this) this.style.display = 'none';
  };

  // Tabs for income/expense
  document.getElementById('income-tab').onclick = () => {
    entryType = "income";
    document.getElementById('income-tab').classList.add('active');
    document.getElementById('expense-tab').classList.remove('active');
  };
  document.getElementById('expense-tab').onclick = () => {
    entryType = "expense";
    document.getElementById('expense-tab').classList.add('active');
    document.getElementById('income-tab').classList.remove('active');
  };

  // Add new category
  document.getElementById('add-category-btn').onclick = () => {
    const newCat = document.getElementById('new-category').value.trim();
    if (newCat && !categories.includes(newCat)) {
      categories.push(newCat);
      saveCategories();
      renderCategories();
      document.getElementById('modal-category').value = newCat;
      document.getElementById('new-category').value = '';
    }
  };

  // Handle form submit (add/edit entry)
  document.getElementById('calculator-form').onsubmit = function(e) {
    e.preventDefault();
    const category = document.getElementById('modal-category').value.trim();
    const amount = Number(document.getElementById('calculator-display').value);
    const source = document.getElementById('modal-source').value.trim();
    const date = document.getElementById('modal-date').value;
    if (!category || !amount || amount <= 0 || !date) {
      alert("Please enter a valid amount, category, and date.");
      return;
    }
    const editIdx = this.getAttribute('data-edit-idx');
    const entry = { type: entryType, category, source, amount, date: new Date(date).toISOString() };
    if (editIdx && editIdx !== "") {
      history[editIdx] = entry;
      this.setAttribute('data-edit-idx', "");
    } else {
      history.push(entry);
    }
    saveAll();
    renderAll();
    this.reset();
    document.getElementById('calculator-modal').style.display = 'none';
  };

  // Edit/Delete button logic
  document.getElementById('entry-list').onclick = function(e) {
    if (e.target.classList.contains('del-btn')) {
      const idx = Number(e.target.getAttribute('data-idx'));
      if (confirm('Delete this entry?')) {
        history.splice(idx, 1);
        saveAll();
        renderAll();
      }
    } else if (e.target.classList.contains('edit-btn')) {
      const idx = Number(e.target.getAttribute('data-idx'));
      const entry = history[idx];
      document.getElementById('floating-btn').click();
      document.getElementById('income-tab').classList.toggle('active', entry.type === 'income');
      document.getElementById('expense-tab').classList.toggle('active', entry.type === 'expense');
      entryType = entry.type;
      document.getElementById('modal-category').value = entry.category;
      document.getElementById('calculator-display').value = entry.amount;
      calcValue = entry.amount + '';
      document.getElementById('modal-source').value = entry.source;
      document.getElementById('modal-date').value = entry.date.slice(0,10);
      document.getElementById('calculator-form').setAttribute('data-edit-idx', idx);
    }
  };

  // Export CSV
  document.getElementById('export-csv').onclick = function() {
    const csv = "Type,Category,Source,Amount,Date\n" + history.map(e =>
      [e.type, `"${e.category}"`, `"${e.source}"`, e.amount, new Date(e.date).toLocaleDateString()].join(',')
    ).join('\n');
    const blob = new Blob([csv], {type: 'text/csv'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = "income_expense.csv";
    a.click();
  };

  // Export JSON
  document.getElementById('export-json').onclick = function() {
    const blob = new Blob([JSON.stringify(history)], {type: 'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = "income_expense.json";
    a.click();
  };

  // Import Data
  document.getElementById('import-data').onclick = function() {
    document.getElementById('import-file').click();
  };
  document.getElementById('import-file').onchange = function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        let imported = [];
        if (file.name.endsWith('.json')) {
          imported = JSON.parse(e.target.result);
        } else if (file.name.endsWith('.csv')) {
          const lines = e.target.result.split('\n').slice(1);
          imported = lines.map(line => {
            const [type, category, source, amount, date] = line.split(',');
            return {type, category: category.replace(/"/g,''), source: source.replace(/"/g,''), amount: Number(amount), date: new Date(date).toISOString()};
          });
        }
        if (Array.isArray(imported)) {
          history = imported;
          saveAll();
          renderAll();
          alert("Imported successfully!");
        }
      } catch (err) {
        alert("Import failed.");
      }
    };
    reader.readAsText(file);
  };
});