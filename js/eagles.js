(() => {
  const list = document.getElementById("eagle-list");
  const count = document.getElementById("eagle-count");
  if (!list) return;

  const emblem = `<svg aria-hidden="true"><use href="#i-fleur"/></svg>`;

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[ch]));
  }

  fetch("data/eagles.json")
    .then((response) => {
      if (!response.ok) throw new Error(String(response.status));
      return response.json();
    })
    .then((data) => {
      const eagles = Array.isArray(data) ? data : (data && data.eagles) || [];
      const years = eagles.map((scout) => {
        const match = String(scout.date || "").match(/\d{4}/);
        return match ? Number(match[0]) : null;
      }).filter((year) => year);
      const since = years.length ? Math.min(...years) : "";
      const noun = eagles.length === 1 ? "Eagle Scout" : "Eagle Scouts";
      if (count) count.textContent = since ? `${eagles.length} ${noun} since ${since}` : `${eagles.length} ${noun}`;
      list.innerHTML = eagles.map((scout) => {
        const name = escapeHtml(scout.name || "");
        const date = scout.date ? `<p class="eagle-date">${escapeHtml(scout.date)}</p>` : "";
        const project = scout.project ? `<p class="eagle-project">${escapeHtml(scout.project)}</p>` : "";
        return `<li class="eagle-card"><div class="eagle-mark">${emblem}</div><h2>${name}</h2>${date}${project}</li>`;
      }).join("");
    })
    .catch(() => {
      list.innerHTML = "<li><p class=\"placeholder\">The Eagle Scout list could not be loaded.</p></li>";
    });
})();
