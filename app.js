// This is where your app logic will go

console.log("App loaded");

// You'll add:
// - Input handling
// - Saving data
// - Showing totals

document.addEventListener('DOMContentLoaded', function() {
  // Show modal when button clicked
  document.getElementById('floating-btn').addEventListener('click', function() {
    document.getElementById('calculator-modal').style.display = 'flex';
  });

  // Hide modal when close button clicked
  document.getElementById('close-modal').addEventListener('click', function() {
    document.getElementById('calculator-modal').style.display = 'none';
  });

  // Hide modal if background clicked
  document.getElementById('calculator-modal').addEventListener('click', function(e) {
    if (e.target === this) this.style.display = 'none';
  });
});


addBtn.addEventListener('click', function() {
  // ... your logic for collecting entry data ...
  history.push({
    type: typeEl.value,
    category: catSelect.value,
    source: sourceEl.value,
    amount: Number(amountEl.value),
    date: new Date().toISOString(),
  });
  saveAll();
  renderAll(); // <-- This ensures entries show up immediately
});