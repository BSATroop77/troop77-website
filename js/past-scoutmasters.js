(() => {
  const list = document.getElementById("scoutmasters");
  if (!list) return;

  const silhouette = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.2" fill="currentColor"/><path fill="currentColor" d="M5.2 19.2c.4-3.6 2.8-5.7 6.8-5.7s6.4 2.1 6.8 5.7c.1.7-.4 1.3-1.1 1.3H6.3c-.7 0-1.2-.6-1.1-1.3z"/></svg>`;

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[ch]));
  }

  fetch("data/past-scoutmasters.json")
    .then((response) => {
      if (!response.ok) throw new Error(String(response.status));
      return response.json();
    })
    .then((data) => {
      const people = Array.isArray(data) ? data : (data && data.scoutmasters) || [];
      list.innerHTML = people.map((person) => {
        const name = escapeHtml(person.name || "");
        const years = escapeHtml(person.years || "");
        const title = person.title ? `<p class="sm-title">${escapeHtml(person.title)}</p>` : "";
        const face = person.face ? ` class="${escapeHtml(person.face)}"` : "";
        const photo = person.image
          ? `<img${face} src="${escapeHtml(person.image)}" alt="${name}">`
          : silhouette;
        return `<li class="sm-card"><div class="leader-frame">${photo}</div><h2>${name}</h2><p class="sm-years">${years}</p>${title}</li>`;
      }).join("");
      list.querySelectorAll(".leader-frame img").forEach((img) => {
        img.addEventListener("error", () => {
          const frame = img.closest(".leader-frame");
          img.remove();
          frame.insertAdjacentHTML("beforeend", silhouette);
        });
      });
    })
    .catch(() => {
      list.innerHTML = "<li><p class=\"placeholder\">The scoutmaster list could not be loaded.</p></li>";
    });
})();
