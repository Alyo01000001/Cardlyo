// ============================================================
// CARDLYO - FLASHCARD REVIEW ENGINE (3D FLIP & GESTURES)
// ============================================================
let flashcardSession = null;
let suppressFlashcardClick = false;

function openFlashcardOrderModal(stackId, source = "all") {
  const stack = state.stacks.find(s => s.id === stackId);
  if (!stack) return;
  const pool = getReviewPool(stack, source);
  if (pool.length === 0) {
    showAlert(t("minFlashcardError"));
    return;
  }

  showModal(t("configureFlashcards"), `
    <input type="hidden" id="session-stack-id" value="${escapeHtml(stackId)}" />
    <input type="hidden" id="session-source" value="${escapeHtml(source)}" />
    <label for="session-order">${t("order")}</label>
    <select id="session-order">
      <option value="sequential">${t("orderSeq")}</option>
      <option value="random">${t("orderRand")}</option>
    </select>
    <label for="session-face">${t("firstFace")}</label>
    <select id="session-face">
      <option value="front">${t("front")}</option>
      <option value="back">${t("back")}</option>
    </select>
    <div class="btn-row">
      <button class="btn" type="button" onclick="closeModal()">${t("cancel")}</button>
      <button class="btn btn-primary" type="button" onclick="confirmFlashcardConfig()">Start</button>
    </div>
  `);
}

function confirmFlashcardConfig() {
  const stackId = document.getElementById("session-stack-id").value;
  const source = document.getElementById("session-source").value;
  const order = document.getElementById("session-order").value;
  const face = document.getElementById("session-face").value;
  startFlashcardSession(stackId, order, source, face);
}

function startFlashcardSession(stackId, order, source = "all", face = "front") {
  const stack = state.stacks.find(s => s.id === stackId);
  const cards = stack ? getReviewPool(stack, source) : [];
  if (!stack || cards.length === 0) {
    showAlert(t("minFlashcardError"));
    return;
  }
  if (order === "random") shuffleCards(cards);
  closeModal();

  flashcardSession = {
    stackId,
    cards,
    index: 0,
    correct: 0,
    wrong: 0,
    locked: false,
    firstFace: face === "back" ? "back" : "front",
    undoHistory: []
  };
  renderFlashcardSession();
}

function renderFlashcardSession() {
  if (!flashcardSession) return;
  const root = document.getElementById("app-root");
  const currentCard = flashcardSession.cards[flashcardSession.index];
  const total = flashcardSession.cards.length;
  const startFlipped = flashcardSession.firstFace === "back";
  const hasUndo = flashcardSession.undoHistory.length > 0;

  const imgQHtml = currentCard.imgQ ? `<img src="${escapeHtml(currentCard.imgQ)}" class="flashcard-face-img" alt="Front image" />` : "";
  const imgAHtml = currentCard.imgA ? `<img src="${escapeHtml(currentCard.imgA)}" class="flashcard-face-img" alt="Back image" />` : "";

  root.innerHTML = `
    <section class="flashcard-overlay" aria-label="Flashcard review session">
      <div class="flashcard-session">
        <div class="flashcard-session-top">
          <span>Card ${flashcardSession.index + 1} / ${total}</span>
          <div class="flashcard-top-actions">
            ${hasUndo ? `<button class="btn btn-sm" type="button" onclick="undoFlashcardStep()">${t("undo")}</button>` : ""}
            <button class="btn btn-sm" type="button" onclick="finishFlashcardReview(true)">${t("exit")}</button>
          </div>
        </div>
        <div class="flashcard-scene">
          <div class="flashcard-surface${startFlipped ? " is-flipped" : ""}" id="flashcard-surface" role="button" tabindex="0" aria-label="Flip flashcard">
            <div class="flashcard-inner">
              <div class="flashcard-face flashcard-front">
                <div class="flashcard-face-header">
                  <span class="flashcard-face-label">${t("front")}</span>
                </div>
                ${imgQHtml}
                <div class="flashcard-face-text">${renderMarkdown(currentCard.q)}</div>
              </div>
              <div class="flashcard-face flashcard-back">
                <div class="flashcard-face-header">
                  <span class="flashcard-face-label">${t("back")}</span>
                </div>
                ${imgAHtml}
                <div class="flashcard-face-text">${renderMarkdown(currentCard.a)}</div>
              </div>
            </div>
          </div>
        </div>
        <p class="flashcard-hint">${t("flipHint")}</p>
        <div class="flashcard-actions">
          <button class="flashcard-decision flashcard-dont-know" id="flashcard-dont-know" type="button">${t("dontKnow")}</button>
          <button class="flashcard-decision flashcard-know" id="flashcard-know" type="button">${t("know")}</button>
        </div>
      </div>
    </section>
  `;

  const surface = document.getElementById("flashcard-surface");
  const dontKnowButton = document.getElementById("flashcard-dont-know");
  const knowButton = document.getElementById("flashcard-know");
  let touchStartX = null;

  surface.addEventListener("click", () => {
    if (!suppressFlashcardClick) flipFlashcard();
  });
  surface.addEventListener("touchstart", event => {
    touchStartX = event.changedTouches[0].clientX;
  }, { passive: true });
  surface.addEventListener("touchend", event => {
    if (touchStartX === null) return;
    const distance = event.changedTouches[0].clientX - touchStartX;
    touchStartX = null;
    if (Math.abs(distance) < 55) return;
    suppressFlashcardClick = true;
    handleFlashcardDecision(distance > 0);
    setTimeout(() => { suppressFlashcardClick = false; }, 450);
  }, { passive: true });

  dontKnowButton.addEventListener("click", () => handleFlashcardDecision(false));
  knowButton.addEventListener("click", () => handleFlashcardDecision(true));
}

