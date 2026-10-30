/* NewsLab public showcase — standalone simulated experience.
   Only fictional sample content. No authentication, network calls, or persistence. */
(function () {
  "use strict";

  const ARTICLES = [
    {
      id: "demo-01", source: "CITY OBSERVER", category: "PUBLIC POLICY",
      title: "A city tests a new public library borrowing program",
      summary: "Residents are invited to try an experimental lending program at neighborhood libraries.",
      details: "This fictional news item is included only to demonstrate controlled news-feed experiments. A real study would define and review its own stimulus materials.",
      art: "p1"
    },
    {
      id: "demo-02", source: "SCIENCE DAILY", category: "RESEARCH",
      title: "Researchers compare how people read online headlines",
      summary: "A simulated study explores how different article layouts may affect what readers notice.",
      details: "In the full NewsLab application, a researcher can specify the exact content and assign participants to conditions. This public showcase does not make research claims.",
      art: "p2"
    },
    {
      id: "demo-03", source: "REGIONAL REPORT", category: "ENVIRONMENT",
      title: "Community groups organize a river-cleanup weekend",
      summary: "Volunteers plan activities along several urban waterways, with events open to local residents.",
      details: "This synthetic article illustrates a participant interaction: opening a card records a local event. No browser data is transmitted or stored remotely.",
      art: "p3"
    },
    {
      id: "demo-04", source: "CULTURE REVIEW", category: "ARTS",
      title: "An exhibition explores the changing design of public spaces",
      summary: "A fictional museum program highlights architecture, accessibility, and urban life.",
      details: "A researcher may compare alternate layouts or article ordering. Here, changes are temporary and remain within this browser tab.",
      art: "p4"
    }
  ];

  const PAGES = ["overview", "experiments", "participant", "events", "export"];
  const TITLES = {
    overview: "Overview", experiments: "Experiments",
    participant: "Participant preview", events: "Event explorer", export: "Export data"
  };
  const CONDITION_NAMES = {
    balanced: "Balanced feed", headlines: "Headline-first feed",
    context: "Context-rich feed"
  };

  const state = {
    page: "overview", condition: "balanced", layout: "cards", order: "fixed",
    events: [], expanded: new Set(), reactions: new Set(), completed: false
  };

  const byId = (id) => document.getElementById(id);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[character]));
  }

  function eventLabel(type) {
    return ({
      article_open: "Article opened", article_close: "Article closed",
      reaction: "Reaction", reaction_removed: "Reaction removed",
      preview_complete: "Preview completed", preview_restart: "Preview restarted"
    })[type] || type;
  }

  function record(type, articleId) {
    state.events.push({
      timestamp: new Date().toISOString(), event_type: type,
      article_id: articleId || "", condition: state.condition,
      layout: state.layout
    });
    refreshDataPanels();
  }

  function refreshDataPanels() {
    const count = state.events.length;
    const opened = state.events.filter((event) => event.event_type === "article_open").length;
    const reacts = state.events.filter((event) => event.event_type === "reaction").length;
    const completed = state.events.filter((event) => event.event_type === "preview_complete").length;
    const statsMarkup = [
      ["Sample studies", "1", "Fictional study"],
      ["Conditions", "3", "Configurable examples"],
      ["Events", String(count), "Generated locally"],
      ["Previews completed", String(completed), "In this browser tab"]
    ].map((item) =>
      '<div class="stat"><div class="stat-label">' + item[0] +
      '</div><div class="stat-value">' + item[1] +
      '</div><div class="stat-foot">' + item[2] + "</div></div>"
    ).join("");
    byId("stats").innerHTML = statsMarkup;
    byId("event-stats").innerHTML = [
      ["Total events", count],
      ["Article opens", opened],
      ["Reactions", reacts],
      ["Completions", completed]
    ].map(([label, value]) =>
      '<div class="stat"><div class="stat-label">' + label +
      '</div><div class="stat-value">' + value +
      '</div><div class="stat-foot">Local demo only</div></div>'
    ).join("");
    byId("export-count").textContent = String(count);

    const rows = state.events.slice().reverse().map((event) =>
      "<tr><td>" + escapeHTML(event.timestamp.slice(11, 19)) +
      "</td><td>" + escapeHTML(eventLabel(event.event_type)) +
      "</td><td>" + escapeHTML(event.article_id || "—") +
      "</td><td>" + escapeHTML(CONDITION_NAMES[event.condition]) +
      "</td></tr>"
    ).join("");
    byId("event-table").innerHTML = rows ||
      '<tr><td colspan="4" class="empty-cell">No events yet. Open Participant preview and interact with an article.</td></tr>';
  }

  function getOrderedArticles() {
    const ordered = ARTICLES.slice();
    if (state.order === "reverse") ordered.reverse();
    return ordered;
  }

  function renderFeed() {
    const container = byId("feed");
    container.classList.toggle("grid", state.layout === "grid");

    const isHeadlines = state.condition === "headlines";
    const isContext = state.condition === "context";
    container.innerHTML = getOrderedArticles().map((article) => {
      const open = state.expanded.has(article.id);
      const reacted = state.reactions.has(article.id);
      return '<article class="feed-card">' +
        '<div class="feed-picture ' + article.art + '" aria-hidden="true"></div>' +
        '<div class="feed-content">' +
        '<div class="feed-source">' + escapeHTML(article.source) + ' / ' +
        escapeHTML(article.category) + '</div>' +
        '<h3>' + escapeHTML(article.title) + '</h3>' +
        (!isHeadlines ? '<p>' + escapeHTML(article.summary) + '</p>' : '') +
        ((open || isContext) ? '<div class="detail">' + escapeHTML(article.details) + '</div>' : '') +
        '<div class="feed-actions">' +
        '<button type="button" data-open="' + article.id +
        '" aria-expanded="' + (open ? "true" : "false") + '">' +
        (open ? "Collapse article" : "Read more") + '</button>' +
        '<button type="button" data-react="' + article.id +
        '" aria-pressed="' + (reacted ? "true" : "false") + '">' +
        (reacted ? "♥ Liked" : "♡ Like") + '</button>' +
        '</div></div></article>';
    }).join("");

    byId("preview-condition").textContent = CONDITION_NAMES[state.condition];
    byId("preview-layout").textContent = state.layout === "grid" ? "Two-column grid" : "Vertical cards";
    byId("participant-message").textContent = state.completed ?
      "Preview completed. Restart to explore again." : "";

    $$("[data-open]").forEach((button) => {
      button.addEventListener("click", () => {
        const id = button.dataset.open;
        const wasExpanded = state.expanded.has(id);
        if (wasExpanded) state.expanded.delete(id);
        else state.expanded.add(id);
        record(wasExpanded ? "article_close" : "article_open", id);
        renderFeed();
      });
    });
    $$("[data-react]").forEach((button) => {
      button.addEventListener("click", () => {
        const id = button.dataset.react;
        const reacted = state.reactions.has(id);
        if (reacted) state.reactions.delete(id);
        else state.reactions.add(id);
        record(reacted ? "reaction_removed" : "reaction", id);
        renderFeed();
      });
    });
  }

  function show(page, updateHash) {
    if (!PAGES.includes(page)) page = "overview";
    state.page = page;
    $$(".page").forEach((section) => section.classList.toggle("active", section.id === "page-" + page));
    $$(".nav-item").forEach((button) => {
      const active = button.dataset.page === page;
      button.classList.toggle("active", active);
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
    byId("crumb-title").textContent = TITLES[page];
    byId("sidebar").classList.remove("open");
    byId("menu-button").setAttribute("aria-expanded", "false");
    if (page === "participant") renderFeed();
    if (page === "events" || page === "overview" || page === "export") refreshDataPanels();
    if (updateHash && location.hash !== "#" + page) history.replaceState(null, "", "#" + page);
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function csvCell(value) {
    const string = String(value == null ? "" : value);
    return '"' + string.replace(/"/g, '""') + '"';
  }

  function exportCSV() {
    const fields = ["timestamp", "event_type", "article_id", "condition", "layout"];
    const data = [fields.join(",")].concat(state.events.map((event) =>
      fields.map((key) => csvCell(event[key])).join(",")
    )).join("\r\n") + "\r\n";
    const blob = new Blob([data], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "newslab-showcase-events.csv";
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function reset() {
    state.condition = "balanced"; state.layout = "cards"; state.order = "fixed";
    state.events.length = 0; state.expanded.clear(); state.reactions.clear();
    state.completed = false;
    byId("condition").value = "balanced";
    byId("layout").value = "cards";
    byId("order").value = "fixed";
    renderFeed(); refreshDataPanels();
    show("overview", true);
  }

  $$(".nav-item").forEach((button) =>
    button.addEventListener("click", () => show(button.dataset.page, true))
  );
  $$("[data-goto]").forEach((button) =>
    button.addEventListener("click", () => show(button.dataset.goto, true))
  );

  [["condition", "condition"], ["layout", "layout"], ["order", "order"]]
    .forEach(([id, key]) => byId(id).addEventListener("change", (event) => {
      state[key] = event.target.value;
      state.expanded.clear();
      state.reactions.clear();
      state.completed = false;
      renderFeed();
    }));

  byId("restart-preview").addEventListener("click", () => {
    state.expanded.clear(); state.reactions.clear(); state.completed = false;
    record("preview_restart");
    renderFeed();
  });
  byId("complete-preview").addEventListener("click", () => {
    state.completed = true;
    record("preview_complete");
    renderFeed();
    byId("participant-message").textContent = "Preview completed. View your example interactions in Event explorer.";
  });
  byId("clear-events").addEventListener("click", () => {
    state.events.length = 0; refreshDataPanels();
  });
  byId("export-csv").addEventListener("click", exportCSV);
  byId("reset-button").addEventListener("click", reset);
  byId("menu-button").addEventListener("click", () => {
    const open = byId("sidebar").classList.toggle("open");
    byId("menu-button").setAttribute("aria-expanded", String(open));
  });
  window.addEventListener("hashchange", () => show(location.hash.slice(1), false));

  renderFeed();
  refreshDataPanels();
  show(location.hash.slice(1) || "overview", false);
}());