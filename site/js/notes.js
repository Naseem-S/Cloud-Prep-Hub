// Notes page: domain navigation, search, contents list and "mark as complete".
import { loadData, showLoadError, escapeHtml, byId, store, toast } from "./app.js";

const root = document.getElementById("notes-root");

let domains = [];
let domainMap = {};
let notes = {};
let sections = [];        // searchable sections: { domainId, id, title, text }
let tocObserver = null;

const state = {
  current: null,
  query: "",
  read: new Set(store.get("notesRead", [])),
};

// ---------------------------------------------------------------- layout ---
function renderLayout() {
  root.innerHTML = `
    <div class="notes-layout">
      <aside class="notes-sidebar">
        <label class="search">
          <span class="sr-only">Search notes</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
          <input type="search" id="notes-search" placeholder="Search notes… e.g. S3, IAM" autocomplete="off">
        </label>
        <p class="side-label">Domains</p>
        <ul class="domain-nav" id="domain-nav"></ul>
        <div class="card notes-progress" id="notes-progress"></div>
      </aside>
      <div id="note-main"></div>
      <aside class="notes-toc" id="notes-toc"></aside>
    </div>`;

  root.querySelector("#notes-search").addEventListener("input", (event) => {
    state.query = event.target.value.trim();
    state.query.length >= 2 ? renderSearch() : renderNote();
  });
}

function renderSidebar() {
  root.querySelector("#domain-nav").innerHTML = domains.map((d) => `
    <li>
      <button type="button" data-domain="${d.id}" aria-current="${d.id === state.current && !isSearching()}">
        <span class="dot" style="--c:${d.colour}"></span>
        ${escapeHtml(d.name)}
        ${state.read.has(d.id) ? `<span class="check" aria-label="completed">✓</span>` : ""}
      </button>
    </li>`).join("");

  root.querySelectorAll("#domain-nav [data-domain]").forEach((button) => {
    button.addEventListener("click", () => openDomain(button.dataset.domain));
  });

  const done = domains.filter((d) => state.read.has(d.id)).length;
  root.querySelector("#notes-progress").innerHTML = `
    <strong>${done} of ${domains.length}</strong> <span class="muted">domains completed</span>
    <div class="progress" style="--c:var(--success)"><span style="width:${(done / domains.length) * 100}%"></span></div>`;
}

function isSearching() {
  return state.query.length >= 2;
}

// ------------------------------------------------------------------ note ---
function openDomain(domainId, sectionId) {
  state.current = domainId;
  state.query = "";
  const input = root.querySelector("#notes-search");
  if (input) input.value = "";
  history.replaceState(null, "", `#${domainId}`);
  renderNote(sectionId);
}

function renderNote(sectionId, highlight) {
  const domain = domainMap[state.current];
  const note = notes[state.current];
  const index = domains.indexOf(domain);
  const nextDomain = domains[index + 1];
  const isRead = state.read.has(domain.id);

  root.querySelector("#note-main").innerHTML = `
    <article class="card note-article fade-in" style="--c:${domain.colour}">
      <header class="note-header">
        <span class="tag"><span class="dot"></span>Domain ${domain.number} · ${domain.weight}% of exam</span>
        <h1>${escapeHtml(domain.name)}</h1>
        <div class="note-meta">
          <span>📖 ${note.readMinutes} min read</span>
          <span>📝 ${note.toc.length} sections</span>
          ${isRead ? `<span style="color:var(--success)">✓ Completed</span>` : ""}
        </div>
      </header>
      <div class="note-body" id="note-body">${note.html}</div>
      <footer class="note-footer">
        <button type="button" class="btn ${isRead ? "btn-secondary" : "btn-primary"}" id="mark-read">
          ${isRead ? "✓ Completed (undo)" : "Mark as complete"}
        </button>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <a class="btn btn-secondary" href="quiz.html?domain=${domain.id}">Quiz this domain</a>
          ${nextDomain ? `<button type="button" class="btn btn-ghost" id="next-domain">Next: ${escapeHtml(nextDomain.name)} →</button>` : ""}
        </div>
      </footer>
    </article>`;

  root.querySelector("#mark-read").addEventListener("click", () => {
    state.read.has(domain.id) ? state.read.delete(domain.id) : state.read.add(domain.id);
    store.set("notesRead", [...state.read]);
    toast(state.read.has(domain.id) ? `${domain.name} marked as complete` : "Marked as not complete");
    renderNote();
  });
  root.querySelector("#next-domain")?.addEventListener("click", () => {
    openDomain(nextDomain.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  if (highlight) highlightText(root.querySelector("#note-body"), highlight);
  renderToc(note);
  renderSidebar();

  if (sectionId) {
    requestAnimationFrame(() => document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" }));
  }
}

// ------------------------------------------------------- contents (TOC) ---
function renderToc(note) {
  const toc = root.querySelector("#notes-toc");
  toc.innerHTML = `
    <p class="side-label">On this page</p>
    <ul class="toc-list">
      ${note.toc.map((t) => `<li><a href="#${t.id}" data-target="${t.id}">${escapeHtml(t.title)}</a></li>`).join("")}
    </ul>`;

  toc.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      document.getElementById(link.dataset.target)?.scrollIntoView({ behavior: "smooth" });
    });
  });

  // Highlight the section currently on screen ("scroll-spy").
  tocObserver?.disconnect();
  tocObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      toc.querySelectorAll("a").forEach((a) => a.classList.toggle("active", a.dataset.target === entry.target.id));
    });
  }, { rootMargin: "-90px 0px -65% 0px" });
  root.querySelectorAll("#note-body h2").forEach((heading) => tocObserver.observe(heading));
}

