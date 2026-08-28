// ============================================================
// CARDLYO - CARD CREATION, BULK / CSV & LEXIREAD SMART PASTE
// ============================================================
let newCardImgQ = "";
let newCardImgA = "";
let editCardImgQ = "";
let editCardImgA = "";
let parsedCsvCards = [];

// Image compression & resizing helper for local files
function processImageFile(file, maxWidth = 800, maxHeight = 800, quality = 0.82) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      return reject(new Error('Selected file is not an image'));
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          if (width / maxWidth > height / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

function handleImgUrlChange(target, value) {
  const url = value.trim();
  if (target === 'add-q') newCardImgQ = url;
  else if (target === 'add-a') newCardImgA = url;
  else if (target === 'edit-q') editCardImgQ = url;
  else if (target === 'edit-a') editCardImgA = url;
  renderImgPreview(target);
}

async function handleImgFileSelected(target, input) {
  const file = input.files && input.files[0];
  if (!file) return;
  try {
    const compressed = await processImageFile(file);
    if (target === 'add-q') {
      newCardImgQ = compressed;
      const urlInput = document.getElementById('new-card-img-q-url');
      if (urlInput) urlInput.value = '';
    } else if (target === 'add-a') {
      newCardImgA = compressed;
      const urlInput = document.getElementById('new-card-img-a-url');
      if (urlInput) urlInput.value = '';
    } else if (target === 'edit-q') {
      editCardImgQ = compressed;
      const urlInput = document.getElementById('edit-card-img-q-url');
      if (urlInput) urlInput.value = '';
    } else if (target === 'edit-a') {
      editCardImgA = compressed;
      const urlInput = document.getElementById('edit-card-img-a-url');
      if (urlInput) urlInput.value = '';
    }
    renderImgPreview(target);
  } catch (err) {
    showAlert("Failed to process image: " + err.message);
  }
}

function clearCardImg(target) {
  if (target === 'add-q') {
    newCardImgQ = '';
    const urlInput = document.getElementById('new-card-img-q-url');
    if (urlInput) urlInput.value = '';
    const fileInput = document.getElementById('new-card-img-q-file');
    if (fileInput) fileInput.value = '';
  } else if (target === 'add-a') {
    newCardImgA = '';
    const urlInput = document.getElementById('new-card-img-a-url');
    if (urlInput) urlInput.value = '';
    const fileInput = document.getElementById('new-card-img-a-file');
    if (fileInput) fileInput.value = '';
  } else if (target === 'edit-q') {
    editCardImgQ = '';
    const urlInput = document.getElementById('edit-card-img-q-url');
    if (urlInput) urlInput.value = '';
    const fileInput = document.getElementById('edit-card-img-q-file');
    if (fileInput) fileInput.value = '';
  } else if (target === 'edit-a') {
    editCardImgA = '';
    const urlInput = document.getElementById('edit-card-img-a-url');
    if (urlInput) urlInput.value = '';
    const fileInput = document.getElementById('edit-card-img-a-file');
    if (fileInput) fileInput.value = '';
  }
  renderImgPreview(target);
}

function renderImgPreview(target) {
  let imgSrc = '';
  let previewEl = null;

  if (target === 'add-q') {
    imgSrc = newCardImgQ;
    previewEl = document.getElementById('add-q-preview-wrap');
  } else if (target === 'add-a') {
    imgSrc = newCardImgA;
    previewEl = document.getElementById('add-a-preview-wrap');
  } else if (target === 'edit-q') {
    imgSrc = editCardImgQ;
    previewEl = document.getElementById('edit-q-preview-wrap');
  } else if (target === 'edit-a') {
    imgSrc = editCardImgA;
    previewEl = document.getElementById('edit-a-preview-wrap');
  }

  if (!previewEl) return;

  if (!imgSrc) {
    previewEl.innerHTML = '';
    return;
  }

  previewEl.innerHTML = `
    <div class="card-img-preview-box">
      <img src="${escapeHtml(imgSrc)}" class="card-img-preview" alt="Preview" />
      <div class="card-img-meta">
        <span class="card-img-tag">✓ ${t("imageAttached")}</span>
        <button class="btn btn-sm btn-danger" type="button" onclick="clearCardImg('${target}')">🗑️ ${t("removeImage")}</button>
      </div>
    </div>
  `;
}

function openAddCardModal(stackId) {
  const stack = state.stacks.find(s => s.id === stackId);
  if (!stack) return;

  newCardImgQ = "";
  newCardImgA = "";

  showModal(t("addCardsTitle"), `
    <input type="hidden" id="new-card-stack" value="${escapeHtml(stackId)}" />

    <div class="tabs" role="tablist">
      <button class="tab-btn active" type="button" role="tab" data-tab="single" onclick="switchAddCardTab('single')">${t("singleCard")}</button>
      <button class="tab-btn" type="button" role="tab" data-tab="bulk" onclick="switchAddCardTab('bulk')">${t("bulkImport")}</button>
      <button class="tab-btn" type="button" role="tab" data-tab="file" onclick="switchAddCardTab('file')">${t("csvFileImport")}</button>
    </div>

    <div class="tab-panel active" data-tab="single" role="tabpanel">
      <label for="new-card-q">${t("front")}</label>
      <input type="text" id="new-card-q" placeholder="e.g., **sein** (to be)" value="" />
      
      <label>${t("imageOptional")} - ${t("front")}</label>
      <div style="display:flex; gap:0.5rem; margin-bottom:0.5rem;">
        <input type="text" id="new-card-img-q-url" placeholder="${t("imageUrl")}" style="margin-bottom:0;" oninput="handleImgUrlChange('add-q', this.value)" />
        <input type="file" accept="image/*" style="display:none;" id="new-card-img-q-file" onchange="handleImgFileSelected('add-q', this)" />
        <button class="btn btn-sm" type="button" onclick="document.getElementById('new-card-img-q-file').click()" title="Choose image file">📁 ${t("orChooseFile")}</button>
      </div>
      <div id="add-q-preview-wrap"></div>

      <label for="new-card-a">${t("back")}</label>
      <input type="text" id="new-card-a" placeholder="e.g., to be" value="" />

      <label>${t("imageOptional")} - ${t("back")}</label>
      <div style="display:flex; gap:0.5rem; margin-bottom:0.5rem;">
        <input type="text" id="new-card-img-a-url" placeholder="${t("imageUrl")}" style="margin-bottom:0;" oninput="handleImgUrlChange('add-a', this.value)" />
        <input type="file" accept="image/*" style="display:none;" id="new-card-img-a-file" onchange="handleImgFileSelected('add-a', this)" />
        <button class="btn btn-sm" type="button" onclick="document.getElementById('new-card-img-a-file').click()" title="Choose image file">📁 ${t("orChooseFile")}</button>
      </div>
      <div id="add-a-preview-wrap"></div>

      <label for="new-card-tags">${t("tags")}</label>
      <input type="text" id="new-card-tags" placeholder="${t("tagsPlaceholder")}" value="" />

      <div class="btn-row">
        <button class="btn" type="button" onclick="closeModal()">${t("cancel")}</button>
        <button class="btn btn-primary" type="button" onclick="createCard()">${t("addCard")}</button>
      </div>
    </div>

    <div class="tab-panel" data-tab="bulk" role="tabpanel">
      <label class="bulk-label" for="bulk-raw-text">Raw Text</label>
      <textarea class="bulk-textarea" id="bulk-raw-text" placeholder="to go.gitmek&#10;to swim.yüzmek" spellcheck="false"></textarea>
      <div class="bulk-sep-row">
        <div class="bulk-sep-field">
          <label class="bulk-label" for="bulk-side-sep">${t("cardSideSep")}</label>
          <input type="text" id="bulk-side-sep" value="." maxlength="10" placeholder="." />
          <div class="bulk-sep-hint">${t("sepHintSide")}</div>
        </div>
        <div class="bulk-sep-field">
          <label class="bulk-label" for="bulk-card-sep">${t("nextCardSep")}</label>
          <input type="text" id="bulk-card-sep" value="" maxlength="10" placeholder="newline" />
          <div class="bulk-sep-hint">${t("sepHintNext")}</div>
        </div>
      </div>
      <div class="bulk-preview" aria-live="polite">
        <div class="bulk-preview-title">${t("preview")} <span class="bulk-preview-count" id="bulk-preview-count">0</span></div>
        <div id="bulk-preview-body"><div class="bulk-preview-empty">Add text to preview cards.</div></div>
      </div>
      <div class="btn-row">
        <button class="btn" type="button" onclick="closeModal()">${t("cancel")}</button>
        <button class="btn btn-primary" id="bulk-import-btn" type="button" onclick="executeBulkImport()" disabled>${t("importCardsBtn")}</button>
      </div>
    </div>

    <div class="tab-panel" data-tab="file" role="tabpanel">
      <p style="color:var(--fg-muted); font-size:0.85rem; line-height:1.5; margin-bottom:1rem;">
        Upload a CSV or TSV file. Columns: Front, Back, Tags (optional).
      </p>
      <input type="file" id="csv-file-input" accept=".csv,.tsv,.txt" style="margin-bottom:1rem;" onchange="handleCsvFileSelected(this)" />
      <div class="bulk-preview" id="csv-preview-box" style="display:none;">
        <div class="bulk-preview-title">${t("preview")} <span class="bulk-preview-count" id="csv-preview-count">0</span></div>
        <div id="csv-preview-body"></div>
      </div>
      <div class="btn-row">
        <button class="btn" type="button" onclick="closeModal()">${t("cancel")}</button>
        <button class="btn btn-primary" id="csv-import-btn" type="button" onclick="executeCsvImport()" disabled>${t("importCardsBtn")}</button>
      </div>
    </div>
  `, "add-card-modal");

  const rawEl = currentModalBack.querySelector("#bulk-raw-text");
  const sideEl = currentModalBack.querySelector("#bulk-side-sep");
  const cardEl = currentModalBack.querySelector("#bulk-card-sep");
  const updatePreview = () => renderBulkPreview(rawEl.value, sideEl.value, cardEl.value);
  rawEl.addEventListener("input", updatePreview);
  sideEl.addEventListener("input", updatePreview);
  cardEl.addEventListener("input", updatePreview);
}

function switchAddCardTab(tabName) {
  if (!currentModalBack) return;
  currentModalBack.querySelectorAll(".tab-btn").forEach(btn => {
    const isActive = btn.dataset.tab === tabName;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-selected", isActive ? "true" : "false");
  });
  currentModalBack.querySelectorAll(".tab-panel").forEach(panel => {
    panel.classList.toggle("active", panel.dataset.tab === tabName);
  });
}

function parseTagsString(str) {
  if (!str) return [];
  return str.split(",")
    .map(t => t.trim().replace(/^#/, ""))
    .filter(t => t.length > 0);
}

function createCard() {
  const qInput = document.getElementById("new-card-q");
  const aInput = document.getElementById("new-card-a");
  const tagsInput = document.getElementById("new-card-tags");
  const urlQInput = document.getElementById("new-card-img-q-url");
  const urlAInput = document.getElementById("new-card-img-a-url");
  const stackInput = document.getElementById("new-card-stack");

  const q = qInput ? qInput.value.trim() : "";
  const a = aInput ? aInput.value.trim() : "";
  const stackId = stackInput ? stackInput.value : "";
  const tags = parseTagsString(tagsInput ? tagsInput.value : "");
  
  const imgQ = newCardImgQ || (urlQInput ? urlQInput.value.trim() : "");
  const imgA = newCardImgA || (urlAInput ? urlAInput.value.trim() : "");

  if (!q || !a || !stackId) {
    showAlert("Please fill in both front and back.");
    return;
  }
  const stack = state.stacks.find(s => s.id === stackId);
  if (!stack) { closeModal(); return; }
  stack.cards.push({ id: generateId("c"), q, a, imgQ, imgA, tags });
  closeModal();
  persistState();
  openStackDetail(stackId);
  showToast(t("cardUpdated"));
}

function parseBulkText(rawText, sideSep, cardSepRaw) {
  const result = { valid: [], skipped: 0 };
  if (!rawText || !rawText.trim()) return result;
  if (!sideSep) return result;

  const cardSep = (!cardSepRaw || cardSepRaw === "") ? "\n" : cardSepRaw;
  const rawCards = rawText.split(cardSep);

  rawCards.forEach(rawCard => {
    const trimmed = rawCard.trim();
    if (!trimmed) return;
    const parts = trimmed.split(sideSep);
    if (parts.length >= 2) {
      const front = parts[0].trim();
      const back = parts.slice(1).join(sideSep).trim();
      if (front && back) result.valid.push({ q: front, a: back, imgQ: "", imgA: "", tags: [] });
      else result.skipped++;
    } else {
      result.skipped++;
    }
  });
  return result;
}

function renderBulkPreview(rawText, sideSep, cardSepRaw) {
  const bodyEl = document.getElementById("bulk-preview-body");
  const countEl = document.getElementById("bulk-preview-count");
  const importBtn = document.getElementById("bulk-import-btn");
  if (!bodyEl || !countEl) return;

  const { valid, skipped } = parseBulkText(rawText, sideSep, cardSepRaw);
  countEl.textContent = valid.length;

  if (valid.length === 0 && skipped === 0) {
    bodyEl.innerHTML = '<div class="bulk-preview-empty">Add text to preview cards.</div>';
    if (importBtn) importBtn.disabled = true;
    return;
  }

  let html = "";
  valid.slice(0, 50).forEach(card => {
    html += `
      <div class="bulk-preview-item">
        <span class="bulk-preview-q">${escapeHtml(card.q)}</span>
        <span class="bulk-preview-arrow">→</span>
        <span class="bulk-preview-a">${escapeHtml(card.a)}</span>
      </div>
    `;
  });
  if (valid.length > 50) {
    html += `<div style="font-size:0.8rem; color:var(--fg-muted); padding:0.4rem 0;">+ ${valid.length - 50} more cards...</div>`;
  }
  if (skipped > 0) {
    html += `<div class="bulk-preview-item bulk-preview-invalid">${skipped} line(s) skipped</div>`;
  }
  bodyEl.innerHTML = html;
  if (importBtn) importBtn.disabled = (valid.length === 0);
}

function executeBulkImport() {
  const rawEl = document.getElementById("bulk-raw-text");
  const sideEl = document.getElementById("bulk-side-sep");
  const cardEl = document.getElementById("bulk-card-sep");
  const stackEl = document.getElementById("new-card-stack");
  if (!rawEl || !sideEl || !stackEl) return;

  const { valid, skipped } = parseBulkText(rawEl.value, sideEl.value, cardEl ? cardEl.value : "");
  const stack = state.stacks.find(s => s.id === stackEl.value);
  if (!stack || valid.length === 0) return;

  valid.forEach(c => stack.cards.push({ id: generateId("c"), q: c.q, a: c.a, imgQ: "", imgA: "", tags: [] }));
  closeModal();
  persistState();
  openStackDetail(stack.id);
  showToast(`${valid.length} ${t("cardsImported")}`);
}

function handleCsvFileSelected(input) {
  const file = input.files && input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    const text = e.target.result;
    parsedCsvCards = parseCsvContent(text);
    const previewBox = document.getElementById("csv-preview-box");
    const previewBody = document.getElementById("csv-preview-body");
    const countEl = document.getElementById("csv-preview-count");
    const importBtn = document.getElementById("csv-import-btn");

    if (previewBox && previewBody && countEl) {
      previewBox.style.display = "block";
      countEl.textContent = parsedCsvCards.length;
      let html = "";
      parsedCsvCards.slice(0, 50).forEach(c => {
        html += `
          <div class="bulk-preview-item">
            <span class="bulk-preview-q">${escapeHtml(c.q)}</span>
            <span class="bulk-preview-arrow">→</span>
            <span class="bulk-preview-a">${escapeHtml(c.a)}</span>
          </div>
        `;
      });
      previewBody.innerHTML = html || '<div class="bulk-preview-empty">No valid rows found.</div>';
      if (importBtn) importBtn.disabled = parsedCsvCards.length === 0;
    }
  };
  reader.readAsText(file);
}

function parseCsvContent(text) {
  const lines = text.split(/\r?\n/);
  const cards = [];
  lines.forEach((line, idx) => {
    if (!line.trim()) return;
    let parts = line.split("\t");
    if (parts.length < 2) {
      parts = line.split(",");
    }
    if (parts.length >= 2) {
      const q = parts[0].replace(/^["']|["']$/g, '').trim();
      const a = parts[1].replace(/^["']|["']$/g, '').trim();
      const tags = parts[2] ? parseTagsString(parts[2].replace(/^["']|["']$/g, '')) : [];
      if (idx === 0 && q.toLowerCase() === "front" && a.toLowerCase() === "back") return;
      if (q && a) cards.push({ q, a, imgQ: "", imgA: "", tags });
    }
  });
  return cards;
}

function executeCsvImport() {
  const stackEl = document.getElementById("new-card-stack");
  if (!stackEl || parsedCsvCards.length === 0) return;
  const stack = state.stacks.find(s => s.id === stackEl.value);
  if (!stack) return;

  parsedCsvCards.forEach(c => stack.cards.push({ id: generateId("c"), q: c.q, a: c.a, imgQ: "", imgA: "", tags: c.tags || [] }));
  closeModal();
  persistState();
  openStackDetail(stack.id);
  showToast(`${parsedCsvCards.length} ${t("cardsImported")}`);
  parsedCsvCards = [];
}

function openManageCardModal(stackId, cardId) {
  const stack = state.stacks.find(s => s.id === stackId);
  if (!stack) return;
  const card = stack.cards.find(c => c.id === cardId);
  if (!card) return;

  editCardImgQ = card.imgQ || "";
  editCardImgA = card.imgA || "";

  const initialUrlQ = (card.imgQ && !card.imgQ.startsWith("data:")) ? card.imgQ : "";
  const initialUrlA = (card.imgA && !card.imgA.startsWith("data:")) ? card.imgA : "";

  showModal("Manage Card", `
    <input type="hidden" id="manage-stack-id" value="${escapeHtml(stackId)}" />
    <input type="hidden" id="manage-card-id" value="${escapeHtml(cardId)}" />

    <div class="manage-card-section">
      <span class="manage-card-section-title">Edit Card</span>
      <label for="manage-card-q">${t("front")}</label>
      <input type="text" id="manage-card-q" value="${escapeHtml(card.q)}" />

      <label>${t("imageOptional")} - ${t("front")}</label>
      <div style="display:flex; gap:0.5rem; margin-bottom:0.5rem;">
        <input type="text" id="edit-card-img-q-url" value="${escapeHtml(initialUrlQ)}" placeholder="${t("imageUrl")}" style="margin-bottom:0;" oninput="handleImgUrlChange('edit-q', this.value)" />
        <input type="file" accept="image/*" style="display:none;" id="edit-card-img-q-file" onchange="handleImgFileSelected('edit-q', this)" />
        <button class="btn btn-sm" type="button" onclick="document.getElementById('edit-card-img-q-file').click()" title="Choose image file">📁 ${t("orChooseFile")}</button>
      </div>
      <div id="edit-q-preview-wrap"></div>

      <label for="manage-card-a">${t("back")}</label>
      <input type="text" id="manage-card-a" value="${escapeHtml(card.a)}" />

      <label>${t("imageOptional")} - ${t("back")}</label>
      <div style="display:flex; gap:0.5rem; margin-bottom:0.5rem;">
        <input type="text" id="edit-card-img-a-url" value="${escapeHtml(initialUrlA)}" placeholder="${t("imageUrl")}" style="margin-bottom:0;" oninput="handleImgUrlChange('edit-a', this.value)" />
        <input type="file" accept="image/*" style="display:none;" id="edit-card-img-a-file" onchange="handleImgFileSelected('edit-a', this)" />
        <button class="btn btn-sm" type="button" onclick="document.getElementById('edit-card-img-a-file').click()" title="Choose image file">📁 ${t("orChooseFile")}</button>
      </div>
      <div id="edit-a-preview-wrap"></div>

      <label for="manage-card-tags">${t("tags")}</label>
      <input type="text" id="manage-card-tags" value="${escapeHtml((card.tags || []).join(', '))}" placeholder="${t("tagsPlaceholder")}" />

      <div class="manage-card-actions" style="display:flex; justify-content:flex-end; gap:0.5rem; margin-top:0.5rem;">
        <button type="button" class="btn btn-sm" onclick="closeModal()">${t("cancel")}</button>
        <button type="button" class="btn btn-sm btn-primary" onclick="saveCardEdits()">${t("save")}</button>
      </div>
    </div>

    <div class="manage-card-section danger-zone">
      <span class="manage-card-section-title" style="color: var(--danger);">Danger Zone</span>
      <p>Delete this card permanently from the stack and Leitner boxes.</p>
      <div class="confirm-row" id="delete-confirm-row">
        <button type="button" class="btn btn-sm btn-danger" onclick="confirmCardDelete()">${t("delete")} Card</button>
      </div>
    </div>
  `, "manage-card-modal");

  renderImgPreview('edit-q');
  renderImgPreview('edit-a');
}

function saveCardEdits() {
  const stackId = document.getElementById("manage-stack-id").value;
  const cardId = document.getElementById("manage-card-id").value;
  const qInput = document.getElementById("manage-card-q");
  const aInput = document.getElementById("manage-card-a");
  const tagsInput = document.getElementById("manage-card-tags");

  const stack = state.stacks.find(s => s.id === stackId);
  if (!stack) return;
  const card = stack.cards.find(c => c.id === cardId);
  if (!card) return;

  const q = qInput.value.trim();
  const a = aInput.value.trim();
  if (!q || !a) {
    showAlert("Both front and back are required.");
    return;
  }

  card.q = q;
  card.a = a;
  card.tags = parseTagsString(tagsInput ? tagsInput.value : "");
  card.imgQ = editCardImgQ;
  card.imgA = editCardImgA;

  persistState();
  closeModal();
  openStackDetail(stackId);
  showToast(t("cardUpdated"));
}

function confirmCardDelete() {
  const stackId = document.getElementById("manage-stack-id").value;
  const cardId = document.getElementById("manage-card-id").value;
  const stack = state.stacks.find(s => s.id === stackId);
  if (!stack) return;

  stack.cards = stack.cards.filter(c => c.id !== cardId);
  stack.correctBox = stack.correctBox.filter(id => id !== cardId);
  stack.wrongBox = stack.wrongBox.filter(id => id !== cardId);
  persistState();
  closeModal();
  openStackDetail(stackId);
  showToast(t("cardDeleted"));
}

// ============================================================
// LEXIREAD / SMART JSON & CLIPBOARD PARSER
// ============================================================
function parseLexiReadPayload(rawInput) {
  if (!rawInput || typeof rawInput !== "string") return { title: "", cards: [], raw: "", isJson: false };
  const trimmed = rawInput.trim();
  let title = "";
  let cards = [];

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      let items = [];
      if (Array.isArray(parsed)) {
        items = parsed;
      } else if (parsed && typeof parsed === "object") {
        if (typeof parsed.title === "string") title = parsed.title;
        else if (typeof parsed.deckName === "string") title = parsed.deckName;
        else if (typeof parsed.name === "string") title = parsed.name;

        if (Array.isArray(parsed.words)) items = parsed.words;
        else if (Array.isArray(parsed.cards)) items = parsed.cards;
        else if (Array.isArray(parsed.savedWords)) items = parsed.savedWords;
        else if (Array.isArray(parsed.items)) items = parsed.items;
        else if (Array.isArray(parsed.vocabulary)) items = parsed.vocabulary;
      }

      items.forEach(item => {
        if (!item) return;
        if (Array.isArray(item) && item.length >= 2) {
          const q = String(item[0]).trim();
          const a = String(item[1]).trim();
          if (q && a) cards.push({ q, a, imgQ: "", imgA: "", tags: [] });
        } else if (typeof item === "object") {
          const q = item.word || item.front || item.q || item.term || item.original || item.text || item.german || item.vocab || item.source || "";
          const a = item.meaning || item.back || item.a || item.definition || item.translated || item.translation || item.turkish || item.target || "";
          const tags = Array.isArray(item.tags) ? item.tags : [];
          const imgQ = item.imgQ || item.image || "";
          const imgA = item.imgA || "";
          if (String(q).trim() && String(a).trim()) {
            cards.push({ q: String(q).trim(), a: String(a).trim(), imgQ, imgA, tags });
          }
        }
      });

      if (cards.length > 0) {
        return { title, cards, raw: trimmed, isJson: true };
      }
    } catch (e) {}
  }

  // Plain text line parsing fallback
  const lines = trimmed.split(/\r?\n/);
  lines.forEach(line => {
    const l = line.trim();
    if (!l) return;
    let parts = l.split("\t");
    if (parts.length < 2) parts = l.split(".");
    if (parts.length < 2) parts = l.split(":");
    if (parts.length < 2) parts = l.split(" - ");
    if (parts.length >= 2) {
      const q = parts[0].trim();
      const a = parts.slice(1).join(".").trim();
      if (q && a) cards.push({ q, a, imgQ: "", imgA: "", tags: [] });
    }
  });

  return { title, cards, raw: trimmed, isJson: false };
}

async function triggerPasteImport() {
  let clipboardText = "";
  try {
    if (navigator.clipboard && navigator.clipboard.readText) {
      clipboardText = await navigator.clipboard.readText();
    }
  } catch (e) {}
  openPasteModal(clipboardText);
}

function openPasteModal(initialText = "") {
  const todayStr = new Date().toLocaleDateString(currentLang === 'tr' ? 'tr-TR' : 'en-US');
  const parsed = parseLexiReadPayload(initialText);
  const defaultTitle = parsed.title || `LexiRead - ${todayStr}`;

  const libraryOptions = `<option value="">-- None / Yok --</option>` + state.libraries.map(lib => `
    <option value="${escapeHtml(lib.id)}">${escapeHtml(lib.title)}</option>
  `).join("");

  showModal(t("pasteModalTitle"), `
    <p style="color:var(--fg-muted); font-size:0.85rem; line-height:1.5; margin-bottom:1rem;">
      ${t("pasteDesc")}
    </p>

    <label for="paste-stack-title">Stack Title</label>
    <input type="text" id="paste-stack-title" value="${escapeHtml(defaultTitle)}" />

    <label for="paste-stack-lib">Library (Optional)</label>
    <select id="paste-stack-lib">${libraryOptions}</select>

    <div class="bulk-preview" id="paste-live-preview" aria-live="polite">
      <div class="bulk-preview-title">${t("preview")} <span class="bulk-preview-count" id="paste-preview-count">0</span></div>
      <div id="paste-preview-body"><div class="bulk-preview-empty">No cards detected yet.</div></div>
    </div>

    <details style="margin-bottom:1rem;">
      <summary style="font-size:0.82rem; font-weight:700; color:var(--fg-muted); cursor:pointer; margin-bottom:0.4rem;">
        ${t("editRaw")}
      </summary>
      <textarea class="bulk-textarea" id="paste-raw-text" placeholder="Paste LexiRead JSON or text here..." spellcheck="false">${escapeHtml(initialText)}</textarea>
    </details>

    <div class="btn-row">
      <button class="btn" type="button" onclick="closeModal()">${t("cancel")}</button>
      <button class="btn btn-primary" id="paste-create-btn" type="button" onclick="executePasteStackCreate()">${t("createStackBtn")}</button>
    </div>
  `, "paste-stack-modal");

  const rawEl = currentModalBack.querySelector("#paste-raw-text");

  const updatePreview = () => {
    const bodyEl = document.getElementById("paste-preview-body");
    const countEl = document.getElementById("paste-preview-count");
    const createBtn = document.getElementById("paste-create-btn");
    if (!bodyEl || !countEl) return;

    const currentParsed = parseLexiReadPayload(rawEl.value);
    countEl.textContent = currentParsed.cards.length;

    if (currentParsed.cards.length === 0) {
      bodyEl.innerHTML = '<div class="bulk-preview-empty">Paste LexiRead JSON or text above to preview cards.</div>';
      if (createBtn) createBtn.disabled = true;
      return;
    }

    let html = "";
    currentParsed.cards.slice(0, 50).forEach(card => {
      html += `
        <div class="bulk-preview-item">
          <span class="bulk-preview-q">${escapeHtml(card.q)}</span>
          <span class="bulk-preview-arrow">→</span>
          <span class="bulk-preview-a">${escapeHtml(card.a)}</span>
        </div>
      `;
    });
    if (currentParsed.cards.length > 50) {
      html += `<div style="font-size:0.8rem; color:var(--fg-muted); padding:0.4rem 0;">+ ${currentParsed.cards.length - 50} more cards...</div>`;
    }
    bodyEl.innerHTML = html;
    if (createBtn) createBtn.disabled = (currentParsed.cards.length === 0);
  };

  rawEl.addEventListener("input", updatePreview);
  updatePreview();
}

function executePasteStackCreate() {
  const titleInput = document.getElementById("paste-stack-title");
  const libInput = document.getElementById("paste-stack-lib");
  const rawEl = document.getElementById("paste-raw-text");

  const title = titleInput ? titleInput.value.trim() : "";
  if (!title) {
    showAlert("Please enter a stack title.");
    return;
  }

  const parsed = parseLexiReadPayload(rawEl ? rawEl.value : "");
  if (parsed.cards.length === 0) {
    showAlert("No valid cards found in input.");
    return;
  }

  const newCards = parsed.cards.map(c => ({
    id: generateId("c"),
    q: c.q,
    a: c.a,
    imgQ: c.imgQ || "",
    imgA: c.imgA || "",
    tags: Array.isArray(c.tags) ? c.tags : []
  }));

  const newStack = {
    id: generateId("stack"),
    title,
    description: `Created from LexiRead (${newCards.length} cards)`,
    libraryId: (libInput && libInput.value) ? libInput.value : null,
    cards: newCards,
    correctBox: [],
    wrongBox: []
  };

  state.stacks.push(newStack);
  persistState();
  closeModal();
  openStackDetail(newStack.id);
  showToast(`${newCards.length} ${t("cardsImported")}`);
}
