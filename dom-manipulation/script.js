// Quotes array
let quotes = [
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
    quoteDisplay.textContent = filteredQuotes[randomIndex].text;
}

// Create Add Quote Form function
function createAddQuoteForm() {
    let text = newQuoteText.value.trim();
    let category = newQuoteCategory.value.trim();

    if (text === "" || category === "") {
        alert("Please enter both a quote and a category.");
        return;
    }

    quotes.push({ text, category });
    populateCategories();
    newQuoteText.value = "";
    newQuoteCategory.value = "";
    alert("Quote added successfully!");
}

// Event listeners
showQuoteBtn.addEventListener("click", showRandomQuote);
addQuoteBtn.addEventListener("click", createAddQuoteForm);

// Initial setup
populateCategories();

