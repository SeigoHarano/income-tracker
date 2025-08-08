// ===============================
// Local Storage Helper Functions
// ===============================
function getEntries() {
    return JSON.parse(localStorage.getItem("entries")) || [];
}

function saveEntries(entries) {
    localStorage.setItem("entries", JSON.stringify(entries));
}

// ===============================
// Display Totals
// ===============================
function updateTotals() {
    const entries = getEntries();
    let income = 0, expense = 0;

    entries.forEach(e => {
        if (e.type === "income") income += e.amount;
        else expense += e.amount;
    });

    document.getElementById("total-income").textContent = `₱${income.toFixed(2)}`;
    document.getElementById("total-expense").textContent = `₱${expense.toFixed(2)}`;
    document.getElementById("balance").textContent = `₱${(income - expense).toFixed(2)}`;
}

// ===============================
// Render History
// ===============================
function renderHistory() {
    const list = document.getElementById("entry-list");
    list.innerHTML = "";
    const entries = getEntries();

    entries.forEach((entry, index) => {
        const li = document.createElement("li");
        li.innerHTML = `
            <span>${entry.date} - ${entry.category}</span>
            <span style="color:${entry.type === "income" ? "green" : "red"};">
                ${entry.type === "income" ? "+" : "-"}₱${entry.amount.toFixed(2)}
            </span>
        `;
        list.appendChild(li);
    });
}

// ===============================
// Modal Handling
// ===============================
const modal = document.getElementById("entry-modal");
document.getElementById("floating-btn").addEventListener("click", () => {
    modal.style.display = "flex";
});

document.querySelector(".close-btn").addEventListener("click", () => {
    modal.style.display = "none";
});

// ===============================
// Tabs (Income / Expense)
// ===============================
let entryType = "income";
document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", () => {
        document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        entryType = tab.dataset.type;
    });
});

// ===============================
// Calculator Logic
// ===============================
let calcDisplay = document.getElementById("calculator-display");
let calcExpression = "";

function updateCalcDisplay() {
    calcDisplay.value = calcExpression || "0";
}

function handleCalcInput(value) {
    if (value === "AC") {
        calcExpression = "";
    } else if (value === "=") {
        try {
            calcExpression = eval(calcExpression.replace(/×/g, "*").replace(/÷/g, "/")).toString();
        } catch {
            calcExpression = "Error";
        }
    } else {
        calcExpression += value;
    }
    updateCalcDisplay();
}

// Create calculator buttons
const calcButtons = [
    "AC", "%", "÷", "×",
    "7", "8", "9", "-",
    "4", "5", "6", "+",
    "1", "2", "3", "=",
    "0", ".", ""
];

const calcGrid = document.querySelector(".calculator-grid");
calcButtons.forEach(btn => {
    if (btn !== "") {
        const button = document.createElement("button");
        button.textContent = btn;
        if (["÷", "×", "-", "+", "%"].includes(btn)) button.classList.add("operator");
        if (btn === "=") button.classList.add("equal");
        button.addEventListener("click", () => handleCalcInput(btn));
        calcGrid.appendChild(button);
    }
});

updateCalcDisplay();

// ===============================
// Save Entry
// ===============================
document.getElementById("entry-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const category = document.getElementById("category").value;
    const amount = parseFloat(calcExpression || "0");
    const date = document.getElementById("date").value || new Date().toISOString().split("T")[0];

    if (!amount || amount <= 0) {
        alert("Enter a valid amount!");
        return;
    }

    const newEntry = { type: entryType, category, amount, date };
    const entries = getEntries();
    entries.push(newEntry);
    saveEntries(entries);

    updateTotals();
    renderHistory();
    modal.style.display = "none";
    calcExpression = "";
    updateCalcDisplay();
    e.target.reset();
});

// ===============================
// Initialize
// ===============================
updateTotals();
renderHistory();