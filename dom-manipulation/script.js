// ====== Existing quotes array and DOM references ======
let quotes = [
    { text: "The best way to get started is to quit talking and begin doing.", category: "Motivation" },
    { text: "Don’t let yesterday take up too much of today.", category: "Inspiration" },
    { text: "It’s not whether you get knocked down, it’s whether you get up.", category: "Resilience" }
];

const quoteDisplay = document.getElementById("quoteDisplay");
const categoryFilter = document.getElementById("categoryFilter");
const newQuoteText = document.getElementById("newQuoteText");
const newQuoteCategory = document.getElementById("newQuoteCategory");
const addQuoteBtn = document.getElementById("addQuoteBtn");
const showQuoteBtn = document.getElementById("showQuoteBtn"); // ✅ fixed ID match

// ====== Load from storage ======
function loadQuotes() {
    const storedQuotes = localStorage.getItem("quotes");
    if (storedQuotes) {
        quotes = JSON.parse(storedQuotes);
    }
}

function saveQuotes() {
    localStorage.setItem("quotes", JSON.stringify(quotes));
}

// ====== Populate category filter ======
function populateCategories() {
    let categories = [...new Set(quotes.map(q => q.category))];
    categoryFilter.innerHTML = `<option value="all">All Categories</option>`;
    categories.forEach(cat => {
        let option = document.createElement("option");
        option.value = cat;
        option.textContent = cat;
        categoryFilter.appendChild(option);
    });

    // Restore last selected category
    const lastCategory = localStorage.getItem("lastCategory");
    if (lastCategory) {
        categoryFilter.value = lastCategory;
    }
}

// ====== Filter quotes ======
function filterQuotes() {
    const selectedCategory = categoryFilter.value;
    localStorage.setItem("lastCategory", selectedCategory);
    showRandomQuote(); // Refresh displayed quote
}

// ====== Show random quote ======
function showRandomQuote() {
    const selectedCategory = categoryFilter.value;
    let filteredQuotes = selectedCategory === "all"
        ? quotes
        : quotes.filter(q => q.category === selectedCategory);

    if (filteredQuotes.length === 0) {
        quoteDisplay.textContent = "No quotes available for this category.";
        return;
    }

    const randomIndex = Math.floor(Math.random() * filteredQuotes.length);
    quoteDisplay.textContent = filteredQuotes[randomIndex].text;
}

// ====== Add new quote ======
function addQuote() { // ✅ renamed for clarity
    let text = newQuoteText.value.trim();
    let category = newQuoteCategory.value.trim();

    if (!text || !category) {
        alert("Please enter both a quote and a category.");
        return;
    }

    quotes.push({ text, category });
    saveQuotes();
    populateCategories();
    newQuoteText.value = "";
    newQuoteCategory.value = "";
    alert("Quote added successfully!");
}

// ====== Event listeners ======
addQuoteBtn.addEventListener("click", addQuote);
showQuoteBtn.addEventListener("click", showRandomQuote);

// ====== Initial load ======
loadQuotes();
populateCategories();
filterQuotes();


