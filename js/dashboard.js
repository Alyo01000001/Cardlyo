// ============================================================
// CARDLYO - DASHBOARD & GRIDS
// ============================================================
let dashboardSearchQuery = "";
let draggedStackId = null;

function getStackDescription(stack) {
  return (typeof stack.description === "string" && stack.description.trim()) ? stack.description.trim() : t("noDescription");
}

function getLibraryDescription(library) {
  return (typeof library.description === "string" && library.description.trim()) ? library.description.trim() : t("noDescription");
}

function buildDashboardStackCard(stack) {
  const card = document.createElement("div");
  card.className = "dashboard-stack";
  card.draggable = true;
  card.dataset.stackId = stack.id;
  card.setAttribute("aria-label", `Stack: ${stack.title}`);

  card.innerHTML = `
    <div class="dashboard-stack-open" role="button" tabindex="0" aria-label="Open stack: ${escapeHtml(stack.title)}">
      <span class="dashboard-stack-title">${escapeHtml(stack.title)}</span>
      <span class="dashboard-stack-description">${escapeHtml(getStackDescription(stack))}</span>
      <span class="dashboard-stack-badge">${stack.cards.length} ${t("cardsCount")}</span>
    </div>
    <button type="button" class="stack-kebab" aria-label="Options for ${escapeHtml(stack.title)}" title="Stack options">⋮</button>
  `;

  const openArea = card.querySelector(".dashboard-stack-open");
  openArea.addEventListener("click", () => openStackDetail(stack.id));
  openArea.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openStackDetail(stack.id);
    }
  });

  card.querySelector(".stack-kebab").addEventListener("click", (event) => {
    event.stopPropagation();
    openStackOptionsMenu(stack.id);
  });

  card.addEventListener("dragstart", handleStackDragStart);
  card.addEventListener("dragend", handleStackDragEnd);

  return card;
}

function buildLibraryCard(library) {
  const stackCount = state.stacks.filter(s => s.libraryId === library.id).length;
  const card = document.createElement("div");
  card.className = "library-box";
  card.dataset.libraryId = library.id;

  const stackUnit = currentLang === 'tr' ? 'deste' : (stackCount === 1 ? 'stack' : 'stacks');

  card.innerHTML = `
    <div class="library-open" role="button" tabindex="0" aria-label="Open library: ${escapeHtml(library.title)}">
      <span class="library-icon" aria-hidden="true">📚</span>
      <span class="library-text">
        <span class="library-title">${escapeHtml(library.title)}</span>
        <span class="library-description">${escapeHtml(getLibraryDescription(library))}</span>
        <span class="library-stack-count">${stackCount} ${stackUnit}</span>
      </span>
    </div>
  `;

  const openArea = card.querySelector(".library-open");
  openArea.addEventListener("click", () => openLibraryDetail(library.id));
  openArea.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openLibraryDetail(library.id);
    }
  });

  card.addEventListener("dragover", handleLibraryDragOver);
  card.addEventListener("dragleave", handleLibraryDragLeave);
  card.addEventListener("drop", (event) => handleLibraryDrop(event, library.id));

  return card;
}

function renderDashboard(container) {
  const searchRow = document.createElement("div");
  searchRow.className = "search-filter-bar";
  searchRow.innerHTML = `
    <div class="search-input-wrap">
      <span class="search-icon" aria-hidden="true">🔍</span>
      <input type="text" id="dashboard-search" placeholder="${escapeHtml(t("searchPlaceholder"))}" value="${escapeHtml(dashboardSearchQuery)}" />
    </div>
  `;
  container.appendChild(searchRow);

  const searchInput = searchRow.querySelector("#dashboard-search");
  searchInput.addEventListener("input", (e) => {
    dashboardSearchQuery = e.target.value;
    refreshDashboardGrids(container);
  });

  const contentWrap = document.createElement("div");
  contentWrap.id = "dashboard-content-wrap";
  container.appendChild(contentWrap);

  refreshDashboardGrids(container);
}

