let total = parseFloat(localStorage.getItem("total")) || 0;
let history = JSON.parse(localStorage.getItem("history")) || [];

document.getElementById("total").innerText = total.toFixed(2);
renderHistory();

function addIncome() {
  let amt = parseFloat(document.getElementById("amount").value);
  if (!isNaN(amt) && amt > 0) {
    total += amt;
    history.push({ amount: amt, date: new Date().toLocaleString() });
    saveData();
    renderHistory();
    document.getElementById("total").innerText = total.toFixed(2);
    document.getElementById("amount").value = "";
  }
}

function saveData() {
  localStorage.setItem("total", total);
  localStorage.setItem("history", JSON.stringify(history));
}

function renderHistory() {
  let list = document.getElementById("history");
  list.innerHTML = "";
  history.slice().reverse().forEach(item => {
    let li = document.createElement("li");
    li.textContent = `+₱${item.amount.toFixed(2)} on ${item.date}`;
    list.appendChild(li);
  });
}