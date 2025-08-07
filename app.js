// This is where your app logic will go

console.log("App loaded");

// You'll add:
// - Input handling
// - Saving data
// - Showing totals

// Show modal when floating button is clicked
document.getElementById('floating-btn').addEventListener('click', function() {
  document.getElementById('calculator-modal').style.display = 'flex';
});

// Hide modal when close button is clicked
document.getElementById('close-modal').addEventListener('click', function() {
  document.getElementById('calculator-modal').style.display = 'none';
});

// Optionally: Hide modal when clicking outside the modal box
document.getElementById('calculator-modal').addEventListener('click', function(e) {
  if (e.target === this) this.style.display = 'none';
});