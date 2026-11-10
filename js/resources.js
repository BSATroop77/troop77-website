(() => {
  const list = document.getElementById("resource-list");
  if (!list) return;

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[ch]));
  }

  fetch(list.dataset.src)
    .then((response) => {
      if (!response.ok) throw new Error(String(response.status));
      return response.json();
    })
    .then((data) => {
      const links = Array.isArray(data) ? data : (data && data.links) || [];
      list.innerHTML = links.map((item) => {
        const title = escapeHtml(item.title || "");
        const description = item.description ? `<p>${escapeHtml(item.description)}</p>` : "";
        const url = String(item.url || "");
        if (/^https?:\/\//i.test(url)) {
          const href = escapeHtml(url);
          return `<li><a class="resource-card" href="${href}" rel="noopener" target="_blank"><h2>${title}</h2>${description}<p class="resource-url">${href}</p></a></li>`;
        }
        return `<li><div class="resource-card is-pending"><h2>${title}</h2>${description}</div></li>`;
      }).join("");
    })
    .catch(() => {
      list.innerHTML = "<li><p class=\"placeholder\">These resources could not be loaded.</p></li>";
    });
})();
