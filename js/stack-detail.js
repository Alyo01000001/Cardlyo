// ============================================================
// CARDLYO - STACK & LIBRARY DETAIL VIEWS
// ============================================================
let currentLibraryId = null;
let activeStackDetailId = null;
let stackSearchQuery = "";
let stackStatusFilter = "all";
let activeTagFilter = null;

// ============================================================
// LIBRARY DETAIL VIEW
// ============================================================
function openLibraryDetail(libraryId) {
  const library = state.libraries.find(l => l.id === libraryId);
  if (!library) { currentLibraryId = null; return renderApp(); }
  currentLibraryId = libraryId;
  activeStackDetailId = null;

  const root = document.getElementById("app-root");
  root.innerHTML = "";

  const back = document.createElement("button");
  back.className = "btn btn-sm stack-view-back";
  back.textContent = t("backToDashboard");
  back.onclick = () => renderApp();
  root.appendChild(back);

  const header = document.createElement("div");
  header.className = "stack-view-header";
  header.innerHTML = `
    <div style="flex:1; min-width:0;">
      <div class="editable-meta-wrap">
        <h1 class="section-title">${escapeHtml(library.title)}</h1>
        <button type="button" class="meta-edit-toggle" onclick="openEditLibraryModal('${escapeHtml(library.id)}')" title="Edit library">✎</button>
      </div>
      <p class="stack-view-description">${escapeHtml(getLibraryDescription(library))}</p>
    </div>
  `;
  root.appendChild(header);

  const actions = document.createElement("div");
  actions.className = "stack-view-actions";
  actions.innerHTML = `
    <button class="btn btn-sm btn-primary" onclick="openAddStackModal('${escapeHtml(library.id)}')">+ ${t("addStack")}</button>
    <button class="btn btn-sm btn-danger" onclick="deleteLibrary('${escapeHtml(library.id)}')">${t("delete")} Library</button>
  `;
  root.appendChild(actions);

  const childStacks = state.stacks.filter(s => s.libraryId === library.id);
  if (childStacks.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML = `<h3>${t("noStacksTitle")}</h3><p>${t("noStacksDesc")}</p>`;
    root.appendChild(empty);
    return;
  }

  const grid = document.createElement("div");
  grid.className = "dashboard-grid";
  childStacks.forEach(stack => grid.appendChild(buildDashboardStackCard(stack)));
  root.appendChild(grid);
}

function openAddLibraryModal() {
  showModal(t("newLibrary"), `
    <label for="new-library-title">Library Title</label>
    <input type="text" id="new-library-title" placeholder="e.g., Languages" value="" />
    <label for="new-library-description">Description</label>
    <textarea id="new-library-description" rows="3" placeholder="What kind of stacks live here?"></textarea>
    <div class="btn-row">
      <button class="btn" type="button" onclick="closeModal()">${t("cancel")}</button>
      <button class="btn btn-primary" type="button" onclick="createLibrary()">${t("create")}</button>
    </div>
  `);
}

function createLibrary() {
  const titleInput = document.getElementById("new-library-title");
  const descInput = document.getElementById("new-library-description");
  const title = titleInput ? titleInput.value.trim() : "";
  const description = descInput ? descInput.value.trim() : "";
  if (!title) {
    showAlert("Please enter a library title.");
    return;
  }
  state.libraries.push({ id: generateId("lib"), title, description });
  persistState();
  closeModal();
  renderApp();
}

function openEditLibraryModal(libraryId) {
  const library = state.libraries.find(l => l.id === libraryId);
  if (!library) return;
  showModal("Edit Library", `
    <input type="hidden" id="edit-library-id" value="${escapeHtml(libraryId)}" />
    <label for="edit-library-title">Library Title</label>
    <input type="text" id="edit-library-title" value="${escapeHtml(library.title)}" />
    <label for="edit-library-description">Description</label>
    <textarea id="edit-library-description" rows="3">${escapeHtml(library.description || "")}</textarea>
    <div class="btn-row">
      <button class="btn" type="button" onclick="closeModal()">${t("cancel")}</button>
      <button class="btn btn-primary" type="button" onclick="saveLibraryEdit()">✓ ${t("save")}</button>
    </div>
  `);
}

