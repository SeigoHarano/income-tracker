/* ============================
   Storage keys & defaults
   ============================ */
const KEYS = {
  HISTORY: "iet_v4_history",
  CATEGORIES: "iet_v4_categories",
};

let history = JSON.parse(localStorage.getItem(KEYS.HISTORY) || "[]");
let categories = JSON.parse(localStorage.getItem(KEYS.CATEGORIES) || "null");
if (!categories) {
  categories = {
    income: ["Salary", "Freelance", "Other"],
    expense: ["Food", "Transport", "Bills", "Shopping", "Other"],
  };
  localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(categories));
}

/* ============================
   Element refs
   ============================ */
const views = document.querySelectorAll(".view");
const navItems = document.querySelectorAll(".nav-item");

const topBalance = document.getElementById("top-balance");
const topIncome = document.getElementById("top-income");
const topExpense = document.getElementById("top-expense");
const topSub = document.getElementById("top-sub");

const exportBtn = document.getElementById("exportBtn");
const recentEl = document.getElementById("recent");
const filterClearHolder = document.getElementById("filter-clear-holder");

const dashBalance = document.getElementById("dash-balance");
const dashIncome = document.getElementById("dash-income");
const dashExpense = document.getElementById("dash-expense");

const pieCanvas = document.getElementById("pie");
const pieLegend = document.getElementById("pie-legend");
const pieInfo = document.getElementById("pie-info");
const pieTf = document.getElementById("pie-timeframe");

const sparkCanvas = document.getElementById("spark");
const sparkInfo = document.getElementById("spark-info");

const calEl = document.getElementById("calendar");
const calMonthEl = document.getElementById("cal-month");
const calPrev = document.getElementById("cal-prev");
const calNext = document.getElementById("cal-next");
const calToday = document.getElementById("cal-today");

const newType = document.getElementById("newType");
const newName = document.getElementById("newName");
const addCatBtn = document.getElementById("addCatBtn");
const catContainer = document.getElementById("catContainer");

const exportBtn2 = document.getElementById("exportBtn2");
const resetDataBtn = document.getElementById("resetDataBtn");

/* ============================
   Calculator Modal System
   ============================ */

// Get references to all calculator modal elements
const calculatorModal = document.getElementById("calculatorModal");
const openCalculatorBtn = document.getElementById("openCalculatorBtn");
const closeModal = document.getElementById("closeModal");
const incomeTab = document.getElementById("incomeTab");
const expenseTab = document.getElementById("expenseTab");
const calcCategory = document.getElementById("calcCategory");
const calcSource = document.getElementById("calcSource");
const calcAmount = document.getElementById("calcAmount");

// Calculator state variables
let currentCalcType = "income"; // Track if we're adding income or expense
let calcValue = ""; // Store the current number being entered

/* ============================
   Utilities
   ============================ */
