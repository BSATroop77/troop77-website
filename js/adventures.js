(() => {
  const root = document.getElementById("adventures");
  if (!root) return;

  const mark = `<span class="adventure-mark" aria-hidden="true"><svg viewBox="0 0 24 24"><path fill="currentColor" d="M1.5 20 9 7l3.2 5.4L15 8l7.5 12z"/></svg></span>`;

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[ch]));
  }

  function renderAdventure(item) {
    const name = escapeHtml(item.name || "");
    const image = escapeHtml(item.image || "");
    const description = item.description
      ? `<p class="adventure-desc">${escapeHtml(item.description)}</p>`
      : "";
    const focus = /^[\d.]+% [\d.]+%$/.test(String(item.focus || ""))
      ? ` style="object-position:${item.focus}"`
      : "";
    const photo = image
      ? `<img alt="" src="${image}"${focus}>`
      : "";
    return `<article class="card adventure-card"><div class="adventure-frame">${photo}${mark}<h2 class="adventure-name">${name}</h2></div>${description}</article>`;
  }

  fetch("data/adventures.json")
    .then((response) => {
      if (!response.ok) throw new Error(String(response.status));
      return response.json();
    })
    .then((data) => {
      const adventures = Array.isArray(data) ? data : (data && data.adventures);
      if (!adventures || !adventures.length) return;
      root.innerHTML = adventures.map(renderAdventure).join("");
      root.querySelectorAll(".adventure-frame img").forEach((img) => {
        const frame = img.closest(".adventure-frame");
        const show = () => frame.classList.add("has-photo");
        if (img.complete && img.naturalWidth > 0) show();
        else {
          img.addEventListener("load", show);
          img.addEventListener("error", () => img.remove());
        }
      });
    })
    .catch(() => {});
})();
