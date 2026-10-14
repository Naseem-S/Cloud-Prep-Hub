// Home page: stats, domain cards and the readiness ring.
import {
  loadData, showLoadError, countUp, setRing, calculateReadiness, escapeHtml, toast,
} from "./app.js";

async function init() {
  const grid = document.getElementById("domain-grid");
  try {
    const [domains, questions, flashcards, meta] = await Promise.all([
      loadData("domains"), loadData("questions"), loadData("flashcards"), loadData("meta"),
    ]);
    renderStats(meta);
    renderDomains(grid, domains, meta);
    renderReadiness(domains, questions, flashcards);

    document.getElementById("reset-progress").addEventListener("click", () => {
      if (!confirm("Reset all your quiz, flashcard and notes progress?")) return;
      ["answers", "known", "notesRead", "quizHistory"].forEach((key) => localStorage.removeItem(`cph.${key}`));
      renderReadiness(domains, questions, flashcards);
      toast("Progress reset");
    });
  } catch (error) {
    showLoadError(grid, error);
  }
}

function renderStats(meta) {
  document.querySelectorAll("[data-stat]").forEach((element) => {
    countUp(element, meta.totals[element.dataset.stat]);
  });
}

function renderDomains(grid, domains, meta) {
  grid.innerHTML = domains.map((d) => {
    const counts = meta.perDomain[d.id];
    return `
      <article class="card domain-card fade-in" style="--c:${d.colour}">
        <div class="domain-card-top">
          <span class="domain-num">DOMAIN ${String(d.number).padStart(2, "0")}</span>
          <div class="domain-weight">${d.weight}%<small>of exam</small></div>
        </div>
        <h3>${escapeHtml(d.name)}</h3>
        <p>${escapeHtml(d.summary)}</p>
        <div class="domain-meta">
          <span>${counts.questions} questions</span>
          <span>${counts.flashcards} flashcards</span>
          <span>${counts.readMinutes} min read</span>
        </div>
        <div class="domain-actions">
          <a class="btn btn-secondary btn-sm" href="notes.html#${d.id}">Read notes</a>
          <a class="btn btn-secondary btn-sm" href="flashcards.html?domain=${d.id}">Flashcards</a>
          <a class="btn btn-primary btn-sm" href="quiz.html?domain=${d.id}">Take quiz</a>
        </div>
      </article>`;
  }).join("");
}

function renderReadiness(domains, questions, flashcards) {
  const { overall, perDomain } = calculateReadiness(domains, questions, flashcards);
  setRing(document.getElementById("readiness-ring"), overall);
  countUp(document.getElementById("readiness-value"), overall);

  const container = document.getElementById("domain-progress");
  container.innerHTML = domains.map((d) => `
    <div class="domain-progress-row" style="--c:${d.colour}">
      <div class="row-head">
        <span><span class="dot" style="display:inline-block;margin-right:8px"></span>${escapeHtml(d.name)}</span>
        <span class="mono">${perDomain[d.id]}%</span>
      </div>
      <div class="progress"><span data-width="${perDomain[d.id]}"></span></div>
    </div>`).join("");

  requestAnimationFrame(() => {
    container.querySelectorAll("[data-width]").forEach((bar) => {
      bar.style.width = `${bar.dataset.width}%`;
    });
  });
}

init();
