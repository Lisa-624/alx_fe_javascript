/* script.js
   Features:
   - localStorage persistence (quotes)
   - sessionStorage last viewed quote
   - filtering by category (persist last filter)
   - import/export JSON
   - periodic server sync (simulate server), server-wins conflict resolution
   - UI notification to manually resolve conflicts (accept server / keep local)
*/

/* -------------------------
   Configuration
   ------------------------- */
// Replace with your actual mock server endpoint supporting GET /quotes and POST /quotes
// For testing you can run json-server locally or use any mock API that returns an array of quote objects
const SERVER_URL = "https://your-mock-api.example.com/quotes"; // << set this
const SYNC_INTERVAL_MS = 30_000; // 30s sync interval (adjustable)

/* -------------------------
   Data model helpers
   ------------------------- */
/*
  Quote shape:
  {
    id: string,           // unique id (timestamp string or uuid)
    text: string,
    category: string,
    lastModified: number  // unix ms timestamp
  }
*/

function makeQuote(text, category) {
  return {
    id: `q_${Date.now()}_${Math.floor(Math.random()*1000)}`,
    text,
    category,
    lastModified: Date.now()
  };
}

/* -------------------------
   Initial load & DOM refs
   ------------------------- */
let quotes = JSON.parse(localStorage.getItem("quotes")) || [
  makeQuote("The best way to get started is to quit talking and begin doing.", "Motivation"),
  makeQuote("Don’t let yesterday take up too much of today.", "Inspiration"),
  makeQuote("It’s not whether you get knocked down, it’s whether you get up.", "Resilience")
];

const quoteDisplay = document.getElementById("quoteDisplay");
const categoryFilter = document.getElementById("categoryFilter");
const newQuoteText = document.getElementById("newQuoteText");
const newQuoteCategory = document.getElementById("newQuoteCategory");
const addQuoteBtn = document.getElementById("addQuoteBtn");
const showQuoteBtn = document.getElementById("showQuoteBtn");

// Sync UI
const syncStatus = document.getElementById("syncStatus");
const syncMessage = document.getElementById("syncMessage");
const acceptServerBtn = document.getElementById("acceptServerBtn");
const keepLocalBtn = document.getElementById("keepLocalBtn");

/* -------------------------
   localStorage helpers
   ------------------------- */
function saveQuotes() {
  localStorage.setItem("quotes", JSON.stringify(quotes));
}

function loadQuotes() {
  const stored = localStorage.getItem("quotes");
  if (stored) quotes = JSON.parse(stored);
}

/* -------------------------
   UI: categories & filtering
   ------------------------- */
function populateCategories() {
  const cats = [...new Set(quotes.map(q => q.category))];
  // keep previously selected filter if exists
  const prev = localStorage.getItem("lastCategory") || "all";

  categoryFilter.innerHTML = `<option value="all">All Categories</option>`;
  cats.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    categoryFilter.appendChild(opt);
  });

  // restore selection (if available)
  if ([...categoryFilter.options].some(o => o.value === prev)) {
    categoryFilter.value = prev;
  } else {
    categoryFilter.value = "all";
    localStorage.setItem("lastCategory", "all");
  }
}

function filterQuotes() {
  const sel = categoryFilter.value;
  localStorage.setItem("lastCategory", sel);
  showRandomQuote(); // refresh display
}

/* -------------------------
   Display & add quote
   ------------------------- */
function showRandomQuote() {
  const sel = categoryFilter.value || "all";
  const filtered = sel === "all" ? quotes : quotes.filter(q => q.category === sel);

  if (!filtered || filtered.length === 0) {
    quoteDisplay.textContent = "No quotes available for this category.";
    return;
  }

  const idx = Math.floor(Math.random() * filtered.length);
  const q = filtered[idx];
  quoteDisplay.textContent = q.text;

  // Save last viewed quote in sessionStorage
  sessionStorage.setItem("lastQuote", JSON.stringify(q));
}

function addQuote() {
  const text = newQuoteText.value.trim();
  const category = newQuoteCategory.value.trim();

  if (!text || !category) {
    alert("Please enter both a quote and a category.");
    return;
  }

  const q = makeQuote(text, category);
  quotes.push(q);
  saveQuotes();
  populateCategories();
  newQuoteText.value = "";
  newQuoteCategory.value = "";
  alert("Quote added successfully!");
}

/* -------------------------
   Import / Export JSON
   ------------------------- */
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
  const file = event.target.files?.[0];
  if (!file) return;
  const fr = new FileReader();
  fr.onload = (e) => {
    try {
      const imported = JSON.parse(e.target.result);
      if (!Array.isArray(imported)) throw new Error("Import must be an array of quotes");
      // Normalize imported items (ensure id & lastModified)
      const normalized = imported.map(item => ({
        id: item.id || `q_imp_${Date.now()}_${Math.floor(Math.random()*1000)}`,
        text: item.text || "",
        category: item.category || "Uncategorized",
        lastModified: item.lastModified || Date.now()
      }));
      quotes.push(...normalized);
      saveQuotes();
      populateCategories();
      alert("Quotes imported successfully!");
    } catch (err) {
      alert("Error importing JSON: " + err.message);
    }
  };
  fr.readAsText(file);
}

/* -------------------------
   Server Sync & Conflict Resolution
   ------------------------- */

