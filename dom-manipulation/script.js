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
-------------------------- */
const SERVER_URL = "https://jsonplaceholder.typicode.com/posts"; // Mock API endpoint
const SYNC_INTERVAL_MS = 60000; // 60 seconds sync interval

/* -------------------------
   Data model helpers
-------------------------- */
function makeQuote(text, category) {
  return {
    id: `q_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    text,
    category,
    lastModified: Date.now(),
  };
}

/* -------------------------
   Initial load & DOM refs
-------------------------- */
let quotes = JSON.parse(localStorage.getItem("quotes")) || [
  makeQuote(
    "The best way to get started is to quit talking and begin doing.",
    "Motivation"
  ),
  makeQuote("Don’t let yesterday take up too much of today.", "Inspiration"),
  makeQuote("It’s not whether you get knocked down, it’s whether you get up.", "Resilience"),
];

const quoteDisplay = document.getElementById("quoteDisplay");
const categoryFilter = document.getElementById("categoryFilter");
const newQuoteText = document.getElementById("newQuoteText");
const newQuoteCategory = document.getElementById("newQuoteCategory");
const addQuoteBtn = document.getElementById("addQuoteBtn");
const showQuoteBtn = document.getElementById("showQuoteBtn");

const syncStatus = document.getElementById("syncStatus");
const syncMessage = document.getElementById("syncMessage");
const acceptServerBtn = document.getElementById("acceptServerBtn");
const keepLocalBtn = document.getElementById("keepLocalBtn");

/* -------------------------
   localStorage helpers
-------------------------- */
function saveQuotes() {
  localStorage.setItem("quotes", JSON.stringify(quotes));
}

function loadQuotes() {
  const stored = localStorage.getItem("quotes");
  if (stored) quotes = JSON.parse(stored);
}

/* -------------------------
   UI: categories & filtering
-------------------------- */
function populateCategories() {
  const cats = [...new Set(quotes.map((q) => q.category))];
  const prev = localStorage.getItem("lastCategory") || "all";

  categoryFilter.innerHTML = `<option value="all">All Categories</option>`;
  cats.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    categoryFilter.appendChild(opt);
  });

  if ([...categoryFilter.options].some((o) => o.value === prev)) {
    categoryFilter.value = prev;
  } else {
    categoryFilter.value = "all";
    localStorage.setItem("lastCategory", "all");
  }
}

function filterQuotes() {
  const sel = categoryFilter.value;
  localStorage.setItem("lastCategory", sel);
  showRandomQuote();
}

/* -------------------------
   Display & add quote
-------------------------- */
function showRandomQuote() {
  const sel = categoryFilter.value || "all";
  const filtered = sel === "all" ? quotes : quotes.filter((q) => q.category === sel);

  if (!filtered || filtered.length === 0) {
    quoteDisplay.textContent = "No quotes available for this category.";
    return;
  }

  const idx = Math.floor(Math.random() * filtered.length);
  const q = filtered[idx];
  quoteDisplay.textContent = q.text;

  sessionStorage.setItem("lastQuote", JSON.stringify(q));
}

async function postQuoteToServer(quoteText, category = "local") {
  try {
    const res = await fetch(SERVER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: quoteText,
        body: category,
        userId: 1,
      }),
    });
    const data = await res.json();
    console.log("Quote posted successfully:", data);
  } catch (err) {
    console.error("Error posting quote:", err);
  }
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

  // Post the new quote to the server (Task 3 requirement)
  postQuoteToServer(text, category);

  alert("Quote added successfully!");
}

/* -------------------------
   Import / Export JSON
-------------------------- */
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
      const normalized = imported.map((item) => ({
        id: item.id || `q_imp_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        text: item.text || "",
        category: item.category || "Uncategorized",
        lastModified: item.lastModified || Date.now(),
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
-------------------------- */
function showSyncNotification(message, serverItems = [], localItems = []) {
  syncMessage.textContent = message || "Server synchronization detected updates.";
  syncStatus.style.display = "block";
  syncStatus.dataset.server = JSON.stringify(serverItems);
  syncStatus.dataset.local = JSON.stringify(localItems);
}

function hideSyncNotification() {
  syncStatus.style.display = "none";
  delete syncStatus.dataset.server;
  delete syncStatus.dataset.local;
}

function acceptServerVersion() {
  const serverItems = JSON.parse(syncStatus.dataset.server || "[]");
  if (serverItems.length) {
    const serverMap = new Map(serverItems.map((i) => [i.id, i]));
    const newList = quotes.map((local) => serverMap.get(local.id) || local);
    serverItems.forEach((si) => {
      if (!newList.some((n) => n.id === si.id)) newList.push(si);
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

function keepLocalVersion() {
  hideSyncNotification();
  alert("Kept local version. You can manually push local changes to the server (not implemented).");
}

acceptServerBtn.addEventListener("click", acceptServerVersion);
keepLocalBtn.addEventListener("click", keepLocalVersion);

async function fetchServerQuotes() {
  try {
    const res = await fetch(SERVER_URL);
    if (!res.ok) throw new Error(`Server error: ${res.status}`);
    const serverData = await res.json();
    return serverData.map((item) => ({
      id: item.id || item._id || `s_${item.text?.slice(0, 10)}_${Date.now()}`,
      text: item.title || item.body || "",
      category: item.category || item.tag || "Uncategorized",
      lastModified: item.lastModified || Date.now(),
    }));
  } catch (err) {
    console.error("Fetch server quotes failed:", err);
    return [];
  }
}

function reconcileServerData(serverQuotes) {
  if (!serverQuotes || serverQuotes.length === 0) return;

  const conflicts = [];
  const serverMap = new Map(serverQuotes.map((s) => [s.id, s]));

  for (const local of quotes) {
    const s = serverMap.get(local.id);
    if (s) {
      if (s.lastModified !== local.lastModified) {
        if (s.lastModified > local.lastModified) {
          conflicts.push({ id: local.id, server: s, local });
        } else if (local.lastModified > s.lastModified) {
          conflicts.push({ id: local.id, server: s, local });
        }
      }
    }
  }

  const serverOnly = serverQuotes.filter(
    (s) => !quotes.some((l) => l.id === s.id)
  );
  if (serverOnly.length > 0) {
    quotes.push(...serverOnly);
    saveQuotes();
  }

  if (conflicts.length > 0) {
    for (const c of conflicts) {
      const idx = quotes.findIndex((q) => q.id === c.id);
      if (idx !== -1) quotes[idx] = c.server;
    }
    saveQuotes();
    populateCategories();
    showSyncNotification(
      `${conflicts.length} conflict(s) resolved (server-wins). Choose "Keep Local" to override.`,
      serverQuotes,
      quotes
    );
  }
}

async function periodicSync() {
  const serverQuotes = await fetchServerQuotes();
  if (!serverQuotes || serverQuotes.length === 0) return;
  reconcileServerData(serverQuotes);
}

/* -------------------------
   Initialization
-------------------------- */
function init() {
  loadQuotes();
  populateCategories();

  const lastQuote = sessionStorage.getItem("lastQuote");
  if (lastQuote) {
    try {
      const q = JSON.parse(lastQuote);
      if (q && q.text) quoteDisplay.textContent = q.text;
    } catch {
      // ignore
    }
  }

  addQuoteBtn.addEventListener("click", addQuote);
  showQuoteBtn.addEventListener("click", showRandomQuote);
  categoryFilter.addEventListener("change", filterQuotes);

  if (SERVER_URL && !SERVER_URL.includes("your-mock-api")) {
    setInterval(periodicSync, SYNC_INTERVAL_MS);
    periodicSync().catch(() => {});
  } else {
    console.info("Server sync disabled. Set SERVER_URL in script.js to enable syncing.");
  }
}

init();






