// ============================================================
// CARDLYO - STATE & PERSISTENCE & SHARING
// ============================================================
let state = {
  stacks: [],
  libraries: []
};

function generateId(prefix = "id") {
  return prefix + "_" + Math.random().toString(36).slice(2, 11) + Date.now().toString(36).slice(-4);
}

function escapeHtml(str) {
  if (typeof str !== "string") return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function renderMarkdown(rawText) {
  if (!rawText) return "";
  let escaped = escapeHtml(rawText);
  // **bold** -> <strong>bold</strong>
  escaped = escaped.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // *italic* -> <em>italic</em>
  escaped = escaped.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // `code` -> <code>code</code>
  escaped = escaped.replace(/`(.+?)`/g, '<code>$1</code>');
  // Newlines -> <br/>
  escaped = escaped.replace(/\n/g, '<br/>');
  return `<span class="card-markdown">${escaped}</span>`;
}

const STORAGE_KEY = "cardlyo_data";

function persistState() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {}
}

function migrateState(parsed) {
  if (!Array.isArray(parsed.libraries)) parsed.libraries = [];
  parsed.libraries = parsed.libraries.filter(l => l && l.id && l.title);
  parsed.libraries.forEach(lib => {
    if (typeof lib.description !== "string") lib.description = "";
  });
  parsed.stacks.forEach(s => {
    if (typeof s.libraryId === "undefined" || s.libraryId === "") s.libraryId = null;
    if (typeof s.description !== "string") s.description = s.description || "";
    if (!Array.isArray(s.cards)) s.cards = [];
    s.cards.forEach(c => {
      if (!Array.isArray(c.tags)) c.tags = [];
      if (typeof c.imgQ !== "string") c.imgQ = "";
      if (typeof c.imgA !== "string") c.imgA = "";
    });
    if (!Array.isArray(s.correctBox)) s.correctBox = [];
    if (!Array.isArray(s.wrongBox)) s.wrongBox = [];
  });
  return parsed;
}

function loadPersistedState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    let parsed = JSON.parse(raw);
    if (!parsed.stacks || !Array.isArray(parsed.stacks)) return false;
    parsed = migrateState(parsed);
    state.stacks = parsed.stacks;
    state.libraries = parsed.libraries;
    return true;
  } catch (e) {
    return false;
  }
}

// State Export & Import
function triggerImport() {
  document.getElementById("import-file").click();
}

function handleImportFile(input) {
  const file = input.files && input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const parsed = JSON.parse(e.target.result);
      if (!parsed.stacks || !Array.isArray(parsed.stacks)) {
        showAlert("Invalid JSON file: missing 'stacks' array.");
        return;
      }
      const migrated = migrateState(parsed);

      // Merge libraries without overwriting existing ones
      const libIdMap = {};
      let addedLibsCount = 0;
      (migrated.libraries || []).forEach(importedLib => {
        if (!importedLib || !importedLib.title) return;
        const existingSameId = state.libraries.find(l => l.id === importedLib.id);
        if (existingSameId) {
          if (existingSameId.title.trim().toLowerCase() === importedLib.title.trim().toLowerCase()) {
            libIdMap[importedLib.id] = existingSameId.id;
          } else {
            const newLibId = generateId("lib");
            libIdMap[importedLib.id] = newLibId;
            state.libraries.push({ ...importedLib, id: newLibId });
            addedLibsCount++;
          }
        } else {
          libIdMap[importedLib.id] = importedLib.id;
          state.libraries.push({ ...importedLib });
          addedLibsCount++;
        }
      });

      // Merge stacks without overwriting existing ones
      let addedStacksCount = 0;
      (migrated.stacks || []).forEach(importedStack => {
        if (!importedStack || !importedStack.title) return;

        let targetLibId = importedStack.libraryId;
        if (targetLibId && libIdMap[targetLibId]) {
          targetLibId = libIdMap[targetLibId];
        } else if (targetLibId && !state.libraries.some(l => l.id === targetLibId)) {
          targetLibId = null;
        }

        const cardIdMap = {};
        const newCards = (importedStack.cards || []).map(c => {
          const newCId = generateId("c");
          cardIdMap[c.id] = newCId;
          return {
            id: newCId,
            q: c.q || "",
            a: c.a || "",
            imgQ: c.imgQ || "",
            imgA: c.imgA || "",
            tags: Array.isArray(c.tags) ? c.tags : []
          };
        });

        const newCorrectBox = (importedStack.correctBox || []).map(oldId => cardIdMap[oldId] || oldId).filter(id => newCards.some(c => c.id === id));
        const newWrongBox = (importedStack.wrongBox || []).map(oldId => cardIdMap[oldId] || oldId).filter(id => newCards.some(c => c.id === id));

        const newStackId = generateId("stack");
        state.stacks.push({
          id: newStackId,
          title: importedStack.title || "Untitled Stack",
          description: importedStack.description || "",
          libraryId: targetLibId,
          cards: newCards,
          correctBox: newCorrectBox,
          wrongBox: newWrongBox
        });
        addedStacksCount++;
      });

      persistState();
      renderApp();

      const toastMsg = currentLang === "tr"
        ? `${addedStacksCount} deste${addedLibsCount > 0 ? ` ve ${addedLibsCount} kütüphane` : ""} eklendi`
        : `Added ${addedStacksCount} stack(s)${addedLibsCount > 0 ? ` and ${addedLibsCount} library(ies)` : ""}`;
      showToast(toastMsg);
    } catch (err) {
      showAlert("Failed to parse JSON file: " + err.message);
    }
    input.value = "";
  };
  reader.readAsText(file);
}

