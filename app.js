// Keys for saving data in browser's localStorage
const TOTAL_KEY = "income_total_v1";   // Total amount saved
const HISTORY_KEY = "income_history_v1"; // History list saved

// Load data from localStorage (or set defaults if empty)
let total = parseFloat(localStorage.getItem(TOTAL_KEY)) || 0;
let history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");

// Get elements from HTML so we can change them
const totalEl = document.getElementById("total");
const historyEl = document.getElementById("history");
const addBtn = document.getElementById("addBtn");
const exportBtn = document.getElementById("exportBtn");
const clearBtn = document.getElementById("clearBtn");

// Format number into currency (₱ 0.00)
function formatCurrency(n){
  return "₱" + Number(n).toLocaleString(undefined, {
    minimumFractionDigits:2, maximumFractionDigits:2
  });
}

// Save current total & history to localStorage
function save(){
  localStorage.setItem(TOTAL_KEY, total);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

// Display the updated total and list on screen
function render(){
  totalEl.textContent = formatCurrency(total); // Update total text
  historyEl.innerHTML = ""; // Clear current list

  // If no history yet, show placeholder text
  if(history.length === 0){
    historyEl.innerHTML = "<li style='color:#6b7280;padding:8px'>No entries yet</li>";
    return;
  }

  // Show latest entries first (reverse order)
  history.slice().reverse().forEach((it, idx) => {
    // Create list item
    const li = document.createElement("li");
    li.className = "entry";

    // Left side: source & date
    const left = document.createElement("div");
    left.className = "left";
    const src = document.createElement("div");
    src.className = "src";
    src.textContent = it.source || "Income";
    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = it.date;
    left.appendChild(src);
    left.appendChild(meta);

    // Right side: amount & delete button
    const right = document.createElement("div");
    right.style.display = "flex";
    right.style.alignItems = "center";
    right.style.gap = "8px";

    const amount = document.createElement("div");
    amount.className = "amount";
    amount.textContent = formatCurrency(it.amount);

    const del = document.createElement("button");
    del.textContent = "Delete";
    del.onclick = () => {
      // Find the real index (because we reversed the list)
      const realIndex = history.length - 1 - idx;
      // Subtract amount from total
      total -= history[realIndex].amount;
      // Remove from history
      history.splice(realIndex,1);
      // Save changes
      save();
      // Update screen
      render();
    };

    // Add elements together
    right.appendChild(amount);
    right.appendChild(del);
    li.appendChild(left);
    li.appendChild(right);
    historyEl.appendChild(li);
  });
}

// Add new income when "Add Income" is clicked
addBtn.addEventListener("click", () => {
  const srcInput = document.getElementById("source");
  const amtInput = document.getElementById("amount");
  const source = srcInput.value.trim();
  const amt = parseFloat(amtInput.value);

  // Check if amount is valid
  if(!amt || amt <= 0) {
    amtInput.focus();
    return;
  }

  // Create new entry object
  const entry = {
    source: source || "Income", 
    amount: amt, 
    date: new Date().toLocaleString()
  };

  // Add to history & update total
  history.push(entry);
  total += amt;

  // Save and update UI
  save();
  render();

  // Clear input fields
  srcInput.value = "";
  amtInput.value = "";
});

// Export history as CSV file
exportBtn.addEventListener("click", () => {
  if(history.length === 0) return alert("No data to export");

  // Prepare CSV rows
  const rows = [["source","amount","date"]];
  history.forEach(r => rows.push([r.source.replace(/"/g,'""'), r.amount, r.date]));

  // Convert array to CSV text
  const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");

  // Create file & trigger download
  const blob = new Blob([csv], {type:"text/csv"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "income_history.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

// Clear all data
clearBtn.addEventListener("click", () => {
  if(!confirm("Clear all data? This cannot be undone.")) return;
  history = [];
  total = 0;
  save();
  render();
});

// Show data on page load
render();