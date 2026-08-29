// ============================================================
// CARDLYO - APP ENTRY POINT, MODALS, THEME & INITIALIZATION
// ============================================================

// Modals & Alerts
let currentModalBack = null;

function showModal(title, htmlContent, modalClass = "") {
  closeModal();
  currentModalBack = document.createElement("section");
  currentModalBack.className = "modal-backdrop";
  currentModalBack.setAttribute("role", "dialog");
  currentModalBack.setAttribute("aria-modal", "true");
  currentModalBack.innerHTML = `
    <div class="modal ${escapeHtml(modalClass)}" role="document">
      <div class="bottom-sheet-handle" aria-hidden="true"></div>
      <h2>${escapeHtml(title)}</h2>
      <div>${htmlContent}</div>
    </div>
  `;
  document.body.appendChild(currentModalBack);
  setTimeout(() => {
    if (!currentModalBack) return;
    const input = currentModalBack.querySelector("input:not([type='hidden']), textarea");
    if (input) input.focus();
  }, 50);
}

function closeModal() {
  if (currentModalBack) {
    currentModalBack.remove();
    currentModalBack = null;
  }
}

function showAlert(message) {
  const modalBack = document.createElement("section");
  modalBack.className = "modal-backdrop";
  modalBack.innerHTML = `
    <div class="alert-modal" role="document">
      <h3>${t("alertTitle")}</h3>
      <p>${escapeHtml(message)}</p>
      <button class="btn btn-primary" onclick="this.closest('.modal-backdrop').remove()" style="margin-top:1.25rem;">${t("okBtn")}</button>
    </div>
  `;
  document.body.appendChild(modalBack);
}

function showToast(message) {
  const existing = document.getElementById("app-toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.id = "app-toast";
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add("visible"));
  });
  setTimeout(() => {
    toast.classList.remove("visible");
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// Theme
const themeStorageKey = "cardlyo_theme";

function initTheme() {
  const saved = localStorage.getItem(themeStorageKey);
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const useDark = saved === "dark" || (!saved && prefersDark);
  document.documentElement.setAttribute("data-theme", useDark ? "dark" : "light");
  updateThemeLabel(useDark);
}

function toggleTheme() {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  const next = isDark ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem(themeStorageKey, next);
  updateThemeLabel(!isDark);
}

function updateThemeLabel(isDark) {
  const label = document.getElementById("theme-label");
  if (label) label.textContent = isDark ? t("themeLight") : t("theme");
  const icon = document.getElementById("theme-icon");
  if (icon) icon.textContent = isDark ? "◐" : "◑";
}

// Global App Render
function renderApp() {
  currentLibraryId = null;
  activeStackDetailId = null;
  const root = document.getElementById("app-root");
  if (!root) return;
  root.innerHTML = "";
  renderDashboard(root);
  applyStaticI18n();
}

// Global Keyboard Shortcuts
document.addEventListener("keydown", (e) => {
  const targetTag = e.target.tagName ? e.target.tagName.toLowerCase() : "";
  const isInput = targetTag === "input" || targetTag === "textarea" || targetTag === "select";

  // Global Ctrl+V / Cmd+V paste on dashboard
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v" && !isInput && !currentModalBack && !flashcardSession && !activeTestStack && !typingSession) {
    e.preventDefault();
    triggerPasteImport();
    return;
  }

  // ESCAPE key handler
  if (e.key === "Escape") {
    if (currentModalBack) {
      closeModal();
      return;
    }
    if (flashcardSession) {
      finishFlashcardReview(true);
      return;
    }
    if (activeTestStack) {
      exitTest();
      return;
    }
    if (typingSession) {
      exitTypingSession();
      return;
    }
  }

  if (isInput) return;

  // Flashcard shortcuts
  if (flashcardSession && !flashcardSession.locked) {
    if (e.code === "Space") {
      e.preventDefault();
      flipFlashcard();
    } else if (e.key === "ArrowRight" || e.key === "2" || e.code === "KeyD") {
      e.preventDefault();
      handleFlashcardDecision(true);
    } else if (e.key === "ArrowLeft" || e.key === "1" || e.code === "KeyA") {
      e.preventDefault();
      handleFlashcardDecision(false);
    } else if (e.key === "z" || e.key === "Z") {
      e.preventDefault();
      undoFlashcardStep();
    }
  }

  // Test Mode shortcuts (1, 2, 3, 4)
  if (activeTestStack) {
    if (["1", "2", "3", "4"].includes(e.key)) {
      const btn = document.querySelector(`.test-option-btn[data-option-idx="${e.key}"]:not(:disabled)`);
      if (btn) {
        e.preventDefault();
        btn.click();
      }
    }
  }
});

// Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

// Bootstrap
initTheme();
loadPersistedState();
renderApp();
checkShareImportOnLoad();
