const searchBtn = document.getElementById("searchBtn");
const searchInput = document.getElementById("searchInput");
const resultsDiv = document.getElementById("results");
const statusDiv = document.getElementById("status");

const listSearchInput = document.getElementById("listSearchInput");

const exportBtn = document.getElementById("exportBtn");

const selectedGames = new Map(); // key = game_name
const selectedListDiv = document.getElementById("selectedList");

// Modal elements
const intrigueModal = document.getElementById("intrigueModal");
const modalTitle = document.getElementById("modalTitle");
const starRating = document.getElementById("starRating");
const ratingValue = document.getElementById("ratingValue");

let pendingIntrigue = null;   // stores selected rating 1..10
let pendingGame = null;

let lastSearchResults = [];

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderResults(results) {
  if (!results || results.length === 0) {
    resultsDiv.innerHTML = "";
    statusDiv.textContent = "No results found.";
    return;
  }

  statusDiv.textContent = "";

  const cards = results.map((g) => {
    const name = escapeHtml(g.game_name);
    const main = escapeHtml(g.main_story);
    const extra = escapeHtml(g.main_extra);
    const score = escapeHtml(g.score);
    const imgUrl = g.image_url ? escapeHtml(g.image_url) : null;

    const ownedClass = g.owned ? "owned" : "";
    const inList = selectedGames.has(g.game_name);
    const inListClass = inList ? "in-list" : "";

    return `
      <div class="game-card ${ownedClass} ${inListClass}"
          onclick='toggleSelected(${JSON.stringify(g)})'>

        ${g.owned ? `<div class="badge owned-badge">Owned</div>` : ""}
        ${inList ? `<div class="badge in-list-badge">In List</div>` : ""}

        ${imgUrl ? `<img src="${imgUrl}" style="width:80px;border-radius:8px;">` : ""}

        <div>
          <div style="font-weight:600;">${name}</div>
          <div style="margin-top:6px;">
            <strong>Main:</strong> ${main}
            <strong style="margin-left:12px;">Main+Extra:</strong> ${extra}
          </div>
          <div style="margin-top:6px;">
            <strong>Score:</strong> ${score}
          </div>
        </div>
      </div>
    `;}).join("");

  resultsDiv.innerHTML = cards;
}

async function doSearch() {
  const q = searchInput.value.trim();
  const steamid = document.getElementById("steamIdInput").value.trim();

  if (!q) {
    statusDiv.textContent = "Type a game title first.";
    resultsDiv.innerHTML = "";
    return;
  }

  statusDiv.textContent = "Searching...";
  resultsDiv.innerHTML = "";

  try {
    const url = steamid ? `/api/search?q=${encodeURIComponent(q)}&steamid=${encodeURIComponent(steamid)}` : `/api/search?q=${encodeURIComponent(q)}`;
    const resp = await fetch(url);
    const data = await resp.json();

    if (!resp.ok) {
      statusDiv.textContent = data.error || "Search failed.";
      return;
    }

    lastSearchResults = data.results;
    renderResults(lastSearchResults);
  } catch (err) {
    statusDiv.textContent = "Network error. Check console.";
    console.error(err);
  }
}

function renderSelectedList() {
  if (selectedGames.size === 0) {
    selectedListDiv.innerHTML = "<p>No games selected.</p>";
    return;
  }

  const filter = listSearchInput.value.trim().toLowerCase();
  let filteredGames = selectedGames;

  if (filter) {
    filteredGames = new Map(
      [...selectedGames.entries()].filter(([name]) => name.toLowerCase().includes(filter))
    );
  }
  
  const items = [...filteredGames.values()].map((g) => {
  const name = escapeHtml(g.game_name);
  const intrigueVal = (g.intrigue ?? 0);

  return `
      <div class="selected-item" style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px;border-bottom:1px solid #eee;">
        <span>${name}</span>

        <div style="display:flex;align-items:center;gap:8px;">
          <input
            class="intrigue-edit"
            type="number"
            min="0"
            max="10"
            step="1"
            value="${intrigueVal}"
            data-name="${name}"
            style="width:64px;padding:6px;border:1px solid #ddd;border-radius:8px;"
            title="Intrigue out of 10"
          />
          <button class="remove-btn" data-name="${name}">Remove</button>
        </div>
      </div>
    `;
  }).join("");
  
  selectedListDiv.innerHTML = items;

  selectedListDiv.querySelectorAll(".remove-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const name = btn.getAttribute("data-name");
      removeSelected(name);
      renderResults(lastSearchResults);
    });
  });

  // Intrigue edit handlers
  selectedListDiv.querySelectorAll(".intrigue-edit").forEach((inp) => {
  const name = inp.getAttribute("data-name");

  const applyClamp = () => {
    const entry = selectedGames.get(name);
    if (!entry) return;

    const clamped = clampIntrigue(inp.value); // your clamp 0..10
    inp.value = clamped;                      // force UI to match
    entry.intrigue = clamped;
    selectedGames.set(name, entry);
  };

    inp.addEventListener("input", applyClamp); // clamps as they type
    inp.addEventListener("blur", applyClamp);  // clamps when they leave box
  });
}

