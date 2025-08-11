// Load quotes from Local Storage or default
let quotes = JSON.parse(localStorage.getItem("quotes")) || [
    { text: "The best way to get started is to quit talking and begin doing.", category: "Motivation" },
    { text: "Don’t let yesterday take up too much of today.", category: "Inspiration" },
    { text: "It’s not whether you get knocked down, it’s whether you get up.", category: "Resilience" }
];

// DOM elements
const quoteDisplay = document.getElementById("quoteDisplay");
const categorySelect = document.getElementById("categorySelect");
const newQuoteText = document.getElementById("newQuoteText");
const newQuoteCategory = document.getElementById("newQuoteCategory");
const showQuoteBtn = document.getElementById("showQuoteBtn");
const addQuoteBtn = document.getElementById("addQuoteBtn");

// Save quotes to Local Storage
function saveQuotes() {
    localStorage.setItem("quotes", JSON.stringify(quotes));
}

// Populate category dropdown
function populateCategories() {
    let categories = [...new Set(quotes.map(q => q.category))];
    categorySelect.innerHTML = `<option value="">All Categories</option>`;
    categories.forEach(cat => {
        let option = document.createElement("option");
        option.value = cat;
        option.textContent = cat;
        categorySelect.appendChild(option);
    });
}

// Show random quote
function showRandomQuote() {
    let selectedCategory = categorySelect.value;
    let filteredQuotes = selectedCategory 
        ? quotes.filter(q => q.category === selectedCategory)
        : quotes;

    if (filteredQuotes.length === 0) {
        quoteDisplay.textContent = "No quotes available for this category.";
        return;
    }

    let randomIndex = Math.floor(Math.random() * filteredQuotes.length);
    let randomQuote = filteredQuotes[randomIndex];
    quoteDisplay.textContent = randomQuote.text;

    // Optional: Save last viewed quote to Session Storage
    sessionStorage.setItem("lastQuote", JSON.stringify(randomQuote));
}

// Add new quote
function createAddQuoteForm() {
    let text = newQuoteText.value.trim();
    let category = newQuoteCategory.value.trim();

    if (text === "" || category === "") {
        alert("Please enter both a quote and a category.");
        return;
    }

    quotes.push({ text, category });
    saveQuotes(); // Persist changes
    populateCategories();
    newQuoteText.value = "";
    newQuoteCategory.value = "";
    alert("Quote added successfully!");
}

// Export quotes to JSON file
function exportToJsonFile() {
    const dataStr = JSON.stringify(quotes, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "quotes.json";
    a.click();

    URL.revokeObjectURL(url);
}

// Import quotes from JSON file
function importFromJsonFile(event) {
    const fileReader = new FileReader();
    fileReader.onload = function(e) {
        try {
            const importedQuotes = JSON.parse(e.target.result);
            if (Array.isArray(importedQuotes)) {
                quotes.push(...importedQuotes);
                saveQuotes();
                populateCategories();
                alert('Quotes imported successfully!');
            } else {
                alert('Invalid JSON format');
            }
        } catch (err) {
            alert('Error parsing JSON file');
        }
    };
    fileReader.readAsText(event.target.files[0]);
}

// Event listeners
showQuoteBtn.addEventListener("click", showRandomQuote);
addQuoteBtn.addEventListener("click", createAddQuoteForm);

// Initial setup
populateCategories();

// Load last viewed quote from Session Storage
const lastQuote = sessionStorage.getItem("lastQuote");
if (lastQuote) {
    quoteDisplay.textContent = JSON.parse(lastQuote).text;
}


