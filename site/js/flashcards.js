// Flashcards page: filter, flip, mark as known, track progress.
import { loadData, showLoadError, shuffle, escapeHtml, byId, store, toast } from "./app.js";

const root = document.getElementById("fc-root");

let domains = [];
let domainMap = {};
let allCards = [];

const state = {
  domain: "all",        // "all" or a domain id
  hideKnown: false,
  deck: [],             // the cards currently being studied
  index: 0,
  flipped: false,
  known: new Set(store.get("known", [])),
};

function saveKnown() {
  store.set("known", [...state.known]);
}

// Build the deck from the current filters.
function buildDeck(shuffled = false) {
  let cards = allCards.filter((c) => state.domain === "all" || c.domain === state.domain);
  if (state.hideKnown) cards = cards.filter((c) => !state.known.has(c.id));
  state.deck = shuffled ? shuffle(cards) : cards;
  state.index = 0;
  state.flipped = false;
}

function cardsInScope() {
  return allCards.filter((c) => state.domain === "all" || c.domain === state.domain);
}

// ------------------------------------------------------------- rendering ---
function render() {
  const scope = cardsInScope();
  const knownInScope = scope.filter((c) => state.known.has(c.id)).length;

  root.innerHTML = `
    <div class="fc-toolbar">
      <div class="chip-group" id="fc-domains">
        <button type="button" class="chip" data-domain="all" aria-pressed="${state.domain === "all"}">All domains</button>
        ${domains.map((d) => `
          <button type="button" class="chip" data-domain="${d.id}" style="--c:${d.colour}" aria-pressed="${state.domain === d.id}">
            <span class="dot"></span>${escapeHtml(d.name)}
          </button>`).join("")}
      </div>
      <div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap">
        <label class="toggle"><input type="checkbox" id="hide-known" ${state.hideKnown ? "checked" : ""}> Hide cards I know</label>
        <button type="button" class="btn btn-secondary btn-sm" id="shuffle-btn">⇄ Shuffle</button>
      </div>
    </div>

    <div class="fc-stage">
      <div class="fc-progress-head">
        <span>${state.deck.length ? `Card ${Math.min(state.index + 1, state.deck.length)} of ${state.deck.length}` : "No cards"}</span>
        <span><strong style="color:var(--success)">${knownInScope}</strong> of ${scope.length} known</span>
      </div>
      <div class="progress" style="--c:var(--success)"><span style="width:${scope.length ? (knownInScope / scope.length) * 100 : 0}%"></span></div>
      <div id="card-area"></div>
    </div>`;

  renderCard();

  root.querySelector("#fc-domains").addEventListener("click", (event) => {
    const chip = event.target.closest("[data-domain]");
    if (!chip) return;
    state.domain = chip.dataset.domain;
    history.replaceState(null, "", state.domain === "all" ? "flashcards.html" : `?domain=${state.domain}`);
    buildDeck();
    render();
  });
  root.querySelector("#hide-known").addEventListener("change", (event) => {
    state.hideKnown = event.target.checked;
    buildDeck();
    render();
  });
  root.querySelector("#shuffle-btn").addEventListener("click", () => {
    buildDeck(true);
    render();
    toast("Deck shuffled");
  });
}

