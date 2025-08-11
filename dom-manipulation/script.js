/* --- Configuration --- */
const SERVER_URL = "https://jsonplaceholder.typicode.com/posts"; // Mock API
const SYNC_INTERVAL_MS = 60000; // 60 seconds sync interval

/* --- DOM References --- */
const quoteDisplay = document.getElementById("quoteDisplay");
const categoryFilter = document.getElementById("categoryFilter");
const showQuoteBtn = document.getElementById("showQuoteBtn");
const newQuoteText = document.getElementById("newQuoteText");
const newQuoteCategory = document.getElementById("newQuoteCategory");
const addQuoteBtn = document.getElementById("addQuoteBtn");
const exportQuotesBtn = document.getElementById("exportQuotesBtn");
const importFileInput = document.getElementById("importFile");
const syncStatus = document.getElementById("syncStatus");
const syncMessage = document.getElementById("syncMessage");
const acceptServerBtn = document.getElementById("acceptServerBtn");
const keepLocalBtn = document.getElementById("keepLocalBtn");

/* --- Data Model Helpers --- */
function makeQuote(text, category) {
  return {
    id: `q_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    text,
    category,
    lastModified: Date.now()
  };
}

/* --- Quotes state --- */
let quotes = [];
let serverQuotes = [];
let conflictQuotes = [];

/* --- Local Storage Helpers --- */
function saveQuotes() {
  localStorage.setItem("quotes", JSON.stringify(quotes));
}

function loadQuotes() {
  const stored = localStorage.getItem("quotes");
  if (stored) {
    quotes = JSON.parse(stored);
  } else {
    // Initial sample quotes
    quotes = [
      makeQuote("The best way to get started is to quit talking and begin doing.", "Motivation"),
      makeQuote("Don’t let yesterday take up too much of today.", "Inspiration"),
      makeQuote("It’s not whether you get knocked down, it’s whether you get up.", "Resilience")
    ];
    saveQuotes();
  }
}

/* --- UI Functions --- */
function populateCategories() {
  const categories = [...new Set(quotes.map(q => q.category))];
  const prevCategory = localStorage.getItem("lastCategory") || "all";

  categoryFilter.innerHTML = '<option value="all">All Categories</option>';
  categories.forEach(cat => {
    const option = document.createElement("option");
    option.value = cat;
    option.textContent = cat;
    categoryFilter.appendChild(option);
  });

  if ([...categoryFilter.options].some(o => o.value === prevCategory)) {
    categoryFilter.value = prevCategory;
  } else {
    categoryFilter.value = "all";
    localStorage.setItem("lastCategory", "all");
  }
}

function filterQuotes() {
  localStorage.setItem("lastCategory", categoryFilter.value);
  showRandomQuote();
}

function showRandomQuote() {
  const selectedCategory = categoryFilter.value || "all";
  const filtered = selectedCategory === "all"
    ? quotes
    : quotes.filter(q => q.category === selectedCategory);

  if (filtered.length === 0) {
    quoteDisplay.textContent = "No quotes available for this category.";
    return;
  }

  const randomIndex = Math.floor(Math.random() * filtered.length);
  const quote = filtered[randomIndex];
  quoteDisplay.textContent = quote.text;

  // Save last viewed quote in sessionStorage
  sessionStorage.setItem("lastQuote", JSON.stringify(quote));
}

function addQuote() {
  const text = newQuoteText.value.trim();
  const category = newQuoteCategory.value.trim();

  if (!text || !category) {
    alert("Please enter both a quote and a category.");
    return;
  }

  const newQuote = makeQuote(text, category);
  quotes.push(newQuote);
  saveQuotes();
  populateCategories();
  newQuoteText.value = "";
  newQuoteCategory.value = "";
  alert("Quote added successfully!");
}

/* --- Import / Export --- */
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

function importFromJsonFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const imported = JSON.parse(e.target.result);
      if (!Array.isArray(imported)) throw new Error("Invalid JSON format: expected array");
      imported.forEach(item => {
        if (item.text && item.category) {
          quotes.push({
            id: item.id || `q_imp_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            text: item.text,
            category: item.category,
            lastModified: item.lastModified || Date.now()
          });
        }
      });
      saveQuotes();
      populateCategories();
      alert("Quotes imported successfully!");
    } catch {
      alert("Failed to import quotes. Please provide a valid JSON file.");
    }
  };
  reader.readAsText(file);
}