function triggerDownload() {
  const blob = new Blob([JSON.stringify({ stacks: state.stacks, libraries: state.libraries }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "cardlyo_save.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Stack-level Export (JSON & CSV)
function exportStack(stackId) {
  const stack = state.stacks.find(s => s.id === stackId);
  if (!stack) return;
  const exportState = { stacks: [stack], libraries: [] };
  const blob = new Blob([JSON.stringify(exportState, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const safeTitle = stack.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "stack";
  link.href = url;
  link.download = `cardlyo_${safeTitle}_save.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function exportStackCsv(stackId) {
  const stack = state.stacks.find(s => s.id === stackId);
  if (!stack || stack.cards.length === 0) {
    showAlert("Stack has no cards to export.");
    return;
  }

  let csv = "Front,Back,Tags\n";
  stack.cards.forEach(c => {
    const qEsc = `"${(c.q || '').replace(/"/g, '""')}"`;
    const aEsc = `"${(c.a || '').replace(/"/g, '""')}"`;
    const tagsEsc = `"${((c.tags || []).join(", ")).replace(/"/g, '""')}"`;
    csv += `${qEsc},${aEsc},${tagsEsc}\n`;
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const safeTitle = stack.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "stack";
  link.href = url;
  link.download = `cardlyo_${safeTitle}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

// URL Link Sharing
function shareStackLink(stackId) {
  const stack = state.stacks.find(s => s.id === stackId);
  if (!stack) return;
  const payload = {
    title: stack.title,
    description: stack.description || "",
    cards: stack.cards.map(c => ({
      q: c.q,
      a: c.a,
      imgQ: c.imgQ || "",
      imgA: c.imgA || "",
      tags: c.tags || []
    }))
  };

  try {
    const jsonStr = JSON.stringify(payload);
    const encoded = encodeURIComponent(btoa(unescape(encodeURIComponent(jsonStr))));
    const shareUrl = window.location.origin + window.location.pathname + '#import=' + encoded;
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        showToast(currentLang === "tr" ? "Deste linki panoya kopyalandı! Paylaşabilirsiniz." : "Stack link copied to clipboard! Share it with anyone.");
      }).catch(() => {
        prompt(currentLang === "tr" ? "Paylaşım linkini kopyalayın:" : "Copy share link:", shareUrl);
      });
    } else {
      prompt(currentLang === "tr" ? "Paylaşım linkini kopyalayın:" : "Copy share link:", shareUrl);
    }
  } catch (e) {
    showAlert("Failed to create share link: " + e.message);
  }
}

function checkShareImportOnLoad() {
  const hash = window.location.hash;
  if (!hash || !hash.startsWith("#import=")) return;

  try {
    const encoded = hash.replace("#import=", "");
    const jsonStr = decodeURIComponent(escape(atob(decodeURIComponent(encoded))));
    const parsed = JSON.parse(jsonStr);

    if (!parsed || !parsed.title || !Array.isArray(parsed.cards)) return;

    showModal(currentLang === "tr" ? "Paylaşılan Desteyi İçe Aktar" : "Import Shared Stack", `
      <p style="color:var(--fg); font-weight:700; font-size:1.1rem; margin-bottom:0.4rem;">${escapeHtml(parsed.title)}</p>
      <p style="color:var(--fg-muted); font-size:0.9rem; margin-bottom:1rem;">${escapeHtml(parsed.description || "")}</p>
      <p style="color:var(--primary); font-weight:700; font-size:0.9rem; margin-bottom:1.25rem;">${parsed.cards.length} ${t("cardsCount")}</p>
      <div class="btn-row">
        <button class="btn" type="button" onclick="closeModal(); window.location.hash='';">${t("cancel")}</button>
        <button class="btn btn-primary" type="button" onclick="confirmImportSharedStack('${escapeHtml(encodeURIComponent(jsonStr))}')">${t("create")}</button>
      </div>
    `);
  } catch (e) {
    console.error("Failed to parse shared stack import link", e);
  }
}

function confirmImportSharedStack(encodedJson) {
  try {
    const jsonStr = decodeURIComponent(encodedJson);
    const parsed = JSON.parse(jsonStr);

    const newCards = (parsed.cards || []).map(c => ({
      id: generateId("c"),
      q: c.q || "",
      a: c.a || "",
      imgQ: c.imgQ || "",
      imgA: c.imgA || "",
      tags: Array.isArray(c.tags) ? c.tags : []
    }));

    const newStack = {
      id: generateId("stack"),
      title: parsed.title || "Shared Stack",
      description: parsed.description || "",
      libraryId: null,
      cards: newCards,
      correctBox: [],
      wrongBox: []
    };

    state.stacks.push(newStack);
    persistState();
    closeModal();
    window.location.hash = "";
    openStackDetail(newStack.id);
    showToast(currentLang === "tr" ? "Paylaşılan deste eklendi!" : "Shared stack added successfully!");
  } catch (e) {
    showAlert("Error importing shared stack: " + e.message);
  }
}