function refreshDashboardGrids(container) {
  const contentWrap = container.querySelector("#dashboard-content-wrap") || container;
  contentWrap.innerHTML = "";

  const query = dashboardSearchQuery.trim().toLowerCase();

  const libraries = state.libraries.filter(l => {
    if (!query) return true;
    return l.title.toLowerCase().includes(query) || (l.description && l.description.toLowerCase().includes(query));
  });

  const ungroupedStacks = state.stacks.filter(s => {
    if (s.libraryId) return false;
    if (!query) return true;
    return s.title.toLowerCase().includes(query) || (s.description && s.description.toLowerCase().includes(query));
  });

  // Libraries Section
  const libHeader = document.createElement("div");
  libHeader.className = "section-header";
  libHeader.innerHTML = `
    <div class="section-heading">
      <div class="section-heading-row">
        <h1 class="section-title">${t("libraries")}</h1>
        <button class="btn btn-sm btn-primary" onclick="openAddLibraryModal()">${t("newLibrary")}</button>
      </div>
    </div>
  `;
  contentWrap.appendChild(libHeader);

  if (libraries.length === 0) {
    const emptyLib = document.createElement("div");
    emptyLib.className = "empty-state";
    emptyLib.innerHTML = `<p>${query ? t("noMatchingCards") : t("noLibraries")}</p>`;
    contentWrap.appendChild(emptyLib);
  } else {
    const libGrid = document.createElement("div");
    libGrid.className = "library-grid";
    libraries.forEach(library => libGrid.appendChild(buildLibraryCard(library)));
    contentWrap.appendChild(libGrid);
  }

  // Ungrouped Stacks Section
  const stackHeader = document.createElement("div");
  stackHeader.className = "section-header";
  stackHeader.style.marginTop = "2rem";
  stackHeader.innerHTML = `
    <div class="section-heading">
      <div class="section-heading-row">
        <h1 class="section-title">${t("stacks")}</h1>
        <button class="btn btn-sm btn-primary" onclick="openAddStackModal()">${t("addStack")}</button>
      </div>
    </div>
  `;
  contentWrap.appendChild(stackHeader);

  if (ungroupedStacks.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML = `
      <h3>${query ? t("noMatchingCards") : t("noStacksTitle")}</h3>
      <p>${query ? "" : t("noStacksDesc")}</p>
      ${!query ? `<button class="btn btn-primary" onclick="openAddStackModal()" style="margin-top:1rem;">${t("createStackBtn")}</button>` : ""}
    `;
    contentWrap.appendChild(empty);
  } else {
    const grid = document.createElement("div");
    grid.className = "dashboard-grid";
    ungroupedStacks.forEach(stack => grid.appendChild(buildDashboardStackCard(stack)));
    contentWrap.appendChild(grid);
  }
}

// Drag & Drop
function handleStackDragStart(event) {
  draggedStackId = event.currentTarget.dataset.stackId;
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", draggedStackId);
  event.currentTarget.classList.add("dragging");
}
function handleStackDragEnd(event) {
  event.currentTarget.classList.remove("dragging");
  draggedStackId = null;
  document.querySelectorAll(".library-box.drag-over").forEach(el => el.classList.remove("drag-over"));
}
function handleLibraryDragOver(event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  event.currentTarget.classList.add("drag-over");
}
function handleLibraryDragLeave(event) {
  event.currentTarget.classList.remove("drag-over");
}
function handleLibraryDrop(event, libraryId) {
  event.preventDefault();
  event.currentTarget.classList.remove("drag-over");
  const stackId = event.dataTransfer.getData("text/plain") || draggedStackId;
  if (!stackId) return;
  const stack = state.stacks.find(s => s.id === stackId);
  if (!stack) return;
  stack.libraryId = libraryId;
  persistState();
  showToast(t("stackMoved"));
  renderApp();
}

function resetHome() {
  dashboardSearchQuery = "";
  activeTagFilter = null;
  renderApp();
}
