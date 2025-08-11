// Initial Quotes Data
let quotes = [
    { text: "The best way to get started is to quit talking and begin doing.", category: "Motivation" },
    { text: "Your time is limited, so don’t waste it living someone else’s life.", category: "Life" },
    { text: "The purpose of our lives is to be happy.", category: "Life" },
    { text: "Success is not in what you have, but who you are.", category: "Success" },
];

// DOM Elements
const quoteDisplay = document.getElementById("quoteDisplay");
const newQuoteBtn = document.getElementById("newQuote");
const categorySelect = document.getElementById("categorySelect");
const addQuoteBtn = document.getElementById("addQuoteBtn");
const newQuoteText = document.getElementById("newQuoteText");
const newQuoteCategory = document.getElementById("newQuoteCategory");

// Populate category dropdown on page load
function populateCategories() {
    categorySelect.innerHTML = ""; // clear options
    let categories = [...new Set(quotes.map(q => q.category))]; // unique categories

    categories.forEach(cat => {
        let option = document.createElement("option");
        option.value = cat;
        option.textContent = cat;
        categorySelect.appendChild(option);
    });
}

// Show a random quote from the selected category
function showRandomQuote() {
    let selectedCategory = categorySelect.value;
    let filteredQuotes = quotes.filter(q => q.category === selectedCategory);

    if (filteredQuotes.length === 0) {
        quoteDisplay.textContent = "No quotes available for this category.";
        return;
    }

    let randomIndex = Math.floor(Math.random() * filteredQuotes.length);
    quoteDisplay.textContent = `"${filteredQuotes[randomIndex].text}" — ${filteredQuotes[randomIndex].category}`;
}

// Add a new quote dynamically
function addQuote() {
    let text = newQuoteText.value.trim();
    let category = newQuoteCategory.value.trim();

    if (text === "" || category === "") {
        alert("Please enter both a quote and a category.");
        return;
    }

    quotes.push({ text, category });

    // If category is new, repopulate dropdown
    populateCategories();

    // Clear input fields
    newQuoteText.value = "";
    newQuoteCategory.value = "";

    alert("Quote added successfully!");
}

// Event Listeners
document.addEventListener("DOMContentLoaded", () => {
    populateCategories();
    if (categorySelect.options.length > 0) {
        categorySelect.selectedIndex = 0;
    }
});

newQuoteBtn.addEventListener("click", showRandomQuote);
addQuoteBtn.addEventListener("click", addQuote);
