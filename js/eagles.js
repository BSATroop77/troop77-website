(() => {
  const list = document.getElementById("eagle-list");
  const count = document.getElementById("eagle-count");
  if (!list) return;

  const emblem = `<svg aria-hidden="true"><use href="#i-fleur"/></svg>`;
  const months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[ch]));
  }

  function stamp(date) {
    const match = String(date || "").match(/^([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})$/);
    if (!match) return null;
    const month = months.indexOf(match[1].toLowerCase());
    if (month < 0) return null;
    return Date.UTC(Number(match[3]), month, Number(match[2]));
  }

  function byDate(scouts) {
    const dated = [];
    const undated = [];
    scouts.forEach((scout, index) => {
      const time = stamp(scout.date);
      if (time == null) undated.push({ scout, index });
      else dated.push({ scout, index, time });
    });
    dated.sort((a, b) => b.time - a.time || a.index - b.index);
    const ordered = dated.map((item) => item.scout);
    undated.forEach(({ scout, index }) => {
      let after = -1;
      for (let i = index - 1; i >= 0; i -= 1) {
        const pos = ordered.indexOf(scouts[i]);
        if (pos >= 0) {
          after = pos;
          break;
        }
      }
      ordered.splice(after + 1, 0, scout);
    });
    return ordered;
  }

  function projectHtml(text, abbreviations) {
    const keys = Object.keys(abbreviations || {}).sort((a, b) => b.length - a.length);
    if (!keys.length) return escapeHtml(text);
    const pattern = new RegExp(`\\b(${keys.map((key) => key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`, "g");
    let html = "";
    let last = 0;
    for (const match of text.matchAll(pattern)) {
      html += escapeHtml(text.slice(last, match.index));
      const word = match[1];
      html += `<abbr title="${escapeHtml(abbreviations[word])}">${escapeHtml(word)}</abbr>`;
      last = match.index + word.length;
    }
    html += escapeHtml(text.slice(last));
    return html;
  }

  fetch("data/eagles.json")
    .then((response) => {
      if (!response.ok) throw new Error(String(response.status));
      return response.json();
    })
    .then((data) => {
      const source = Array.isArray(data) ? data : (data && data.eagles) || [];
      const eagles = byDate(source);
      const abbreviations = (data && data.abbreviations) || {};
      const years = eagles.map((scout) => stamp(scout.date)).filter((time) => time != null).map((time) => new Date(time).getUTCFullYear());
      const since = years.length ? Math.min(...years) : "";
      const noun = eagles.length === 1 ? "Eagle Scout" : "Eagle Scouts";
      if (count) count.textContent = since ? `${eagles.length} ${noun} since ${since}` : `${eagles.length} ${noun}`;
      list.innerHTML = eagles.map((scout) => {
        const name = escapeHtml(scout.name || "");
        const date = scout.date ? `<p class="eagle-date">${escapeHtml(scout.date)}</p>` : "";
        const project = scout.project ? `<p class="eagle-project">${projectHtml(scout.project, abbreviations)}</p>` : "";
        return `<li class="eagle-card"><div class="eagle-mark">${emblem}</div><h2>${name}</h2>${date}${project}</li>`;
      }).join("");
    })
    .catch(() => {
      list.innerHTML = "<li><p class=\"placeholder\">The Eagle Scout list could not be loaded.</p></li>";
    });
})();
