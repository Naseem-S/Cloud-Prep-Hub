// Quiz page: setup → questions → results.
import {
  loadData, showLoadError, shuffle, escapeHtml, byId, store, setRing, countUp, toast,
} from "./app.js";

const root = document.getElementById("quiz-root");
const LETTERS = ["A", "B", "C", "D"];
const PASS_MARK = 70; // The real exam uses scaled scoring (700/1000); 70% is a rough guide.
const SECONDS_PER_QUESTION = Math.round((90 * 60) / 65); // Same pace as the real exam.

let domains = [];
let domainMap = {};
let allQuestions = [];

// Everything about the quiz in progress lives in this one object.
const state = {
  selectedDomains: new Set(),
  count: 10,
  mode: "practice",
  questions: [],   // [{ ...question, order: [shuffled option indexes] }]
  responses: [],   // chosen original option index, or null
  index: 0,
  locked: false,   // practice mode: answer revealed for this question
  timerId: null,
  secondsLeft: 0,
};

// ---------------------------------------------------------------- setup ---
function renderSetup() {
  stopTimer();
  const available = questionsForSelection().length;
  const history = store.get("quizHistory", []);

  root.innerHTML = `
    <div class="card setup fade-in">
      <div class="field">
        <span class="field-label">Domains</span>
        <div class="chip-group" id="domain-chips">
          ${domains.map((d) => `
            <button type="button" class="chip" data-domain="${d.id}" style="--c:${d.colour}"
              aria-pressed="${state.selectedDomains.has(d.id)}">
              <span class="dot"></span>${escapeHtml(d.name)}
            </button>`).join("")}
        </div>
      </div>

      <div class="field">
        <span class="field-label">Number of questions</span>
        <div class="chip-group" id="count-chips">
          ${[10, 20, "all"].map((n) => `
            <button type="button" class="chip" data-count="${n}" aria-pressed="${state.count === n}">
              ${n === "all" ? "All" : n}
            </button>`).join("")}
        </div>
      </div>

      <div class="field">
        <span class="field-label">Mode</span>
        <div class="mode-grid" id="mode-options">
          <button type="button" class="mode-option" data-mode="practice" aria-pressed="${state.mode === "practice"}">
            <strong>📘 Practice</strong>
            <span>See the correct answer and an explanation after every question.</span>
          </button>
          <button type="button" class="mode-option" data-mode="exam" aria-pressed="${state.mode === "exam"}">
            <strong>⏱️ Exam simulation</strong>
            <span>Timed at the real exam's pace. Change answers freely, results at the end.</span>
          </button>
        </div>
      </div>

      <div class="setup-footer">
        <span class="muted" id="available">${describeSelection(available)}</span>
        <button type="button" class="btn btn-primary" id="start-btn" ${available ? "" : "disabled"}>
          Start quiz
        </button>
      </div>
    </div>

    ${history.length ? `
      <div class="card history fade-in">
        <h3>Recent attempts</h3>
        <ul class="history-list">
          ${history.slice(0, 5).map((h) => `
            <li>
              <span>${new Date(h.date).toLocaleDateString("en-IE", { day: "numeric", month: "short" })}
                · ${h.mode === "exam" ? "Exam" : "Practice"} · ${h.total} questions</span>
              <span class="score-pill ${h.percent >= PASS_MARK ? "pass" : "fail"}">${h.percent}%</span>
            </li>`).join("")}
        </ul>
      </div>` : ""}
  `;

  root.querySelector("#domain-chips").addEventListener("click", (event) => {
    const chip = event.target.closest("[data-domain]");
    if (!chip) return;
    const id = chip.dataset.domain;
    state.selectedDomains.has(id) ? state.selectedDomains.delete(id) : state.selectedDomains.add(id);
    renderSetup();
  });

  root.querySelector("#count-chips").addEventListener("click", (event) => {
    const chip = event.target.closest("[data-count]");
    if (!chip) return;
    state.count = chip.dataset.count === "all" ? "all" : Number(chip.dataset.count);
    renderSetup();
  });

  root.querySelector("#mode-options").addEventListener("click", (event) => {
    const option = event.target.closest("[data-mode]");
    if (!option) return;
    state.mode = option.dataset.mode;
    renderSetup();
  });

  root.querySelector("#start-btn").addEventListener("click", () => startQuiz());
}