/* --- Server Sync Functions --- */

// Fetch quotes from mock server (simulate GET /quotes)
async function fetchQuotesFromServer() {
  try {
    const response = await fetch(`${SERVER_URL}?_limit=10`);
    if (!response.ok) throw new Error(`Server error: ${response.status}`);
    const data = await response.json();

    // Map server data to quote objects
    return data.map(item => ({
      id: `server_${item.id}`,
      text: item.title || item.body || "No text",
      category: "Server",
      lastModified: Date.now()
    }));
  } catch (err) {
    console.error("Error fetching quotes from server:", err);
    return [];
  }
}

// Post new quote to mock server (simulate POST /quotes)
async function postQuoteToServer(quote) {
  try {
    const response = await fetch(SERVER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: quote.text,
        body: quote.text,
        userId: 1
      })
    });
    if (!response.ok) throw new Error(`Server error: ${response.status}`);
    const data = await response.json();
    console.log("Posted quote to server:", data);
  } catch (err) {
    console.error("Error posting quote to server:", err);
  }
}

// Merge local and server quotes with server-wins conflict resolution
function mergeQuotes(localQuotes, serverQuotes) {
  const merged = [...localQuotes];
  const serverMap = new Map(serverQuotes.map(q => [q.id, q]));

  // For every server quote:
  serverQuotes.forEach(serverQ => {
    const localQ = merged.find(q => q.id === serverQ.id);
    if (!localQ) {
      // New server quote — add it
      merged.push(serverQ);
    } else if (serverQ.lastModified > localQ.lastModified) {
      // Server quote is newer — replace local
      const idx = merged.findIndex(q => q.id === localQ.id);
      if (idx !== -1) merged[idx] = serverQ;
    }
  });

  return merged;
}

// Periodic sync job
async function periodicSync() {
  const fetchedServerQuotes = await fetchQuotesFromServer();
  if (fetchedServerQuotes.length === 0) return;

  // Detect conflicts (server wins)
  const newMergedQuotes = mergeQuotes(quotes, fetchedServerQuotes);

  // Detect if there is a difference between current local quotes and new merged
  const isConflict = JSON.stringify(quotes) !== JSON.stringify(newMergedQuotes);
  if (isConflict) {
    conflictQuotes = newMergedQuotes;
    // Show UI notification to accept or keep local
    syncMessage.textContent = "Server has updated quotes. Accept server version or keep local?";
    syncStatus.style.display = "block";
  }
}

/* --- UI conflict handlers --- */
function acceptServerVersion() {
  if (conflictQuotes.length > 0) {
    quotes = conflictQuotes;
    conflictQuotes = [];
    saveQuotes();
    populateCategories();
    filterQuotes();
    syncStatus.style.display = "none";
    alert("Server version accepted and synced.");
  }
}

function keepLocalVersion() {
  conflictQuotes = [];
  syncStatus.style.display = "none";
  alert("Kept local version.");
}

/* --- Initialization --- */
function init() {
  loadQuotes();
  populateCategories();

  // Restore last viewed quote from sessionStorage
  const lastQuote = sessionStorage.getItem("lastQuote");
  if (lastQuote) {
    try {
      const q = JSON.parse(lastQuote);
      if (q && q.text) quoteDisplay.textContent = q.text;
    } catch {}

  }

  // Event listeners
  showQuoteBtn.addEventListener("click", showRandomQuote);
  addQuoteBtn.addEventListener("click", () => {
    addQuote();
    // Optional: post new quote to server asynchronously (fire and forget)
    postQuoteToServer(quotes[quotes.length -1]);
  });
  categoryFilter.addEventListener("change", filterQuotes);
  exportQuotesBtn.addEventListener("click", exportToJsonFile);
  importFileInput.addEventListener("change", importFromJsonFile);
  acceptServerBtn.addEventListener("click", acceptServerVersion);
  keepLocalBtn.addEventListener("click", keepLocalVersion);

  // Initial quote display
  showRandomQuote();

  // Start periodic sync (if SERVER_URL set)
  if (SERVER_URL && !SERVER_URL.includes("your-mock-api")) {
    periodicSync(); // Initial sync immediately
    setInterval(periodicSync, SYNC_INTERVAL_MS);
  } else {
    console.info("Server sync disabled. Set SERVER_URL in script.js to enable syncing.");
  }
}

init();