function renderCard() {
  const area = root.querySelector("#card-area");

  if (!state.deck.length) {
    area.innerHTML = `
      <div class="card fc-done fade-in" style="margin-top:22px">
        <div class="big">🏆</div>
        <h2>You know every card here!</h2>
        <p class="muted">Turn off "Hide cards I know" to review them again, or pick another domain.</p>
      </div>`;
    return;
  }

  if (state.index >= state.deck.length) {
    const learning = state.deck.filter((c) => !state.known.has(c.id)).length;
    area.innerHTML = `
      <div class="card fc-done fade-in" style="margin-top:22px">
        <div class="big">${learning ? "💪" : "🎉"}</div>
        <h2>End of the deck</h2>
        <p class="muted">${learning
          ? `${learning} card${learning === 1 ? "" : "s"} still to learn. Go again to lock them in.`
          : "You marked every card in this deck as known. Great work!"}</p>
        <div class="results-actions">
          ${learning ? `<button type="button" class="btn btn-primary" id="review-learning">Review ${learning} learning card${learning === 1 ? "" : "s"}</button>` : ""}
          <button type="button" class="btn btn-secondary" id="restart">Start over</button>
        </div>
      </div>`;
    area.querySelector("#restart").addEventListener("click", () => { buildDeck(); render(); });
    area.querySelector("#review-learning")?.addEventListener("click", () => {
      state.hideKnown = true;
      buildDeck(true);
      render();
    });
    return;
  }

  const card = state.deck[state.index];
  const domain = domainMap[card.domain];
  const isKnown = state.known.has(card.id);

  area.innerHTML = `
    <button type="button" class="flashcard ${state.flipped ? "flipped" : ""}" id="flashcard"
      aria-label="Flashcard: ${escapeHtml(card.term)}. Press to flip.">
      <div class="flashcard-inner">
        <div class="flashcard-face flashcard-front">
          <span class="tag" style="--c:${domain.colour}"><span class="dot"></span>${escapeHtml(domain.name)}</span>
          ${isKnown ? `<span class="known-badge">✓ Known</span>` : ""}
          <h2>${escapeHtml(card.term)}</h2>
          <span class="face-hint">Click or press Space to reveal</span>
        </div>
        <div class="flashcard-face flashcard-back" aria-hidden="${!state.flipped}">
          <div class="term-small">${escapeHtml(card.term)}</div>
          <p>${escapeHtml(card.definition)}</p>
          <span class="face-hint">Did you know it?</span>
        </div>
      </div>
    </button>

    <div class="fc-controls">
      <button type="button" class="icon-btn nav-prev" id="prev" aria-label="Previous card" ${state.index === 0 ? "disabled" : ""}>←</button>
      <button type="button" class="btn btn-learning" id="learning">Still learning</button>
      <button type="button" class="btn btn-known" id="known">✓ Got it</button>
      <button type="button" class="icon-btn nav-next" id="next" aria-label="Next card">→</button>
    </div>
    <p class="shortcuts">
      <span class="kbd">Space</span> flip · <span class="kbd">←</span> <span class="kbd">→</span> move ·
      <span class="kbd">K</span> got it · <span class="kbd">L</span> still learning
    </p>`;

  area.querySelector("#flashcard").addEventListener("click", flip);
  area.querySelector("#prev").addEventListener("click", previous);
  area.querySelector("#next").addEventListener("click", next);
  area.querySelector("#known").addEventListener("click", () => mark(true));
  area.querySelector("#learning").addEventListener("click", () => mark(false));
}

// --------------------------------------------------------------- actions ---
function flip() {
  state.flipped = !state.flipped;
  const element = document.getElementById("flashcard");
  element?.classList.toggle("flipped", state.flipped);
  element?.querySelector(".flashcard-back").setAttribute("aria-hidden", String(!state.flipped));
}

function next() {
  if (state.index < state.deck.length) {
    state.index++;
    state.flipped = false;
    render();
  }
}

function previous() {
  if (state.index > 0) {
    state.index--;
    state.flipped = false;
    render();
  }
}

function mark(known) {
  const card = state.deck[state.index];
  if (!card) return;
  known ? state.known.add(card.id) : state.known.delete(card.id);
  saveKnown();
  next();
}

document.addEventListener("keydown", (event) => {
  if (event.target.matches("input, textarea") || !document.getElementById("flashcard")) return;
  // Space on a focused button already "clicks" it, so don't flip as well.
  if (event.key === " " && event.target.matches("button")) return;
  switch (event.key) {
    case " ":
      event.preventDefault();
      flip();
      break;
    case "ArrowRight":
      next();
      break;
    case "ArrowLeft":
      previous();
      break;
    case "k":
    case "K":
      mark(true);
      break;
    case "l":
    case "L":
      mark(false);
      break;
  }
});

// ----------------------------------------------------------------- start ---
async function init() {
  try {
    [domains, allCards] = await Promise.all([loadData("domains"), loadData("flashcards")]);
    domainMap = byId(domains);
    const requested = new URLSearchParams(location.search).get("domain");
    if (domainMap[requested]) state.domain = requested;
    buildDeck();
    render();
  } catch (error) {
    showLoadError(root, error);
  }
}

init();