function saveAll() {
  localStorage.setItem(KEYS.HISTORY, JSON.stringify(history));
  localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(categories));
}
function fmt(n) {
  return (
    "₱" +
    Number(n).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}
function monthKey(dateISO) {
  const d = new Date(dateISO);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
}
function dateKey(dateISO) {
  const d = new Date(dateISO);
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}

// Add back the renderAll function to render user inputs to the ui
function renderAll() {
  // Render dashboard (top stats, pie, sparkline)
  renderDashboard();

  // Render recent transactions (with filter if any)
  renderRecent();

  // Render calendar (with selected date if any)
  renderCalendar();

  // Render categories management UI
  renderCategoriesUI();
}

/* ============================
   Navigation (bottom nav)
   ============================ */
function showView(name) {
  views.forEach((v) => {
    if (v.id === "view-" + name) v.classList.remove("hidden");
    else v.classList.add("hidden");
  });
  navItems.forEach((n) =>
    n.dataset.view === name
      ? n.classList.add("active")
      : n.classList.remove("active")
  );
  window.scrollTo(0, 0);
}
navItems.forEach((n) =>
  n.addEventListener("click", () => showView(n.dataset.view))
);

/* ============================
   Calculator Category Population
   ============================ */
// Populate category dropdown based on current tab (income/expense)
function populateCalcCategory() {
  calcCategory.innerHTML = ""; // Clear existing options
  const list = categories[currentCalcType] || []; // Get categories for current type
  
  // Show message if no categories exist
  if (list.length === 0) {
    const o = document.createElement("option");
    o.value = "";
    o.textContent = "(no categories)";
    calcCategory.appendChild(o);
    return;
  }
  
  // Add each category as an option
  list.forEach((c) => {
    const o = document.createElement("option");
    o.value = c;
    o.textContent = c;
    calcCategory.appendChild(o);
  });
}

function renderCategoriesUI() {
  catContainer.innerHTML = "";
  ["income", "expense"].forEach((t) => {
    const h = document.createElement("div");
    h.style.fontWeight = "700";
    h.textContent = t.toUpperCase();
    catContainer.appendChild(h);
    categories[t].forEach((c, i) => {
      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.justifyContent = "space-between";
      row.style.alignItems = "center";
      row.style.padding = "8px";
      row.style.marginTop = "6px";
      row.style.background = "#fff";
      row.style.border = "1px solid #f0f2f6";
      row.style.borderRadius = "8px";
      const left = document.createElement("div");
      left.textContent = c;
      const del = document.createElement("button");
      del.className = "btn ghost";
      del.textContent = "Delete";
      del.onclick = () => {
        if (!confirm('Delete category "' + c + '"?')) return;
        categories[t].splice(i, 1);
        saveAll();
        renderAll();
      };
      row.appendChild(left);
      row.appendChild(del);
      catContainer.appendChild(row);
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
function renderRecent() {
  recentEl.innerHTML = "";
  let list = history.slice();
  if (currentFilter) {
    if (currentFilter.type === "date") {
      list = list.filter((h) => dateKey(h.date) === currentFilter.value);
    } else if (currentFilter.type === "category-tf") {
      const { cat, tf } = currentFilter.value;
      const now = new Date();
      list = list.filter((h) => {
        if (h.type !== "expense" || h.category !== cat) return false;
        const d = new Date(h.date);
        if (tf === "today")
          return (
            d.getFullYear() === now.getFullYear() &&
            d.getMonth() === now.getMonth() &&
            d.getDate() === now.getDate()
          );
        if (tf === "month")
          return (
            d.getFullYear() === now.getFullYear() &&
            d.getMonth() === now.getMonth()
          );
        if (tf === "year") return d.getFullYear() === now.getFullYear();
        return true;
      });
    }
  }

  const recent = list.slice().reverse().slice(0, 20);
  if (recent.length === 0) {
    recentEl.innerHTML =
      '<div style="color:var(--muted);padding:8px">No transactions.</div>';
    filterClearHolder.innerHTML = "";
    return;
  }

  // show clear filter button if filter active
  if (currentFilter) {
    const btn = document.createElement("button");
    btn.className = "btn ghost";
    btn.textContent = "Clear filter";
    btn.onclick = () => {
      currentFilter = null;
      renderAll();
    };
    filterClearHolder.innerHTML = "";
    filterClearHolder.appendChild(btn);
  } else filterClearHolder.innerHTML = "";

  recent.forEach((h) => {
    const el = document.createElement("div");
    el.className = "entry";
    const left = document.createElement("div");
    left.style.display = "flex";
    left.style.flexDirection = "column";
    const title = document.createElement("div");
    title.style.fontWeight = "700";
    title.textContent = h.source || h.category || h.type;
    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = `${h.type.toUpperCase()} • ${
      h.category || "-"
    } • ${new Date(h.date).toLocaleString()}`;
    left.appendChild(title);
    left.appendChild(meta);

    const right = document.createElement("div");
    right.style.display = "flex";
    right.style.gap = "8px";
    right.style.alignItems = "center";
    const amt = document.createElement("div");
    amt.style.fontWeight = 800;
    amt.style.color = h.type === "income" ? "var(--primary)" : "var(--danger)";
    amt.textContent = (h.type === "income" ? "" : "-") + fmt(h.amount);
    const del = document.createElement("button");
    del.className = "btn ghost";
    del.textContent = "Delete";
    del.onclick = () => {
      if (!confirm("Delete this transaction?")) return;
      const idx = history.indexOf(h);
      if (idx > -1) history.splice(idx, 1);
      saveAll();
      renderAll();
    };
    right.appendChild(amt);
    right.appendChild(del);

    el.appendChild(left);
    el.appendChild(right);
    recentEl.appendChild(el);
  });
}