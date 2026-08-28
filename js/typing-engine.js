// ============================================================
// CARDLYO - TYPING PRACTICE ENGINE (SMART MATCH & DIFF)
// ============================================================
let typingSession = null;

function openTypingConfigModal(stackId, source = "all") {
  const stack = state.stacks.find(s => s.id === stackId);
  if (!stack) return;

  const pool = getReviewPool(stack, source);
  if (pool.length === 0) {
    showAlert(t("minFlashcardError"));
    return;
  }

  showModal(t("configureTyping"), `
    <input type="hidden" id="session-stack-id" value="${escapeHtml(stackId)}" />
    <input type="hidden" id="session-source" value="${escapeHtml(source)}" />
    <label for="session-order">${t("order")}</label>
    <select id="session-order">
      <option value="sequential">${t("orderSeq")}</option>
      <option value="random">${t("orderRand")}</option>
    </select>
    <label for="session-face">${t("firstFace")}</label>
    <select id="session-face">
      <option value="front">${t("front")} → ${t("back")}</option>
      <option value="back">${t("back")} → ${t("front")}</option>
    </select>
    <div class="btn-row">
      <button class="btn" type="button" onclick="closeModal()">${t("cancel")}</button>
      <button class="btn btn-primary" type="button" onclick="confirmTypingConfig()">Start</button>
    </div>
  `);
}

function confirmTypingConfig() {
  const stackId = document.getElementById("session-stack-id").value;
  const source = document.getElementById("session-source").value;
  const order = document.getElementById("session-order").value;
  const face = document.getElementById("session-face").value;

  const stack = state.stacks.find(s => s.id === stackId);
  if (!stack) { closeModal(); return; }

  let pool = getReviewPool(stack, source);
  if (pool.length === 0) {
    closeModal();
    showAlert(t("minFlashcardError"));
    return;
  }
  if (order === "random") pool = shuffleCards(pool.slice());

  runTypingSession(stack, pool, face);
}

function runTypingSession(stack, pool, face = "front") {
  closeModal();
  typingSession = {
    stackId: stack.id,
    cards: pool,
    index: 0,
    correct: 0,
    wrong: 0,
    face: face === "back" ? "back" : "front",
    submitted: false,
    lastCorrect: false,
    lastTyped: ""
  };
  renderTypingUI();
}

function exitTypingSession() {
  const stackId = typingSession ? typingSession.stackId : "";
  typingSession = null;
  if (stackId) openStackDetail(stackId);
  else renderApp();
}

function renderTypingUI() {
  if (!typingSession) return;
  const root = document.getElementById("app-root");
  const currentCard = typingSession.cards[typingSession.index];
  const total = typingSession.cards.length;

  const questionField = typingSession.face === "back" ? "a" : "q";
  const questionImg = typingSession.face === "back" ? currentCard.imgA : currentCard.imgQ;

  root.innerHTML = `
    <section class="typing-overlay" aria-label="Typing practice session">
      <article class="typing-card">
        <div class="test-exit-row">
          <button class="btn btn-sm" type="button" onclick="exitTypingSession()">${t("exit")}</button>
        </div>
        <div class="test-progress">
          <span>Q ${typingSession.index + 1} / ${total}</span>
          <div class="test-progress-bar">
            <div class="test-progress-fill" style="width: ${((typingSession.index) / total) * 100}%"></div>
          </div>
        </div>

        <div class="test-q-row">
          <div>
            <div style="font-size:0.8rem; font-weight:800; color:var(--fg-subtle); text-transform:uppercase; margin-bottom:0.4rem;">
              ${typingSession.face === "back" ? t("back") : t("front")}
            </div>
            ${questionImg ? `<img class="typing-q-img" src="${escapeHtml(questionImg)}" alt="Question image" />` : ""}
            <h2 class="test-question">${renderMarkdown(currentCard[questionField])}</h2>
          </div>
        </div>

        <form id="typing-form" onsubmit="handleTypingSubmit(event);">
          <div class="typing-input-wrap">
            <input type="text" id="typing-input" class="typing-input" placeholder="${currentLang === 'tr' ? 'Cevabınızı yazın...' : 'Type your answer...'}" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" />
            <button class="btn btn-primary" type="submit" id="typing-submit-btn">${currentLang === 'tr' ? 'Kontrol Et' : 'Check'}</button>
          </div>
        </form>

        <div id="typing-feedback-box"></div>
      </article>
    </section>
  `;

  setTimeout(() => {
    const input = document.getElementById("typing-input");
    if (input) input.focus();
  }, 60);
}

// Normalizes punctuation and casing
function normalizeAnswer(str) {
  return (str || "")
    .trim()
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'’]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Generates all acceptable answers from answer separators (/ ; ,) and optional descriptions (( ) [ ])
function getAcceptableAnswers(rawTarget) {
  if (!rawTarget) return [];
  const rawSegments = rawTarget.split(/[/;,]/).map(s => s.trim()).filter(Boolean);
  const acceptable = new Set();

  acceptable.add(normalizeAnswer(rawTarget));

  rawSegments.forEach(segment => {
    // 1. Full segment
    const normFull = normalizeAnswer(segment);
    if (normFull) acceptable.add(normFull);

    // 2. Segment with parentheses / brackets removed
    const stripped = segment.replace(/\([^)]*\)/g, ' ').replace(/\[[^\]]*\]/g, ' ').replace(/\s+/g, ' ').trim();
    const normStripped = normalizeAnswer(stripped);
    if (normStripped) acceptable.add(normStripped);

    // 3. Segment with only parenthesis symbols stripped (e.g. "(to) see" -> "to see")
    const unparenthesized = segment.replace(/[()\[\]]/g, ' ').replace(/\s+/g, ' ').trim();
    const normUnparenthesized = normalizeAnswer(unparenthesized);
    if (normUnparenthesized) acceptable.add(normUnparenthesized);
  });

  return Array.from(acceptable).filter(Boolean);
}