function questionsForSelection() {
  return allQuestions.filter((q) => state.selectedDomains.has(q.domain));
}

function describeSelection(available) {
  if (!available) return "Choose at least one domain.";
  const n = state.count === "all" ? available : Math.min(state.count, available);
  const time = state.mode === "exam" ? ` · ${Math.ceil((n * SECONDS_PER_QUESTION) / 60)} min` : "";
  return `${n} of ${available} questions${time}`;
}

// ---------------------------------------------------------- run the quiz ---
function startQuiz(pool) {
  const source = pool || questionsForSelection();
  const picked = shuffle(source);
  const size = pool || state.count === "all" ? picked.length : Math.min(state.count, picked.length);

  state.questions = picked.slice(0, size).map((q) => ({ ...q, order: shuffle([0, 1, 2, 3]) }));
  state.responses = new Array(state.questions.length).fill(null);
  state.index = 0;
  state.locked = false;

  if (state.mode === "exam") startTimer(state.questions.length * SECONDS_PER_QUESTION);
  renderQuestion();
}

function renderQuestion() {
  const q = state.questions[state.index];
  const total = state.questions.length;
  const chosen = state.responses[state.index];
  const domain = domainMap[q.domain];
  const isLast = state.index === total - 1;
  const isExam = state.mode === "exam";
  const answered = state.responses.filter((r) => r !== null).length;

  root.innerHTML = `
    <div class="card question-card fade-in">
      <div class="question-top">
        <span>Question <strong style="color:var(--text)">${state.index + 1}</strong> of ${total}</span>
        ${isExam
          ? `<span class="timer" id="timer">⏱ ${formatTime(state.secondsLeft)}</span>`
          : `<button type="button" class="btn btn-ghost btn-sm" id="quit-btn">End quiz</button>`}
      </div>
      <div class="progress question-progress"><span style="width:${((isExam ? answered : state.index) / total) * 100}%"></span></div>

      <span class="tag" style="--c:${domain.colour}"><span class="dot"></span>${escapeHtml(domain.name)}</span>
      <h2 class="question-text">${escapeHtml(q.question)}</h2>

      <div class="options" role="group" aria-label="Answer options">
        ${q.order.map((optionIndex, position) => `
          <button type="button" class="option ${optionClass(q, optionIndex, chosen)}" data-option="${optionIndex}"
            ${!isExam && state.locked ? "disabled" : ""}>
            <span class="option-letter">${LETTERS[position]}</span>
            <span>${escapeHtml(q.options[optionIndex])}</span>
          </button>`).join("")}
      </div>

      ${!isExam && state.locked ? feedbackHtml(q, chosen) : ""}

      <div class="question-actions">
        ${isExam
          ? `<button type="button" class="btn btn-secondary" id="prev-btn" ${state.index === 0 ? "disabled" : ""}>← Previous</button>`
          : `<span class="hint">Press <span class="kbd">1</span>–<span class="kbd">4</span> to answer, <span class="kbd">Enter</span> to continue</span>`}
        <div style="display:flex;gap:10px">
          ${isExam && isLast ? `<button type="button" class="btn btn-primary" id="finish-btn">Submit exam</button>` : ""}
          ${isExam && !isLast ? `<button type="button" class="btn btn-primary" id="next-btn">Next →</button>` : ""}
          ${!isExam ? `<button type="button" class="btn btn-primary" id="next-btn" ${state.locked ? "" : "disabled"}>
              ${isLast ? "See results" : "Next question →"}</button>` : ""}
        </div>
      </div>
    </div>`;

  root.querySelector(".options").addEventListener("click", (event) => {
    const button = event.target.closest("[data-option]");
    if (button) choose(Number(button.dataset.option));
  });
  root.querySelector("#next-btn")?.addEventListener("click", next);
  root.querySelector("#prev-btn")?.addEventListener("click", previous);
  root.querySelector("#finish-btn")?.addEventListener("click", confirmFinish);
  root.querySelector("#quit-btn")?.addEventListener("click", () => {
    if (confirm("End this quiz and see results for the questions you've answered?")) finish(true);
  });
}