// ---------------------------------------------------------------- search ---
function indexSections() {
  const template = document.createElement("template");
  for (const domain of domains) {
    template.innerHTML = notes[domain.id].html;
    let current = null;
    for (const node of template.content.children) {
      if (node.tagName === "H2") {
        current = { domainId: domain.id, id: node.id, title: node.textContent, text: "" };
        sections.push(current);
      } else if (current) {
        current.text += " " + node.textContent.replace(/\s+/g, " ");
      }
    }
  }
}

function renderSearch() {
  const query = state.query.toLowerCase();
  const matches = sections.filter((s) => (s.title + s.text).toLowerCase().includes(query));

  root.querySelector("#note-main").innerHTML = `
    <div class="card search-results fade-in">
      <h2 style="font-size:1.2rem">${matches.length} result${matches.length === 1 ? "" : "s"} for "${escapeHtml(state.query)}"</h2>
      ${matches.map((s, i) => `
        <button type="button" class="search-result" data-index="${i}">
          <span class="tag" style="--c:${domainMap[s.domainId].colour};margin-bottom:6px"><span class="dot"></span>${escapeHtml(domainMap[s.domainId].name)}</span>
          <strong>${mark(s.title, state.query)}</strong>
          <span>${mark(snippet(s.text, query), state.query)}</span>
        </button>`).join("") || `<p class="muted">No matches. Try a service name such as "Lambda" or "Budgets".</p>`}
    </div>`;

  root.querySelectorAll(".search-result").forEach((button) => {
    button.addEventListener("click", () => {
      const s = matches[Number(button.dataset.index)];
      const term = state.query;
      state.current = s.domainId;
      state.query = "";
      root.querySelector("#notes-search").value = "";
      history.replaceState(null, "", `#${s.domainId}`);
      renderNote(s.id, term);
    });
  });

  root.querySelector("#notes-toc").innerHTML = "";
  renderSidebar();
}

function snippet(text, query) {
  const at = text.toLowerCase().indexOf(query);
  if (at < 0) return text.slice(0, 140) + "…";
  const start = Math.max(0, at - 60);
  return (start ? "…" : "") + text.slice(start, at + 90).trim() + "…";
}

function mark(text, query) {
  const safe = escapeHtml(text);
  const pattern = new RegExp(`(${escapeHtml(query).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  return safe.replace(pattern, "<mark>$1</mark>");
}

// Wrap every match of `term` inside `container` in <mark> tags.
function highlightText(container, term) {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const lower = term.toLowerCase();
  const nodes = [];
  while (walker.nextNode()) {
    if (walker.currentNode.nodeValue.toLowerCase().includes(lower)) nodes.push(walker.currentNode);
  }
  for (const node of nodes) {
    const text = node.nodeValue;
    const fragment = document.createDocumentFragment();
    let position = 0;
    let at;
    while ((at = text.toLowerCase().indexOf(lower, position)) !== -1) {
      fragment.append(text.slice(position, at));
      const markEl = document.createElement("mark");
      markEl.textContent = text.slice(at, at + term.length);
      fragment.append(markEl);
      position = at + term.length;
    }
    fragment.append(text.slice(position));
    node.replaceWith(fragment);
  }
}

// ----------------------------------------------------------------- start ---
async function init() {
  try {
    [domains, notes] = await Promise.all([loadData("domains"), loadData("notes")]);
    domainMap = byId(domains);
    indexSections();

    const fromHash = location.hash.slice(1);
    state.current = domainMap[fromHash] ? fromHash : domains[0].id;
    renderLayout();
    renderNote();

    window.addEventListener("hashchange", () => {
      const id = location.hash.slice(1);
      if (domainMap[id] && id !== state.current) openDomain(id);
    });
  } catch (error) {
    showLoadError(root, error);
  }
}

init();