function flipFlashcard() {
  if (!flashcardSession || flashcardSession.locked) return;
  const surface = document.getElementById("flashcard-surface");
  if (surface) surface.classList.toggle("is-flipped");
}

function handleFlashcardDecision(isCorrect) {
  if (!flashcardSession || flashcardSession.locked) return;
  const stack = state.stacks.find(s => s.id === flashcardSession.stackId);
  const currentCard = flashcardSession.cards[flashcardSession.index];
  const surface = document.getElementById("flashcard-surface");
  if (!stack || !currentCard || !surface) return;

  flashcardSession.undoHistory.push({
    index: flashcardSession.index,
    cardId: currentCard.id,
    prevCorrectBox: [...stack.correctBox],
    prevWrongBox: [...stack.wrongBox],
    isCorrect
  });

  flashcardSession.locked = true;
  const dkBtn = document.getElementById("flashcard-dont-know");
  const kBtn = document.getElementById("flashcard-know");
  if (dkBtn) dkBtn.disabled = true;
  if (kBtn) kBtn.disabled = true;

  routeCardToLeitner(stack, currentCard.id, isCorrect);
  if (isCorrect) flashcardSession.correct++;
  else flashcardSession.wrong++;

  surface.classList.add(isCorrect ? "slide-right" : "slide-left");
  setTimeout(() => {
    if (!flashcardSession) return;
    flashcardSession.index++;
    if (flashcardSession.index >= flashcardSession.cards.length) {
      finishFlashcardReview(false);
    } else {
      flashcardSession.locked = false;
      renderFlashcardSession();
    }
  }, 360);
}

function undoFlashcardStep() {
  if (!flashcardSession || flashcardSession.undoHistory.length === 0) return;
  const last = flashcardSession.undoHistory.pop();
  const stack = state.stacks.find(s => s.id === flashcardSession.stackId);
  if (!stack) return;

  stack.correctBox = last.prevCorrectBox;
  stack.wrongBox = last.prevWrongBox;
  persistState();

  if (last.isCorrect) flashcardSession.correct = Math.max(0, flashcardSession.correct - 1);
  else flashcardSession.wrong = Math.max(0, flashcardSession.wrong - 1);

  flashcardSession.index = last.index;
  flashcardSession.locked = false;
  renderFlashcardSession();
  showToast(t("undone"));
}

function finishFlashcardReview(cancelled) {
  if (!flashcardSession) return;
  const completed = flashcardSession;
  const root = document.getElementById("app-root");
  flashcardSession = null;

  if (cancelled) {
    openStackDetail(completed.stackId);
    return;
  }

  root.innerHTML = `
    <section class="flashcard-overlay" aria-label="Flashcard review summary">
      <div class="flashcard-session">
        <article class="flashcard-summary">
          <h2>${t("reviewComplete")}</h2>
          <p>${completed.correct} ${t("correctCards")}, ${completed.wrong} ${t("wrongCards")}</p>
          <button class="btn btn-primary" type="button" onclick="openStackDetail('${escapeHtml(completed.stackId)}')">${t("returnToStack")}</button>
        </article>
      </div>
    </section>
  `;
}