function saveLibraryEdit() {
  const libraryId = document.getElementById("edit-library-id").value;
  const titleInput = document.getElementById("edit-library-title");
  const descInput = document.getElementById("edit-library-description");
  const library = state.libraries.find(l => l.id === libraryId);
  if (!library) { closeModal(); return; }

  const newTitle = titleInput ? titleInput.value.trim() : "";
  if (!newTitle) {
    showAlert("Library title cannot be empty.");
    return;
  }
  library.title = newTitle;
  library.description = descInput ? descInput.value.trim() : "";

  persistState();
  closeModal();
  if (currentLibraryId === libraryId) openLibraryDetail(libraryId);
  else renderApp();
}

function deleteLibrary(libraryId) {
  if (!confirm("Delete this library? Its stacks will move back to the main dashboard.")) return;
  state.stacks.forEach(stack => {
    if (stack.libraryId === libraryId) stack.libraryId = null;
  });
  state.libraries = state.libraries.filter(l => l.id !== libraryId);
  persistState();
  currentLibraryId = null;
  renderApp();
}

// ============================================================
// STACK DETAIL VIEW
// ============================================================
function openStackDetail(stackId) {
  activeStackDetailId = stackId;
  const root = document.getElementById("app-root");
  root.innerHTML = "";
  const stack = state.stacks.find(s => s.id === stackId);
  if (!stack) return renderApp();

  const back = document.createElement("button");
  back.className = "btn btn-sm stack-view-back";
  back.textContent = currentLibraryId ? t("backToLibrary") : t("backToDashboard");
  back.onclick = () => {
    if (currentLibraryId) openLibraryDetail(currentLibraryId);
    else renderApp();
  };
  root.appendChild(back);

  // Header with Title + ✎ (Modal Edit) + 💾 (Export) + 🔗 (Share) + 🗑️ (Delete)
  const header = document.createElement("div");
  header.className = "stack-view-header";
  header.innerHTML = `
    <div style="flex:1; min-width:0;">
      <div class="editable-meta-wrap">
        <h1 class="section-title" id="stack-title-display">${escapeHtml(stack.title)}</h1>
        <div class="stack-header-tools">
          <button type="button" class="meta-edit-toggle" onclick="openEditStackModal('${escapeHtml(stack.id)}')" title="${t("editStack")}">✎</button>
          <button type="button" class="btn btn-sm" onclick="openExportStackModal('${escapeHtml(stack.id)}')" title="${t("exportStack")}">💾 ${t("exportStack")}</button>
          <button type="button" class="btn btn-sm" onclick="shareStackLink('${escapeHtml(stack.id)}')" title="${t("shareStack")}">🔗 ${t("shareStack")}</button>
          <button type="button" class="btn btn-sm btn-danger" onclick="deleteStack('${escapeHtml(stack.id)}')" title="${t("deleteStack")}">🗑️</button>
        </div>
      </div>
      <p class="stack-view-description" id="stack-desc-display">${escapeHtml(getStackDescription(stack))}</p>
    </div>
    <div class="stack-card-count">${stack.cards.length} ${t("cardsCount")}</div>
  `;
  root.appendChild(header);

  // Stat boxes
  const correctCount = stack.correctBox.length;
  const wrongCount = stack.wrongBox.length;
  const stats = document.createElement("div");
  stats.className = "stat-boxes";
  stats.innerHTML = `
    <div class="stat-box stat-box-correct">
      <span class="stat-box-label">${t("correctCards")}</span>
      <span class="stat-box-value">${correctCount}</span>
    </div>
    <button type="button"
            class="stat-box stat-box-wrong${wrongCount === 0 ? " is-disabled" : ""}"
            ${wrongCount === 0 ? 'disabled aria-disabled="true"' : ""}
            onclick="openWrongBoxReview('${escapeHtml(stack.id)}')"
            aria-label="${t("wrongCards")}: ${wrongCount}">
      <span class="stat-box-label">${t("wrongCards")}</span>
      <span class="stat-box-value">${wrongCount}</span>
      <span class="stat-box-hint">${t("clickToReview")}</span>
    </button>
  `;
  root.appendChild(stats);

  // Action Buttons (Add Card, Start Test, Start Flashcards, Start Typing)
  const actions = document.createElement("div");
  actions.className = "stack-view-actions";
  actions.innerHTML = `
    <button class="btn btn-sm btn-primary" onclick="openAddCardModal('${escapeHtml(stack.id)}')">${t("addCard")}</button>
    <button class="btn btn-sm" onclick="openTestConfigModal('${escapeHtml(stack.id)}')">📝 ${t("startTest")}</button>
    <button class="btn btn-sm" onclick="openFlashcardOrderModal('${escapeHtml(stack.id)}')">🗂️ ${t("startFlashcards")}</button>
    <button class="btn btn-sm" onclick="openTypingConfigModal('${escapeHtml(stack.id)}')">✍️ ${t("startTyping")}</button>
  `;
  root.appendChild(actions);

  // Tag Chips
  const allTags = [...new Set(stack.cards.flatMap(c => Array.isArray(c.tags) ? c.tags : []))].filter(Boolean);
  if (allTags.length > 0) {
    const tagChipsWrap = document.createElement("div");
    tagChipsWrap.className = "tag-chips-wrap";
    tagChipsWrap.innerHTML = `
      <button type="button" class="tag-chip ${activeTagFilter === null ? 'active' : ''}" onclick="setTagFilter(null)">${t("allTags")}</button>
      ${allTags.map(tag => `
        <button type="button" class="tag-chip ${activeTagFilter === tag ? 'active' : ''}" onclick="setTagFilter('${escapeHtml(tag)}')">#${escapeHtml(tag)}</button>
      `).join("")}
    `;
    root.appendChild(tagChipsWrap);
  }

  // Search & Filter row for cards
  const filterBar = document.createElement("div");
  filterBar.className = "search-filter-bar";
  filterBar.innerHTML = `
    <div class="search-input-wrap">
      <span class="search-icon" aria-hidden="true">🔍</span>
      <input type="text" id="stack-card-search" placeholder="${escapeHtml(t("searchCardsPlaceholder"))}" value="${escapeHtml(stackSearchQuery)}" />
    </div>
    <select class="filter-select" id="stack-status-filter" aria-label="Filter cards by status">
      <option value="all" ${stackStatusFilter === 'all' ? 'selected' : ''}>${t("filterAll")}</option>
      <option value="correct" ${stackStatusFilter === 'correct' ? 'selected' : ''}>${t("filterCorrect")}</option>
      <option value="wrong" ${stackStatusFilter === 'wrong' ? 'selected' : ''}>${t("filterWrong")}</option>
      <option value="untested" ${stackStatusFilter === 'untested' ? 'selected' : ''}>${t("filterUntested")}</option>
    </select>
  `;
  root.appendChild(filterBar);

  const tableWrap = document.createElement("div");
  tableWrap.className = "cards-table-wrap";
  root.appendChild(tableWrap);

  const searchInput = filterBar.querySelector("#stack-card-search");
  const filterSelect = filterBar.querySelector("#stack-status-filter");

  searchInput.addEventListener("input", (e) => {
    stackSearchQuery = e.target.value;
    renderCardsTable(stack, tableWrap);
  });
  filterSelect.addEventListener("change", (e) => {
    stackStatusFilter = e.target.value;
    renderCardsTable(stack, tableWrap);
  });

  renderCardsTable(stack, tableWrap);
}

