(() => {
  const root = document.getElementById("blog-list");
  if (!root) return;

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[ch]));
  }

  function formatDate(value) {
    const raw = String(value || "");
    const iso = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw + "T12:00:00" : raw;
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return raw;
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York", month: "long", day: "numeric", year: "numeric"
    }).format(date);
  }

  fetch("data/blog.json")
    .then((response) => {
      if (!response.ok) throw new Error(String(response.status));
      return response.json();
    })
    .then((data) => {
      const posts = (Array.isArray(data) ? data : (data && data.posts) || []).slice().sort((a, b) => (
        String(b.date || "").localeCompare(String(a.date || ""))
      ));
      root.innerHTML = posts.map((post) => {
        const images = Array.isArray(post.images) ? post.images.filter(Boolean) : [];
        const gallery = images.length
          ? `<div class="blog-images">${images.map((src) => `<img src="${escapeHtml(src)}" alt="">`).join("")}</div>`
          : "";
        const by = post.author ? ` · ${escapeHtml(post.author)}` : "";
        return `<article class="blog-post"><h2>${escapeHtml(post.title || "")}</h2><p class="record-meta">${escapeHtml(formatDate(post.date))}${by}</p><p>${escapeHtml(post.text || "")}</p>${gallery}</article>`;
      }).join("");
    })
    .catch(() => {
      root.innerHTML = "<p class=\"placeholder\">Placeholder posts could not be loaded.</p>";
    });
})();
