// History API Routing State
let isHistoryNavigating = false;

function pushAppState(stateObj) {
  if (isHistoryNavigating) return;
  try {
    history.pushState(stateObj, "");
  } catch (e) {}
}

function replaceAppState(stateObj) {
  try {
    history.replaceState(stateObj, "");
  } catch (e) {}
}

// Modals & Alerts
let currentModalBack = null;

function showModal(title, htmlContent, modalClass = "") {
  closeModal(false, true);
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

  // Backdrop click to close
  currentModalBack.addEventListener("click", (e) => {
    if (e.target === currentModalBack) {
      closeModal();
    }
  });

  // Mobile swipe down on sheet to close
  const handle = currentModalBack.querySelector(".bottom-sheet-handle");
  const modalEl = currentModalBack.querySelector(".modal");
  if (handle || modalEl) {
    let startY = 0;
    const targetEl = handle || modalEl;
    targetEl.addEventListener("touchstart", (e) => {
      startY = e.touches[0].clientY;
    }, { passive: true });
    targetEl.addEventListener("touchend", (e) => {
      const diffY = e.changedTouches[0].clientY - startY;
      if (diffY > 70 && (!modalEl.scrollTop || modalEl.scrollTop <= 0)) {
        closeModal();
      }
    }, { passive: true });
  }

  document.body.appendChild(currentModalBack);
  pushAppState({ isModal: true });

  setTimeout(() => {
    if (!currentModalBack) return;
    const input = currentModalBack.querySelector("input:not([type='hidden']), textarea");
    if (input) input.focus();
  }, 50);
}

function dismissModalSilently() {
  if (currentModalBack) {
    currentModalBack.remove();
    currentModalBack = null;
  }
}

function closeModal(fromPopState = false, openingAnother = false) {
  if (currentModalBack) {
    currentModalBack.remove();
    currentModalBack = null;
  }
  if (!fromPopState && !openingAnother && history.state && history.state.isModal) {
    isHistoryNavigating = true;
    history.back();
    setTimeout(() => { isHistoryNavigating = false; }, 80);
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
  modalBack.addEventListener("click", (e) => {
    if (e.target === modalBack) {
      modalBack.remove();
    }
  });
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

// Settings Modal
function openSettingsModal() {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  const curLangText = currentLang === "tr" ? "Türkçe (TR)" : "English (EN)";
  const nextLangText = currentLang === "tr" ? "English" : "Türkçe";
  const curThemeText = isDark ? (currentLang === "tr" ? "Koyu Tema" : "Dark Theme") : (currentLang === "tr" ? "Açık Tema" : "Light Theme");
  const nextThemeText = isDark ? (currentLang === "tr" ? "Açık Temaya Geç" : "Switch to Light") : (currentLang === "tr" ? "Koyu Temaya Geç" : "Switch to Dark");

  showModal(t("settings"), `
    <p style="color:var(--fg-muted); font-size:0.85rem; line-height:1.5; margin-bottom:1.25rem;">
      ${t("settingsDesc")}
    </p>

    <div class="settings-list">
      <!-- Dil Ayarı -->
      <div class="settings-row">
        <div class="settings-row-info">
          <span class="settings-row-title">🌐 ${t("languageSetting")}</span>
          <span class="settings-row-sub">${curLangText}</span>
        </div>
        <button class="btn btn-sm" type="button" onclick="toggleLanguage(); openSettingsModal();">
          ${nextLangText}
        </button>
      </div>

      <!-- Tema Ayarı -->
      <div class="settings-row">
        <div class="settings-row-info">
          <span class="settings-row-title">${isDark ? "🌙" : "☀️"} ${t("themeSetting")}</span>
          <span class="settings-row-sub">${curThemeText}</span>
        </div>
        <button class="btn btn-sm" type="button" onclick="toggleTheme(); openSettingsModal();">
          ${nextThemeText}
        </button>
      </div>

      <!-- Veri & Yedekleme -->
      <div class="settings-row">
        <div class="settings-row-info">
          <span class="settings-row-title">📦 ${t("backupSetting")}</span>
          <span class="settings-row-sub">${currentLang === "tr" ? "Tüm kütüphane ve destelerinizi yönetin" : "Manage your library & stacks backup"}</span>
        </div>
        <div class="settings-btn-group">
          <button class="btn btn-sm" type="button" onclick="triggerImport(); closeModal();">
            📥 ${t("upload")}
          </button>
          <button class="btn btn-sm" type="button" onclick="triggerDownload();">
            📤 ${t("download")}
          </button>
        </div>
      </div>
    </div>

    <div class="btn-row" style="margin-top:1.5rem;">
      <button class="btn btn-primary" type="button" onclick="closeModal()">${t("okBtn")}</button>
    </div>
  `, "settings-modal");
}

// Global App Render
function renderApp(pushHistory = true) {
  currentLibraryId = null;
  activeStackDetailId = null;
  const root = document.getElementById("app-root");
  if (!root) return;
  root.innerHTML = "";
  renderDashboard(root);
  applyStaticI18n();

  if (pushHistory) {
    pushAppState({ view: "dashboard" });
  }
}

// Browser History (Mouse Back/Forward & Mobile Swipe Navigation)
window.addEventListener("popstate", (e) => {
  isHistoryNavigating = true;

  // 1. If modal is open, close it
  if (currentModalBack) {
    closeModal(true);
    isHistoryNavigating = false;
    return;
  }

  // 2. If in study mode, exit to stack
  if (flashcardSession) {
    const sId = flashcardSession.stackId;
    flashcardSession = null;
    openStackDetail(sId, false);
    isHistoryNavigating = false;
    return;
  }
  if (activeTestStack) {
    const sId = activeTestStack.id;
    activeTestStack = null;
    activeTestPool = [];
    openStackDetail(sId, false);
    isHistoryNavigating = false;
    return;
  }
  if (typingSession) {
    const sId = typingSession.stackId;
    typingSession = null;
    openStackDetail(sId, false);
    isHistoryNavigating = false;
    return;
  }

  // 3. Page views
  const st = e.state;
  if (st && st.view === "stack" && st.id) {
    if (st.libraryId) currentLibraryId = st.libraryId;
    openStackDetail(st.id, false);
  } else if (st && st.view === "library" && st.id) {
    openLibraryDetail(st.id, false);
  } else {
    renderApp(false);
  }

  isHistoryNavigating = false;
});

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
replaceAppState({ view: "dashboard" });
renderApp(false);
checkShareImportOnLoad();