function clampIntrigue(x) {
  const n = Number(x);
  if (Number.isNaN(n)) return 1;
  return Math.min(10, Math.max(1, Math.round(n)));
}

function removeSelected(name) {
  selectedGames.delete(name);
  refresh();
}

function refresh(){
  renderSelectedList();
  renderResults(lastSearchResults);
}

function toggleSelected(game) {
  if (selectedGames.has(game.game_name)) {
    removeSelected(game.game_name);
    return;
  }

  openIntrigueModal(game);
}

function openIntrigueModal(game) {
  pendingGame = game;

  modalTitle.textContent = `Intrigue rating: ${game.game_name}`;

  // reset rating each time the modal opens
  pendingIntrigue = null;
  paintStars(0);

  intrigueModal.classList.remove("hidden");
}


function closeIntrigueModal() {
  pendingGame = null;
  pendingIntrigue = null;
  intrigueModal.classList.add("hidden");
}


function buildStars() {
  starRating.innerHTML = "";
  for (let i = 1; i <= 10; i++) {
    const s = document.createElement("span");
    s.className = "star empty";
    s.textContent = "★";
    s.setAttribute("data-value", String(i));
    s.setAttribute("role", "radio");
    s.setAttribute("aria-checked", "false");
    starRating.appendChild(s);
  }
}

function paintStars(value) {
  const stars = starRating.querySelectorAll(".star");
  stars.forEach((s) => {
    const v = Number(s.getAttribute("data-value"));
    const filled = v <= value;
    s.classList.toggle("filled", filled);
    s.classList.toggle("empty", !filled);
    s.setAttribute("aria-checked", filled ? "true" : "false");
  });

  if (value) ratingValue.textContent = `${value}/10`;
  else ratingValue.textContent = "Pick a rating";
}

// Hover preview
starRating.addEventListener("mousemove", (e) => {
  const star = e.target.closest(".star");
  if (!star) return;
  const v = Number(star.getAttribute("data-value"));
  paintStars(v);
});

// When leaving the star row, revert to selected value
starRating.addEventListener("mouseleave", () => {
  paintStars(pendingIntrigue || 0);
});

// Click to select
starRating.addEventListener("click", (e) => {
  const star = e.target.closest(".star");
  if (!star || !pendingGame) return;

  const value = Number(star.getAttribute("data-value"));

  // Save immediately
  selectedGames.set(pendingGame.game_name, {
    ...pendingGame,
    intrigue: value
  });

  closeIntrigueModal();
  renderSelectedList();
  renderResults(lastSearchResults);
});

// Close modal if clicking outside the content
intrigueModal.addEventListener("click", (e) => {
  if (e.target === intrigueModal) closeIntrigueModal();
});

function buildExportPayload() {
  return [...selectedGames.values()].map(g => ({
    game_name: g.game_name,
    intrigue: g.intrigue ?? "",
    owned: !!g.owned,
    main_extra: g.main_extra ?? ""
  }));
}

async function exportToExcel() {
  if (selectedGames.size === 0) {
    alert("No games selected to export.");
    return;
  }

  const payload = { games: buildExportPayload() };

  const resp = await fetch("/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!resp.ok) {
    const msg = await resp.text();
    alert("Export failed: " + msg);
    return;
  }

  // Download the returned .xlsx
  const blob = await resp.blob();
  const url = window.URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "games_backlog.xlsx";
  document.body.appendChild(a);
  a.click();
  a.remove();

  window.URL.revokeObjectURL(url);
}

buildStars(); // Build rating stars on load

exportBtn.addEventListener("click", exportToExcel);

searchBtn.addEventListener("click", doSearch);
searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") doSearch();
});
listSearchInput.addEventListener("input", renderSelectedList);
