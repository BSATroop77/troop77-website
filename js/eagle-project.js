(() => {
  const root = document.getElementById("eagle-story");
  const slug = document.body.dataset.eagle;
  if (!root || !slug) return;

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[ch]));
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
      const links = (page.links || []).filter((link) => /^https?:\/\//i.test(link.url || "")).map((link) => (
        `<li><a href="${escapeHtml(link.url)}" rel="noopener" target="_blank">${escapeHtml(link.title || link.url)}</a></li>`
      )).join("");
      root.innerHTML = `${date}${paragraphs}`
        + (photos ? `<div class="eagle-photos${page.photoShape === "portrait" ? " is-portrait" : ""}">${photos}</div>` : "")
        + (links ? `<h2>More</h2><ul class="eagle-links">${links}</ul>` : "");
    })
    .catch(() => {
      root.innerHTML = "<p class=\"placeholder\">This Eagle project could not be loaded.</p>";
    });
})();
