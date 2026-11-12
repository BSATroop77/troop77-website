(() => {
  const root = document.getElementById("eagle-story");
  const slug = document.body.dataset.eagle;
  if (!root || !slug) return;

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[ch]));
  }

  function youtubeId(value) {
    return /^[A-Za-z0-9_-]{11}$/.test(value || "") ? value : "";
  }

  function videoEntries(video) {
    if (!video) return [];
    const items = Array.isArray(video) ? video : [video];
    return items.map((item) => {
      if (typeof item === "string") {
        const id = youtubeId(item);
        return id ? { id } : null;
      }
      const id = youtubeId(item && item.id);
      if (!id) return null;
      const entry = { id };
      if (item.title) entry.title = String(item.title);
      const start = Number(item.start);
      if (Number.isInteger(start) && start > 0) entry.start = start;
      return entry;
    }).filter(Boolean);
  }

  function videoHtml(video) {
    return videoEntries(video).map((item) => {
      const query = item.start ? `?start=${item.start}` : "";
      const title = item.title || "Eagle project video";
      const caption = item.title
        ? `<figcaption class="eagle-video-caption">${escapeHtml(item.title)}</figcaption>`
        : "";
      return `<figure class="eagle-video-block"><div class="eagle-video"><iframe src="https://www.youtube-nocookie.com/embed/${escapeHtml(item.id)}${query}" title="${escapeHtml(title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>${caption}</figure>`;
    }).join("");
  }

  fetch("../data/eagles.json")
    .then((response) => {
      if (!response.ok) throw new Error(String(response.status));
      return response.json();
    })
    .then((data) => {
      const eagles = (data && data.eagles) || [];
      const scout = eagles.find((item) => item.projectPage && item.projectPage.slug === slug);
      if (!scout) throw new Error("missing");
      const page = scout.projectPage;
      const heading = document.querySelector(".page-head h1 span");
      if (heading) heading.textContent = scout.name || "Eagle Project";
      document.title = `${scout.name || "Eagle Project"} · Eagle Scouts · Troop 77`;
      const date = scout.date ? `<p class="eagle-date">${escapeHtml(scout.date)}</p>` : "";
      const paragraphs = (page.paragraphs || []).map((text) => `<p>${escapeHtml(text)}</p>`).join("");
      const photos = (page.photos || []).map((src) => (
        `<img src="../${escapeHtml(src)}" alt="">`
      )).join("");
      const photosBefore = (page.photosBefore || []).map((src) => (
        `<img src="../${escapeHtml(src)}" alt="">`
      )).join("");
      const links = (page.links || []).filter((link) => /^https?:\/\//i.test(link.url || "")).map((link) => (
        `<li><a href="${escapeHtml(link.url)}" rel="noopener" target="_blank">${escapeHtml(link.title || link.url)}</a></li>`
      )).join("");
      const linksTitle = page.linksTitle || "More";
      root.innerHTML = `${date}${paragraphs}`
        + (photosBefore ? `<div class="eagle-photos">${photosBefore}</div>` : "")
        + videoHtml(page.video)
        + (photos ? `<div class="eagle-photos${page.photoShape === "portrait" ? " is-portrait" : ""}">${photos}</div>` : "")
        + (links ? `<h2>${escapeHtml(linksTitle)}</h2><ul class="eagle-links">${links}</ul>` : "");
    })
    .catch(() => {
      root.innerHTML = "<p class=\"placeholder\">This Eagle project could not be loaded.</p>";
    });
})();
