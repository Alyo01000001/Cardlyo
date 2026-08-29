// ============================================================
// CARDLYO - MULTIPLE CHOICE TEST ENGINE
// ============================================================
const MIN_TEST_CARDS = 2;
const MAX_TEST_OPTIONS = 4;

let activeTestStack = null;
let activeTestPool = [];
let activeTestIndex = 0;
let activeTestScore = 0;
let activeTestSource = "main";
let activeTestFace = "front";

function openTestConfigModal(stackId, source = "all") {
  const stack = state.stacks.find(s => s.id === stackId);
  if (!stack) return;

  const pool = getReviewPool(stack, source);
  if (pool.length < MIN_TEST_CARDS) {
    showAlert(t("minCardsError"));
    return;
  }

  showModal(t("configureTest"), `
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
      <button class="btn btn-primary" type="button" onclick="confirmTestConfig()">${t("startBtn")}</button>
    </div>
  `);
}

function confirmTestConfig() {
  const stackId = document.getElementById("session-stack-id").value;
  const source = document.getElementById("session-source").value;
  const order = document.getElementById("session-order").value;
  const face = document.getElementById("session-face").value;

  const stack = state.stacks.find(s => s.id === stackId);
  if (!stack) { closeModal(); return; }

  let pool = getReviewPool(stack, source);
  if (pool.length < MIN_TEST_CARDS) {
    closeModal();
    showAlert(t("minCardsError"));
    return;
  }
  if (order === "random") pool = shuffleCards(pool.slice());

  runTestSession(stack, pool, source === "wrong" ? "wrongBox" : "main", face);
}

function runTestSession(stack, pool, source, face = "front", pushHistory = true) {
  dismissModalSilently();

  if (pushHistory && typeof replaceAppState === "function") {
    replaceAppState({ view: "study", stackId: stack.id, mode: "test" });
  }

  activeTestStack = stack;
  activeTestPool = pool.map(c => ({ ...c }));
  activeTestSource = source;
  activeTestFace = face === "back" ? "back" : "front";
  activeTestIndex = 0;
  activeTestScore = 0;
  renderTestUI();
}

function exitTest() {
  const stackId = activeTestStack ? activeTestStack.id : "";
  activeTestStack = null;
  activeTestPool = [];
  activeTestIndex = 0;
  activeTestScore = 0;
  if (history.state && history.state.view === "study") {
    history.back();
  } else if (stackId) {
    openStackDetail(stackId);
  } else {
    renderApp();
  }
}

function renderTestUI() {
  const root = document.getElementById("app-root");
  root.innerHTML = "";

  const overlay = document.createElement("section");
  overlay.className = "test-overlay";
  overlay.setAttribute("aria-label", "Test session");
  overlay.innerHTML = `
    <article class="test-card" aria-live="polite" aria-atomic="true">
      <div class="test-exit-row">
        <button class="btn btn-sm" type="button" onclick="exitTest()">${t("exit")}</button>
      </div>
      <div class="test-progress" aria-label="Progress">
        <span>${t("questionLabel")} ${activeTestIndex + 1} / ${activeTestPool.length}</span>
        <div class="test-progress-bar">
          <div class="test-progress-fill" style="width: ${((activeTestIndex) / activeTestPool.length) * 100}%"></div>
        </div>
      </div>
      <div class="test-q-row">
        <div>
          <div id="test-q-img-wrap"></div>
          <h2 class="test-question" id="test-q"></h2>
        </div>
      </div>
      <div class="test-options" id="test-options" role="radiogroup"></div>
    </article>
  `;
  root.appendChild(overlay);

  const questionField = activeTestFace === "back" ? "a" : "q";
  const optionField = activeTestFace === "back" ? "q" : "a";
  const currentCard = activeTestPool[activeTestIndex];
  const qImg = activeTestFace === "back" ? currentCard.imgA : currentCard.imgQ;

  if (qImg) {
    overlay.querySelector("#test-q-img-wrap").innerHTML = `<img class="test-q-img" src="${escapeHtml(qImg)}" alt="Question image" />`;
  }
  overlay.querySelector("#test-q").innerHTML = renderMarkdown(currentCard[questionField]);

  const distractorPool = activeTestPool.filter(c => c.id !== currentCard.id);
  const optionCount = Math.min(MAX_TEST_OPTIONS, activeTestPool.length);
  const distractors = [];
  while (distractors.length < optionCount - 1 && distractorPool.length > 0) {
    const idx = Math.floor(Math.random() * distractorPool.length);
    distractors.push(distractorPool.splice(idx, 1)[0]);
  }

  const options = [currentCard, ...distractors];
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }

  const optionsContainer = overlay.querySelector("#test-options");
  options.forEach((opt, idx) => {
    const btn = document.createElement("button");
    btn.className = "test-option-btn";
    btn.dataset.cardId = opt.id;
    btn.dataset.optionIdx = idx + 1;
    btn.innerHTML = `
      <span>${renderMarkdown(opt[optionField])}</span>
      <span class="test-key-tag">${idx + 1}</span>
    `;
    btn.onclick = () => handleTestAnswer(opt.id === currentCard.id, opt.id);
    optionsContainer.appendChild(btn);
  });
}

function handleTestAnswer(isCorrect, chosenId) {
  const overlay = document.querySelector(".test-overlay");
  if (!overlay) return;
  const btns = overlay.querySelectorAll(".test-option-btn");
  const currentCard = activeTestPool[activeTestIndex];

  btns.forEach(b => {
    b.disabled = true;
    if (b.dataset.cardId === currentCard.id) b.classList.add("correct-guess");
    else if (b.dataset.cardId === chosenId) b.classList.add("wrong-guess");
  });

  routeCardToLeitner(activeTestStack, currentCard.id, isCorrect);
  if (isCorrect) activeTestScore++;

  setTimeout(() => {
    if (!activeTestStack) return;
    activeTestIndex++;
    if (activeTestIndex >= activeTestPool.length) {
      showTestResults();
    } else {
      renderTestUI();
    }
  }, 750);
}

function showTestResults() {
  const completedStackId = activeTestStack ? activeTestStack.id : "";
  const total = activeTestPool.length;
  const restartSource = activeTestSource === "wrongBox" ? "wrong" : "all";
  const root = document.getElementById("app-root");
  root.innerHTML = "";
  const overlay = document.createElement("section");
  overlay.className = "test-overlay";
  overlay.innerHTML = `
    <article class="test-card test-results">
      <h3>${t("sessionComplete")}</h3>
      <div class="score-ring">${activeTestScore} / ${total}</div>
      <p>${activeTestScore} / ${total} ${currentLang === 'tr' ? 'doğru' : 'correct'}</p>
      <div style="display:flex; gap:0.75rem; justify-content:center;">
        <button class="btn btn-primary" onclick="openStackDetail('${escapeHtml(completedStackId)}')">${t("returnToStack")}</button>
        <button class="btn" onclick="openTestConfigModal('${escapeHtml(completedStackId)}', '${restartSource}')">${t("restartTest")}</button>
      </div>
    </article>
  `;
  root.appendChild(overlay);
  activeTestStack = null;
  activeTestPool = [];
}
