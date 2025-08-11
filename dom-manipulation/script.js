// Local quotes array
let quotes = [];
let serverQuotes = [];
let selectedCategory = 'all';

// DOM elements
const quoteDisplay = document.getElementById('quoteDisplay');
const categoryFilter = document.getElementById('categoryFilter');
const showQuoteBtn = document.getElementById('showQuoteBtn');
const newQuoteText = document.getElementById('newQuoteText');
const newQuoteCategory = document.getElementById('newQuoteCategory');
const addQuoteBtn = document.getElementById('addQuoteBtn');
const exportQuotesBtn = document.getElementById('exportQuotesBtn');
const importQuotesInput = document.getElementById('importQuotesInput');
const syncQuotesBtn = document.getElementById('syncQuotesBtn');
const syncStatus = document.getElementById('syncStatus');

// Display a random quote from filtered list
function showRandomQuote() {
    let filtered = selectedCategory === 'all'
        ? quotes
        : quotes.filter(q => q.category === selectedCategory);

    if (filtered.length === 0) {
        quoteDisplay.textContent = "No quotes available in this category.";
        return;
    }

    let randomIndex = Math.floor(Math.random() * filtered.length);
    quoteDisplay.textContent = `"${filtered[randomIndex].text}" - ${filtered[randomIndex].category}`;
}

// Add a new quote
function addQuote() {
    let text = newQuoteText.value.trim();
    let category = newQuoteCategory.value.trim().toLowerCase();

    if (!text || !category) {
        alert("Please enter both a quote and category.");
        return;
    }

    quotes.push({ text, category });
    newQuoteText.value = '';
    newQuoteCategory.value = '';
    alert("Quote added successfully!");
}

// Change selected category
categoryFilter.addEventListener('change', (e) => {
    selectedCategory = e.target.value;
});

// Export quotes as JSON
function exportQuotes() {
    let dataStr = JSON.stringify(quotes, null, 2);
    let blob = new Blob([dataStr], { type: "application/json" });
    let url = URL.createObjectURL(blob);

    let a = document.createElement("a");
    a.href = url;
    a.download = "quotes.json";
    a.click();

    URL.revokeObjectURL(url);
}

// Import quotes from JSON file
function importQuotes(event) {
    let file = event.target.files[0];
    if (!file) return;

    let reader = new FileReader();
    reader.onload = function (e) {
        try {
            let importedQuotes = JSON.parse(e.target.result);
            if (Array.isArray(importedQuotes)) {
                quotes = quotes.concat(importedQuotes);
                alert("Quotes imported successfully!");
            } else {
                alert("Invalid file format.");
            }
        } catch (err) {
            alert("Error reading file.");
        }
    };
    reader.readAsText(file);
}

// Fetch quotes from server (Task 3 requirement)
async function fetchQuotesFromServer() {
    try {
        let res = await fetch("https://jsonplaceholder.typicode.com/posts?_limit=5");
        let data = await res.json();

        serverQuotes = data.map(item => ({
            text: item.title,
            category: "server"
        }));

        // Compare with local
        let hasConflict = JSON.stringify(serverQuotes) !== JSON.stringify(quotes);

        if (hasConflict) {
            syncStatus.style.display = "block";
        } else {
            syncStatus.style.display = "none";
            quotes = [...serverQuotes];
            alert("Quotes synced with server.");
        }
    } catch (err) {
        alert("Failed to fetch from server.");
    }
}

// Accept server version
function acceptServerQuotes() {
    quotes = [...serverQuotes];
    syncStatus.style.display = "none";
    alert("Server quotes accepted.");
}

// Keep local version
function keepLocalQuotes() {
    syncStatus.style.display = "none";
    alert("Local quotes kept.");
}

// Event listeners
showQuoteBtn.addEventListener('click', showRandomQuote);
addQuoteBtn.addEventListener('click', addQuote);
exportQuotesBtn.addEventListener('click', exportQuotes);
importQuotesInput.addEventListener('change', importQuotes);
syncQuotesBtn.addEventListener('click', fetchQuotesFromServer);
document.getElementById('acceptServerBtn').addEventListener('click', acceptServerQuotes);
document.getElementById('keepLocalBtn').addEventListener('click', keepLocalQuotes);