function optionClass(q, optionIndex, chosen) {
  if (state.mode === "exam" || !state.locked) return chosen === optionIndex ? "selected" : "";
  if (optionIndex === q.answer) return "correct";
  if (optionIndex === chosen) return "wrong";
  return "";
}

function feedbackHtml(q, chosen) {
  const right = chosen === q.answer;
  return `
    <div class="feedback ${right ? "" : "wrong"} fade-in">
      <strong>${right ? "✓ Correct!" : `✗ Not quite. The answer is "${escapeHtml(q.options[q.answer])}".`}</strong>
      <p>${escapeHtml(q.explanation)}</p>
    </div>`;
}

function choose(optionIndex) {
  if (state.mode === "practice" && state.locked) return;
  state.responses[state.index] = optionIndex;
  if (state.mode === "practice") state.locked = true;
  renderQuestion();
  if (state.mode === "practice") root.querySelector("#next-btn")?.focus();
}

function next() {
  if (state.mode === "practice" && !state.locked) return;
  if (state.index === state.questions.length - 1) {
    if (state.mode === "practice") finish();
    return;
  }
  state.index++;
  state.locked = false;
  renderQuestion();
}

function previous() {
  if (state.index > 0) {
    state.index--;
    renderQuestion();
  }
}

function confirmFinish() {
  const unanswered = state.responses.filter((r) => r === null).length;
  if (unanswered && !confirm(`You have ${unanswered} unanswered question(s). Submit anyway?`)) return;
  finish();
}

// ---------------------------------------------------------------- timer ---
function startTimer(seconds) {
  stopTimer();
  state.secondsLeft = seconds;
  state.timerId = setInterval(() => {
    state.secondsLeft--;
    const timer = document.getElementById("timer");
    if (timer) {
      timer.textContent = `⏱ ${formatTime(state.secondsLeft)}`;
      timer.classList.toggle("low", state.secondsLeft <= 60);
    }
    if (state.secondsLeft <= 0) {
      toast("Time's up! Your exam has been submitted.");
      finish();
    }
  }, 1000);
}

function stopTimer() {
  clearInterval(state.timerId);
  state.timerId = null;
}