// Show sync notification with actions
function showSyncNotification(message, serverItems = [], localItems = []) {
  syncMessage.textContent = message || "Server synchronization detected updates.";
  syncStatus.style.display = "block";

  // store items to access in handlers
  syncStatus.dataset.server = JSON.stringify(serverItems);
  syncStatus.dataset.local = JSON.stringify(localItems);
}

// Hide notification
function hideSyncNotification() {
  syncStatus.style.display = "none";
  delete syncStatus.dataset.server;
  delete syncStatus.dataset.local;
}

// Accept server version (server wins)
function acceptServerVersion() {
  const serverItems = JSON.parse(syncStatus.dataset.server || "[]");
  if (serverItems.length) {
    // Merge: replace local items with server items where id matches; add server items that are new
    const serverMap = new Map(serverItems.map(i => [i.id, i]));
    const newList = quotes.map(local => serverMap.get(local.id) || local);
    // add server-only items:
    serverItems.forEach(si => {
      if (!newList.some(n => n.id === si.id)) newList.push(si);
    });
    quotes = newList;
    saveQuotes();
    populateCategories();
    hideSyncNotification();
    alert("Server version accepted. Local data updated.");
  } else {
    hideSyncNotification();
  }
}

// Keep local version (do nothing to local, but push local to server optionally)
function keepLocalVersion() {
  // Here we simply hide the notification. Optionally we could push local-only changes up to the server.
  hideSyncNotification();
  alert("Kept local version. You can manually push local changes to the server (not implemented).");
}

// Attach UI handlers for the two buttons
acceptServerBtn.addEventListener("click", acceptServerVersion);
keepLocalBtn.addEventListener("click", keepLocalVersion);

// Fetch from server (simulate GET /quotes)
async function fetchServerQuotes() {
  if (!SERVER_URL || SERVER_URL.includes("your-mock-api")) {
    // no server configured; skip automatic sync.
    console.warn("SERVER_URL not configured. Skipping server sync.");
    return [];
  }

  try {
    const res = await fetch(SERVER_URL);
    if (!res.ok) throw new Error(`Server error: ${res.status}`);
    const serverData = await res.json();
    // Expect serverData to be an array of quote-like objects
    return serverData.map(item => ({
      id: item.id || item._id || `s_${item.text?.slice(0,10)}_${Date.now()}`,
      text: item.text || item.body || "",
      category: item.category || item.tag || "Uncategorized",
      lastModified: item.lastModified || Date.now()
    }));
  } catch (err) {
    console.error("Fetch server quotes failed:", err);
    return [];
  }
}

// Compare server vs local and perform conflict resolution (server-wins policy)
function reconcileServerData(serverQuotes) {
  if (!serverQuotes || serverQuotes.length === 0) return;

  const conflicts = [];
  const serverMap = new Map(serverQuotes.map(s => [s.id, s]));

  // Find local items that exist on server and have different lastModified
  for (const local of quotes) {
    const s = serverMap.get(local.id);
    if (s) {
      if (s.lastModified !== local.lastModified) {
        // conflict detected
        if (s.lastModified > local.lastModified) {
          // server is newer -> server wins
          conflicts.push({ id: local.id, server: s, local });
        } else if (local.lastModified > s.lastModified) {
          // local is newer -> conflict (server older). We'll still consider server-wins by default,
          // but present option to keep local.
          conflicts.push({ id: local.id, server: s, local });
        }
      }
    }
  }

  // Also detect server-only entries
  const serverOnly = serverQuotes.filter(s => !quotes.some(l => l.id === s.id));
  if (serverOnly.length > 0) {
    // Add server-only items to local store (server wins)
    quotes.push(...serverOnly);
    saveQuotes();
  }

  if (conflicts.length > 0) {
    // By default, apply server-wins immediately (simple policy). But show notification letting user
    // know and offering to keep local instead.
    // Apply server items where server.lastModified >= local.lastModified
    for (const c of conflicts) {
      const idx = quotes.findIndex(q => q.id === c.id);
      if (idx !== -1) quotes[idx] = c.server;
    }
    saveQuotes();
    populateCategories();

    // Show user the conflict notification with details
    showSyncNotification(`${conflicts.length} conflict(s) resolved (server-wins). Choose "Keep Local" to override.`, serverQuotes, quotes);
  }
}

// Periodic sync job
async function periodicSync() {
  const serverQuotes = await fetchServerQuotes();
  if (!serverQuotes || serverQuotes.length === 0) return;
  reconcileServerData(serverQuotes);
}

/* -------------------------
   Initialization
   ------------------------- */
function init() {
  loadQuotes();
  populateCategories();

  // Restore last viewed quote (session)
  const lastQuote = sessionStorage.getItem("lastQuote");
  if (lastQuote) {
    try {
      const q = JSON.parse(lastQuote);
      if (q && q.text) quoteDisplay.textContent = q.text;
    } catch (e) { /* ignore */ }
  }

  // Setup event listeners
  addQuoteBtn.addEventListener("click", addQuote);
  showQuoteBtn.addEventListener("click", showRandomQuote);
  categoryFilter.addEventListener("change", filterQuotes);

  // Start periodic sync if SERVER_URL configured
  if (SERVER_URL && !SERVER_URL.includes("your-mock-api")) {
    setInterval(periodicSync, SYNC_INTERVAL_MS);
    // Do an immediate sync once at startup
    periodicSync().catch(() => {});
  } else {
    console.info("Server sync disabled. Set SERVER_URL in script.js to enable syncing.");
  }
}

// Run
init();