function isTypingAnswerCorrect(typed, target) {
  const normalizedTyped = normalizeAnswer(typed);
  if (!normalizedTyped) return false;
  const acceptable = getAcceptableAnswers(target);
  return acceptable.includes(normalizedTyped);
}

function handleTypingSubmit(e) {
  if (e) e.preventDefault();
  if (!typingSession) return;

  const currentCard = typingSession.cards[typingSession.index];
  const targetField = typingSession.face === "back" ? "q" : "a";
  const targetAnswer = currentCard[targetField] || "";

  const inputEl = document.getElementById("typing-input");
  const submitBtn = document.getElementById("typing-submit-btn");
  const feedbackBox = document.getElementById("typing-feedback-box");

  if (!inputEl || !feedbackBox) return;

  if (typingSession.submitted) {
    advanceTypingCard();
    return;
  }

  const typedVal = inputEl.value.trim();
  if (!typedVal) return;

  const isMatch = isTypingAnswerCorrect(typedVal, targetAnswer);

  typingSession.submitted = true;
  typingSession.lastCorrect = isMatch;
  typingSession.lastTyped = typedVal;

  const stack = state.stacks.find(s => s.id === typingSession.stackId);
  if (stack) {
    routeCardToLeitner(stack, currentCard.id, isMatch);
  }

  if (isMatch) {
    typingSession.correct++;
    inputEl.disabled = true;
    feedbackBox.innerHTML = `
      <div class="typing-feedback correct">
        <div style="font-weight:800; font-size:1.05rem; margin-bottom:0.4rem;">✓ ${currentLang === 'tr' ? 'Doğru!' : 'Correct!'}</div>
        <div class="typing-diff-row">
          <div class="typing-diff-item">
            <span class="typing-diff-label">${currentLang === 'tr' ? 'Yazdığınız:' : 'You typed:'}</span>
            <span class="typing-diff-val" style="color:var(--success); font-weight:700;">${escapeHtml(typedVal)}</span>
          </div>
          <div class="typing-diff-item">
            <span class="typing-diff-label">${currentLang === 'tr' ? 'Tam Anlamı:' : 'Full Answer:'}</span>
            <span class="typing-diff-val" style="color:var(--fg); font-weight:600;">${escapeHtml(targetAnswer)}</span>
          </div>
        </div>
      </div>
    `;
    submitBtn.textContent = currentLang === 'tr' ? 'Devam Et →' : 'Continue →';
    submitBtn.focus();

    const curIndex = typingSession.index;
    setTimeout(() => {
      if (typingSession && typingSession.submitted && typingSession.index === curIndex) {
        advanceTypingCard();
      }
    }, 1500);
  } else {
    typingSession.wrong++;
    inputEl.disabled = true;
    feedbackBox.innerHTML = `
      <div class="typing-feedback wrong">
        <div style="font-weight:800; font-size:1.05rem; color:var(--danger); margin-bottom:0.4rem;">✗ ${currentLang === 'tr' ? 'Yanlış' : 'Incorrect'}</div>
        <div class="typing-diff-row">
          <div class="typing-diff-item">
            <span class="typing-diff-label">${currentLang === 'tr' ? 'Yazdığınız:' : 'You typed:'}</span>
            <span class="typing-diff-val wrong-val">${escapeHtml(typedVal)}</span>
          </div>
          <div class="typing-diff-item">
            <span class="typing-diff-label">${currentLang === 'tr' ? 'Doğru Cevap:' : 'Correct answer:'}</span>
            <span class="typing-diff-val correct-val">${escapeHtml(targetAnswer)}</span>
          </div>
        </div>
      </div>
    `;
    submitBtn.textContent = currentLang === 'tr' ? 'Devam Et →' : 'Continue →';
    submitBtn.focus();
  }
}

function advanceTypingCard() {
  if (!typingSession) return;
  typingSession.submitted = false;
  typingSession.index++;
  if (typingSession.index >= typingSession.cards.length) {
    showTypingResults();
  } else {
    renderTypingUI();
  }
}

function showTypingResults() {
  if (!typingSession) return;
  const completedStackId = typingSession.stackId;
  const total = typingSession.cards.length;
  const correct = typingSession.correct;
  const root = document.getElementById("app-root");

  root.innerHTML = `
    <section class="typing-overlay" aria-label="Typing practice results">
      <article class="typing-card test-results">
        <h3>${t("sessionComplete")}</h3>
        <div class="score-ring">${correct} / ${total}</div>
        <p>${correct} / ${total} ${currentLang === 'tr' ? 'doğru yazıldı' : 'typed correctly'}</p>
        <div style="display:flex; gap:0.75rem; justify-content:center;">
          <button class="btn btn-primary" onclick="openStackDetail('${escapeHtml(completedStackId)}')">${t("returnToStack")}</button>
          <button class="btn" onclick="openTypingConfigModal('${escapeHtml(completedStackId)}')">${t("restartTest")}</button>
        </div>
      </article>
    </section>
  `;
  typingSession = null;
}