function formatTime(seconds) {
  const s = Math.max(0, seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// -------------------------------------------------------------- results ---
function finish(answeredOnly = false) {
  stopTimer();

  let pairs = state.questions.map((q, i) => ({ q, chosen: state.responses[i] }));
  if (answeredOnly) pairs = pairs.filter((p) => p.chosen !== null);
  if (!pairs.length) return renderSetup();

  const correct = pairs.filter((p) => p.chosen === p.q.answer).length;
  const percent = Math.round((correct / pairs.length) * 100);

  // Save the latest result for each question (feeds the readiness score on Home).
  const answers = store.get("answers", {});
  pairs.forEach((p) => { if (p.chosen !== null) answers[p.q.id] = p.chosen === p.q.answer; });
  store.set("answers", answers);

  const history = store.get("quizHistory", []);
  history.unshift({ date: new Date().toISOString(), mode: state.mode, total: pairs.length, correct, percent });
  store.set("quizHistory", history.slice(0, 20));

  renderResults(pairs, correct, percent);
}

function renderResults(pairs, correct, percent) {
  const passed = percent >= PASS_MARK;
  const wrongPairs = pairs.filter((p) => p.chosen !== p.q.answer);

  const breakdown = domains
    .map((d) => {
      const inDomain = pairs.filter((p) => p.q.domain === d.id);
      if (!inDomain.length) return "";
      const right = inDomain.filter((p) => p.chosen === p.q.answer).length;
      const pct = Math.round((right / inDomain.length) * 100);
      return `
        <div class="breakdown-row" style="--c:${d.colour}">
          <span><span class="dot" style="display:inline-block;margin-right:8px"></span>${escapeHtml(d.name)}
            <span class="muted">· ${right}/${inDomain.length}</span></span>
          <span class="pct">${pct}%</span>
          <div class="progress"><span data-width="${pct}"></span></div>
        </div>`;
    })
    .join("");

  root.innerHTML = `
    <div class="card results-hero fade-in">
      <div class="ring" id="score-ring">
        <svg width="150" height="150" viewBox="0 0 150 150"><circle class="track" cx="75" cy="75" r="64"/><circle class="fill" cx="75" cy="75" r="64" style="stroke:${passed ? "var(--success)" : "var(--danger)"}"/></svg>
        <div class="ring-label"><div><span id="score-value">0</span>%<small>${correct} / ${pairs.length}</small></div></div>
      </div>
      <div class="verdict ${passed ? "pass" : "fail"}">${passed ? "You'd likely pass 🎉" : "Keep going, you're getting there"}</div>
      <p class="muted" style="margin:0">${passed
        ? "You scored above the 70% guide mark. Try an exam simulation with all domains next."
        : "You need around 70% to pass. Review the explanations below, then try again."}</p>
      <div class="results-actions">
        ${wrongPairs.length ? `<button type="button" class="btn btn-primary" id="retry-wrong">Retry ${wrongPairs.length} incorrect</button>` : ""}
        <button type="button" class="btn btn-secondary" id="new-quiz">New quiz</button>
      </div>
    </div>

    <div class="card breakdown fade-in">
      <h3 style="font-size:1rem;margin-bottom:18px">Score by domain</h3>
      ${breakdown}
    </div>

    <div class="review">
      <div style="display:flex;justify-content:space-between;align-items:center;margin:30px 0 14px;gap:12px;flex-wrap:wrap">
        <h3 style="margin:0">Review your answers</h3>
        <label class="toggle"><input type="checkbox" id="only-wrong" ${wrongPairs.length ? "checked" : ""}> Only show incorrect</label>
      </div>
      <div id="review-list"></div>
    </div>`;

  setRing(root.querySelector("#score-ring"), percent);
  countUp(root.querySelector("#score-value"), percent);
  requestAnimationFrame(() => {
    root.querySelectorAll("[data-width]").forEach((bar) => { bar.style.width = `${bar.dataset.width}%`; });
  });

  const renderReview = () => {
    const onlyWrong = root.querySelector("#only-wrong").checked;
    const list = onlyWrong ? wrongPairs : pairs;
    root.querySelector("#review-list").innerHTML = list.length
      ? list.map(({ q, chosen }) => {
          const right = chosen === q.answer;
          return `
            <div class="card review-item ${right ? "" : "wrong"}">
              <h4>${escapeHtml(q.question)}</h4>
              <p class="review-answer">${right ? "✓" : "✗"} Your answer:
                <strong>${chosen === null ? "No answer" : escapeHtml(q.options[chosen])}</strong></p>
              ${right ? "" : `<p class="review-answer">✓ Correct answer: <strong>${escapeHtml(q.options[q.answer])}</strong></p>`}
              <p class="explain">${escapeHtml(q.explanation)}</p>
            </div>`;
        }).join("")
      : `<p class="muted">Nothing to review. Every answer was correct!</p>`;
  };
  renderReview();

  root.querySelector("#only-wrong").addEventListener("change", renderReview);
  root.querySelector("#new-quiz").addEventListener("click", renderSetup);
  root.querySelector("#retry-wrong")?.addEventListener("click", () => {
    startQuiz(wrongPairs.map((p) => allQuestions.find((q) => q.id === p.q.id)));
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ------------------------------------------------------------- keyboard ---
document.addEventListener("keydown", (event) => {
  if (!state.questions.length || !root.querySelector(".question-card")) return;
  if (event.target.matches("input, textarea")) return;

  const key = event.key.toUpperCase();
  const position = ["1", "2", "3", "4"].indexOf(key) >= 0 ? Number(key) - 1 : LETTERS.indexOf(key);
  if (position >= 0) {
    choose(state.questions[state.index].order[position]);
  } else if (event.key === "Enter" && !event.target.matches("button")) {
    next();
  } else if (state.mode === "exam" && event.key === "ArrowRight") {
    if (state.index < state.questions.length - 1) next();
  } else if (state.mode === "exam" && event.key === "ArrowLeft") {
    previous();
  }
});

// ---------------------------------------------------------------- start ---
async function init() {
  try {
    [domains, allQuestions] = await Promise.all([loadData("domains"), loadData("questions")]);
    domainMap = byId(domains);

    const requested = new URLSearchParams(location.search).get("domain");
    const ids = domains.map((d) => d.id);
    state.selectedDomains = new Set(ids.includes(requested) ? [requested] : ids);
    renderSetup();
  } catch (error) {
    showLoadError(root, error);
  }
}

init();
