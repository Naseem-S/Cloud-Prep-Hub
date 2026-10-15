// =========================================================================
// Cloud Prep Hub: shared code used by every page
// - Loads the JSON data that scripts/build.py generates
// - Saves progress in the browser (localStorage)
// - Runs the header: theme toggle, mobile menu, active link
// =========================================================================

const STORAGE_PREFIX = "cph.";

// ---------- Saved progress (localStorage) ----------
export const store = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
    } catch {
      /* storage can be blocked (private mode); the site still works without it */
    }
  },
};

// ---------- Loading data ----------
const cache = new Map();

export async function loadData(name) {
  if (!cache.has(name)) {
    const request = fetch(`data/${name}.json`).then((response) => {
      if (!response.ok) throw new Error(`Could not load data/${name}.json (${response.status})`);
      return response.json();
    });
    cache.set(name, request);
  }
  return cache.get(name);
}

export function showLoadError(container, error) {
  console.error(error);
  container.innerHTML = `
    <div class="error-box">
      <strong>Couldn't load the study data.</strong><br>
      If you're running the site on your computer, build it and start a local server first:<br>
      <code>python scripts/build.py</code> then <code>python -m http.server 8000 -d site</code>
    </div>`;
}

// ---------- Small helpers ----------
export function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function byId(list) {
  return Object.fromEntries(list.map((item) => [item.id, item]));
}

let toastTimer;
export function toast(message) {
  let box = document.querySelector(".toast");
  if (!box) {
    box = document.createElement("div");
    box.className = "toast";
    box.setAttribute("role", "status");
    document.body.append(box);
  }
  box.textContent = message;
  requestAnimationFrame(() => box.classList.add("show"));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => box.classList.remove("show"), 2200);
}

// Animate a number counting up, e.g. on the home page stats.
export function countUp(element, target, duration = 900) {
  const start = performance.now();
  const step = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    element.textContent = Math.round(target * eased);
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// Set a circular progress ring (see .ring in style.css) to a percentage.
export function setRing(ring, percent) {
  const circle = ring.querySelector(".fill");
  const radius = Number(circle.getAttribute("r"));
  const circumference = 2 * Math.PI * radius;
  circle.style.strokeDasharray = circumference;
  circle.style.strokeDashoffset = circumference;
  requestAnimationFrame(() => {
    circle.style.strokeDashoffset = circumference * (1 - percent / 100);
  });
}

// ---------- Progress & readiness ----------
// answers:  { questionId: true | false }  (was the latest attempt correct?)
// known:    [flashcardId, ...]            (cards marked "Got it")
// notesRead:[domainId, ...]               (notes marked as complete)
export function getProgress() {
  return {
    answers: store.get("answers", {}),
    known: new Set(store.get("known", [])),
    notesRead: new Set(store.get("notesRead", [])),
  };
}

// Readiness per domain blends quiz accuracy (60%), flashcards known (30%)
// and notes read (10%). The overall score is weighted like the real exam.
export function calculateReadiness(domains, questions, flashcards) {
  const { answers, known, notesRead } = getProgress();
  const perDomain = {};

  for (const domain of domains) {
    const domainQuestions = questions.filter((q) => q.domain === domain.id);
    const domainCards = flashcards.filter((c) => c.domain === domain.id);
    const correct = domainQuestions.filter((q) => answers[q.id] === true).length;
    const knownCount = domainCards.filter((c) => known.has(c.id)).length;

    const quizPart = domainQuestions.length ? correct / domainQuestions.length : 0;
    const cardPart = domainCards.length ? knownCount / domainCards.length : 0;
    const notesPart = notesRead.has(domain.id) ? 1 : 0;

    perDomain[domain.id] = Math.round((quizPart * 0.6 + cardPart * 0.3 + notesPart * 0.1) * 100);
  }

  const overall = Math.round(
    domains.reduce((sum, d) => sum + perDomain[d.id] * d.weight, 0) / 100
  );
  return { overall, perDomain };
}

// ---------- Export / import progress ----------
// Everything a learner has done is kept under these keys in localStorage.
export const PROGRESS_KEYS = ["answers", "known", "notesRead", "quizHistory"];
const EXPORT_APP_ID = "cloud-prep-hub";
const EXPORT_VERSION = 1;

// Download all progress as a JSON file the learner can keep or move to another device.
export function exportProgress() {
  const data = Object.fromEntries(PROGRESS_KEYS.map((key) => [key, store.get(key, null)]));
  const payload = {
    app: EXPORT_APP_ID,
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    data,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `cloud-prep-hub-progress-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Check that an imported file really is Cloud Prep Hub progress before using it.
export function validateProgress(payload) {
  if (!payload || payload.app !== EXPORT_APP_ID || typeof payload.data !== "object" || payload.data === null) {
    throw new Error("This file isn't a Cloud Prep Hub progress export.");
  }
  if (payload.version > EXPORT_VERSION) {
    throw new Error("This file was made by a newer version of the site. Refresh the page and try again.");
  }
  const { answers, known, notesRead, quizHistory } = payload.data;
  const isPlainObject = (v) => v === null || (typeof v === "object" && !Array.isArray(v));
  const isArray = (v) => v === null || Array.isArray(v);
  if (!isPlainObject(answers) || !isArray(known) || !isArray(notesRead) || !isArray(quizHistory)) {
    throw new Error("The progress file looks damaged, so nothing was imported.");
  }
  return payload;
}

// Read a file chosen by the learner and replace the saved progress with it.
export async function importProgress(file) {
  let payload;
  try {
    payload = JSON.parse(await file.text());
  } catch {
    throw new Error("That file couldn't be read. Choose the .json file you exported.");
  }
  validateProgress(payload);
  for (const key of PROGRESS_KEYS) {
    const value = payload.data[key];
    if (value === null || value === undefined) {
      try { localStorage.removeItem(STORAGE_PREFIX + key); } catch { /* ignore */ }
    } else {
      store.set(key, value);
    }
  }
  return payload;
}

export function resetProgress() {
  PROGRESS_KEYS.forEach((key) => {
    try { localStorage.removeItem(STORAGE_PREFIX + key); } catch { /* ignore */ }
  });
}

// ---------- Header and footer ----------
function initTheme() {
  const button = document.querySelector(".theme-btn");
  if (!button) return;
  button.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(STORAGE_PREFIX + "theme", next);
    } catch {
      /* ignore */
    }
  });
}

function initMenu() {
  const button = document.querySelector(".menu-btn");
  const nav = document.querySelector(".main-nav");
  if (!button || !nav) return;
  button.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    button.setAttribute("aria-expanded", String(open));
  });
}

function highlightCurrentPage() {
  const page = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".main-nav a").forEach((link) => {
    if (link.getAttribute("href") === page) {
      link.classList.add("active");
      link.setAttribute("aria-current", "page");
    }
  });
}

async function fillFooter() {
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  const buildInfo = document.getElementById("build-info");
  if (!buildInfo) return;
  try {
    const meta = await loadData("meta");
    const date = new Date(meta.builtAt).toLocaleDateString("en-IE", {
      day: "numeric", month: "short", year: "numeric",
    });
    buildInfo.textContent = `Build ${meta.commit} · ${date}`;
  } catch {
    /* footer info is optional */
  }
}

initTheme();
initMenu();
highlightCurrentPage();
fillFooter();