function setTagFilter(tag) {
  activeTagFilter = tag;
  if (activeStackDetailId) openStackDetail(activeStackDetailId);
}

function renderCardsTable(stack, tableWrap) {
  const query = stackSearchQuery.trim().toLowerCase();

  const filteredCards = stack.cards.filter(c => {
    const inCorrect = stack.correctBox.includes(c.id);
    const inWrong = stack.wrongBox.includes(c.id);

    if (stackStatusFilter === "correct" && !inCorrect) return false;
    if (stackStatusFilter === "wrong" && !inWrong) return false;
    if (stackStatusFilter === "untested" && (inCorrect || inWrong)) return false;

    if (activeTagFilter && (!Array.isArray(c.tags) || !c.tags.includes(activeTagFilter))) {
      return false;
    }

    if (query) {
      const tagsStr = (c.tags || []).join(" ").toLowerCase();
      return c.q.toLowerCase().includes(query) || c.a.toLowerCase().includes(query) || tagsStr.includes(query);
    }
    return true;
  });

  tableWrap.innerHTML = `
    <table class="cards-table" aria-label="Cards table">
      <thead>
        <tr>
          <th scope="col">${t("front")}</th>
          <th scope="col">${t("back")}</th>
          <th scope="col">${t("status")}</th>
          <th scope="col">${t("action")}</th>
        </tr>
      </thead>
      <tbody>
        ${filteredCards.map(c => {
          const inCorrect = stack.correctBox.includes(c.id);
          const inWrong = stack.wrongBox.includes(c.id);
          let status = t("filterUntested");
          let statusClass = "";
          if (inCorrect) { status = t("filterCorrect"); statusClass = "success"; }
          else if (inWrong) { status = t("filterWrong"); statusClass = "danger"; }
          
          const tagsHtml = (c.tags || []).map(tg => `<span class="card-tag-badge">#${escapeHtml(tg)}</span>`).join("");
          const imgQHtml = c.imgQ ? `<img src="${escapeHtml(c.imgQ)}" class="card-img-preview" alt="Front image" />` : "";
          const imgAHtml = c.imgA ? `<img src="${escapeHtml(c.imgA)}" class="card-img-preview" alt="Back image" />` : "";

          return `
            <tr>
              <td>
                <div class="table-cell-text">
                  ${imgQHtml}
                  <div>${renderMarkdown(c.q)}</div>
                  ${tagsHtml ? `<div>${tagsHtml}</div>` : ""}
                </div>
              </td>
              <td>
                <div class="table-cell-text">
                  ${imgAHtml}
                  <div>${renderMarkdown(c.a)}</div>
                </div>
              </td>
              <td><span class="meta-badge ${statusClass}">${status}</span></td>
              <td>
                <button class="btn btn-sm" onclick="openManageCardModal('${escapeHtml(stack.id)}', '${escapeHtml(c.id)}')" aria-label="Edit card">${t("edit")}</button>
              </td>
            </tr>
          `;
        }).join("") || `<tr><td colspan="4" style="text-align:center; color:var(--fg-muted);">${stack.cards.length === 0 ? t("noCardsYet") : t("noMatchingCards")}</td></tr>`}
      </tbody>
    </table>
  `;
}

function openAddStackModal(libraryId = null) {
  showModal(t("addStack"), `
    <input type="hidden" id="new-stack-library-id" value="${escapeHtml(libraryId || "")}" />
    <label for="new-stack-title">Stack Title</label>
    <input type="text" id="new-stack-title" placeholder="e.g., Spanish Vocabulary" value="" />
    
    <label for="new-stack-description">Description</label>
    <textarea id="new-stack-description" rows="3" placeholder="What will you study in this stack?"></textarea>

    <div class="btn-row">
      <button class="btn" onclick="closeModal()">${t("cancel")}</button>
      <button class="btn btn-primary" onclick="createStack()">${t("create")}</button>
    </div>
  `);
}

function createStack() {
  const input = document.getElementById("new-stack-title");
  const descriptionInput = document.getElementById("new-stack-description");
  const libraryIdInput = document.getElementById("new-stack-library-id");

  const title = input ? input.value.trim() : "";
  const description = descriptionInput ? descriptionInput.value.trim() : "";
  const libraryId = libraryIdInput && libraryIdInput.value ? libraryIdInput.value : null;
  if (!title) {
    showAlert("Please enter a stack title.");
    return;
  }
  const newStack = {
    id: generateId("stack"),
    title,
    description,
    libraryId,
    cards: [],
    correctBox: [],
    wrongBox: []
  };
  state.stacks.push(newStack);
  closeModal();
  persistState();
  if (libraryId) openLibraryDetail(libraryId);
  else openStackDetail(newStack.id);
}

function openEditStackModal(stackId) {
  const stack = state.stacks.find(s => s.id === stackId);
  if (!stack) return;

  showModal(t("editStack"), `
    <input type="hidden" id="edit-stack-id" value="${escapeHtml(stackId)}" />
    
    <label for="edit-stack-title">Stack Title</label>
    <input type="text" id="edit-stack-title" value="${escapeHtml(stack.title)}" />
    
    <label for="edit-stack-description">Description</label>
    <textarea id="edit-stack-description" rows="3">${escapeHtml(stack.description || "")}</textarea>

    <div class="btn-row">
      <button class="btn" type="button" onclick="closeModal()">${t("cancel")}</button>
      <button class="btn btn-primary" type="button" onclick="saveStackEdit()">✓ ${t("save")}</button>
    </div>
  `);
}

function saveStackEdit() {
  const stackId = document.getElementById("edit-stack-id").value;
  const titleInput = document.getElementById("edit-stack-title");
  const descInput = document.getElementById("edit-stack-description");

  const stack = state.stacks.find(s => s.id === stackId);
  if (!stack) { closeModal(); return; }

  const newTitle = titleInput ? titleInput.value.trim() : "";
  if (!newTitle) {
    showAlert("Stack title cannot be empty.");
    return;
  }

  stack.title = newTitle;
  stack.description = descInput ? descInput.value.trim() : "";

  persistState();
  closeModal();
  openStackDetail(stackId);
  showToast(t("cardUpdated"));
}

function duplicateStack(stackId) {
  const source = state.stacks.find(s => s.id === stackId);
  if (!source) return;

  const copyTitle = `${source.title} (${currentLang === 'tr' ? 'Kopya' : 'Copy'})`;
  const clonedCards = source.cards.map(c => ({
    id: generateId("c"),
    q: c.q,
    a: c.a,
    imgQ: c.imgQ || "",
    imgA: c.imgA || "",
    tags: Array.isArray(c.tags) ? [...c.tags] : []
  }));

  const clonedStack = {
    id: generateId("stack"),
    title: copyTitle,
    description: source.description || "",
    libraryId: source.libraryId || null,
    cards: clonedCards,
    correctBox: [],
    wrongBox: []
  };

  state.stacks.push(clonedStack);
  persistState();
  showToast(t("stackDuplicated"));

  if (currentLibraryId) openLibraryDetail(currentLibraryId);
  else if (activeStackDetailId) openStackDetail(clonedStack.id);
  else renderApp();
}

function deleteStack(stackId) {
  if (!confirm("Delete this stack and all its cards?")) return;
  const stack = state.stacks.find(s => s.id === stackId);
  const parentLibraryId = stack ? stack.libraryId : null;
  state.stacks = state.stacks.filter(s => s.id !== stackId);
  persistState();
  if (parentLibraryId) openLibraryDetail(parentLibraryId);
  else renderApp();
}

function openExportStackModal(stackId) {
  const stack = state.stacks.find(s => s.id === stackId);
  if (!stack) return;

  showModal(t("exportStack"), `
    <p style="color:var(--fg-muted); margin-bottom:1.25rem; line-height:1.5;">
      ${escapeHtml(stack.title)} (${stack.cards.length} ${t("cardsCount")})
    </p>
    <div style="display:grid; gap:0.75rem;">
      <button class="btn btn-primary" type="button" onclick="exportStack('${escapeHtml(stackId)}'); closeModal();" style="justify-content:flex-start;">
        💾 <strong>JSON Format</strong> — ${currentLang === 'tr' ? 'Tam yedekleme ve Leitner kutusu durumu' : 'Full backup & Leitner progress'}
      </button>
      <button class="btn" type="button" onclick="exportStackCsv('${escapeHtml(stackId)}'); closeModal();" style="justify-content:flex-start;">
        📄 <strong>CSV Format</strong> — ${currentLang === 'tr' ? 'Excel, Google E-Tablolar ve Anki için' : 'For Excel, Google Sheets & Anki'}
      </button>
      <button class="btn" type="button" onclick="closeModal()">${t("cancel")}</button>
    </div>
  `);
}

function openStackOptionsMenu(stackId) {
  const stack = state.stacks.find(s => s.id === stackId);
  if (!stack) return;
  const isGrouped = !!stack.libraryId;

  showModal("Stack Options", `
    <div style="display:grid; gap:0.6rem;">
      <button class="btn" type="button" style="justify-content:flex-start;" onclick="duplicateStack('${escapeHtml(stackId)}'); closeModal();">📋 ${t("duplicateStack")}</button>
      <button class="btn" type="button" style="justify-content:flex-start;" onclick="openExportStackModal('${escapeHtml(stackId)}')">💾 ${t("exportStack")}</button>
      <button class="btn" type="button" style="justify-content:flex-start;" onclick="shareStackLink('${escapeHtml(stackId)}'); closeModal();">🔗 ${t("shareStack")}</button>
      <button class="btn" type="button" style="justify-content:flex-start;" onclick="openMoveToLibraryPicker('${escapeHtml(stackId)}')">🗂️ Move to Library</button>
      ${isGrouped ? `<button class="btn" type="button" style="justify-content:flex-start;" onclick="removeStackFromLibrary('${escapeHtml(stackId)}')">↩ Remove from Library</button>` : ""}
      <button class="btn btn-danger" type="button" style="justify-content:flex-start;" onclick="deleteStack('${escapeHtml(stackId)}'); closeModal();">🗑️ ${t("deleteStack")}</button>
      <button class="btn" type="button" onclick="closeModal()">${t("cancel")}</button>
    </div>
  `);
}

function openMoveToLibraryPicker(stackId) {
  const libraries = state.libraries;
  if (libraries.length === 0) {
    showModal("Move to Library", `
      <p style="color:var(--fg-muted); margin-bottom:1.1rem;">You don't have any libraries yet.</p>
      <div class="btn-row">
        <button class="btn" type="button" onclick="closeModal()">${t("cancel")}</button>
        <button class="btn btn-primary" type="button" onclick="closeModal(); openAddLibraryModal();">${t("newLibrary")}</button>
      </div>
    `);
    return;
  }

  const options = libraries.map(library => `
    <button class="btn" type="button" style="justify-content:flex-start;" onclick="moveStackToLibrary('${escapeHtml(stackId)}', '${escapeHtml(library.id)}')">🗂️ ${escapeHtml(library.title)}</button>
  `).join("");

  showModal("Move to Library", `
    <div style="display:grid; gap:0.5rem; max-height:260px; overflow-y:auto; margin-bottom:0.9rem;">${options}</div>
    <div class="btn-row"><button class="btn" type="button" onclick="closeModal()">${t("cancel")}</button></div>
  `);
}

function moveStackToLibrary(stackId, libraryId) {
  const stack = state.stacks.find(s => s.id === stackId);
  if (!stack) return;
  stack.libraryId = libraryId;
  persistState();
  closeModal();
  showToast(t("stackMoved"));
  if (currentLibraryId) openLibraryDetail(currentLibraryId); else renderApp();
}

function removeStackFromLibrary(stackId) {
  const stack = state.stacks.find(s => s.id === stackId);
  if (!stack) return;
  stack.libraryId = null;
  persistState();
  closeModal();
  showToast(t("stackRemoved"));
  if (currentLibraryId) openLibraryDetail(currentLibraryId); else renderApp();
}

// Leitner stats & routing
function routeCardToLeitner(stack, cardId, isCorrect) {
  stack.correctBox = stack.correctBox.filter(id => id !== cardId);
  stack.wrongBox = stack.wrongBox.filter(id => id !== cardId);
  if (isCorrect) stack.correctBox.push(cardId);
  else stack.wrongBox.push(cardId);
  persistState();
}

function getReviewPool(stack, source) {
  let pool = stack.cards.slice();
  if (source === "wrong") pool = pool.filter(c => stack.wrongBox.includes(c.id));
  if (activeTagFilter) {
    pool = pool.filter(c => Array.isArray(c.tags) && c.tags.includes(activeTagFilter));
  }
  return pool;
}

function shuffleCards(cards) {
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

function openWrongBoxReview(stackId) {
  const stack = state.stacks.find(s => s.id === stackId);
  if (!stack || stack.wrongBox.length === 0) return;

  if (stack.wrongBox.length === 1) {
    openFlashcardOrderModal(stackId, "wrong");
    return;
  }

  showModal(t("reviewWrongCards"), `
    <p style="color:var(--fg-muted); line-height:1.55; margin-bottom:1.25rem;">
      ${stack.wrongBox.length} ${t("wrongCards").toLowerCase()}
    </p>
    <div style="display:grid; gap:0.7rem;">
      <button class="btn btn-primary" type="button" onclick="openTestConfigModal('${escapeHtml(stackId)}', 'wrong')">${t("testMode")}</button>
      <button class="btn" type="button" onclick="openFlashcardOrderModal('${escapeHtml(stackId)}', 'wrong')">${t("flashcardMode")}</button>
      <button class="btn" type="button" onclick="openTypingConfigModal('${escapeHtml(stackId)}', 'wrong')">${t("typingMode")}</button>
      <button class="btn" type="button" onclick="closeModal()">${t("cancel")}</button>
    </div>
  `);
}
