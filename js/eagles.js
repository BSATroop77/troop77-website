(() => {
  const list = document.getElementById("eagle-list");
  const count = document.getElementById("eagle-count");
  if (!list) return;

  const silhouette = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.2" fill="currentColor"/><path fill="currentColor" d="M5.2 19.2c.4-3.6 2.8-5.7 6.8-5.7s6.4 2.1 6.8 5.7c.1.7-.4 1.3-1.1 1.3H6.3c-.7 0-1.2-.6-1.1-1.3z"/></svg>`;
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
        const photo = /^img\/eagles\/[^"]+\.(?:jpe?g|png|webp)$/i.test(scout.photo || "")
          ? `<img src="${escapeHtml(scout.photo)}" alt="">`
          : silhouette;
        const page = scout.projectPage && scout.projectPage.slug
          ? `<a class="eagle-more" href="eagles/${escapeHtml(scout.projectPage.slug)}.html">View Project</a>`
          : "";
        return `<li class="eagle-card"><div class="eagle-portrait">${photo}</div><h2>${name}</h2>${date}${project}${page}</li>`;
      }).join("");
      list.querySelectorAll(".eagle-portrait img").forEach((img) => {
        img.addEventListener("error", () => {
          const frame = img.closest(".eagle-portrait");
          img.remove();
          frame.insertAdjacentHTML("beforeend", silhouette);
        });
      });
    })
    .catch(() => {
      list.innerHTML = "<li><p class=\"placeholder\">The Eagle Scout list could not be loaded.</p></li>";
    });
})();
