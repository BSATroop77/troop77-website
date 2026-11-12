(() => {
  const list = document.getElementById("spls");
  const count = document.getElementById("spl-count");
  if (!list) return;

  const silhouette = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.2" fill="currentColor"/><path fill="currentColor" d="M5.2 19.2c.4-3.6 2.8-5.7 6.8-5.7s6.4 2.1 6.8 5.7c.1.7-.4 1.3-1.1 1.3H6.3c-.7 0-1.2-.6-1.1-1.3z"/></svg>`;

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[ch]));
  }

  fetch("data/past-spls.json")
    .then((response) => {
      if (!response.ok) throw new Error(String(response.status));
      return response.json();
    })
    .then((data) => {
      const people = Array.isArray(data) ? data : (data && data.spls) || [];
      const years = people.map((p) => (String(p.years || "").match(/\d{4}/g) || []).map(Number)).flat();
      const since = years.length ? Math.min(...years) : "";
      const noun = people.length === 1 ? "Senior Patrol Leader term" : "Senior Patrol Leader terms";
      if (count) count.textContent = since ? `${people.length} ${noun} since ${since}` : `${people.length} ${noun}`;
      list.innerHTML = people.map((person) => {
        const name = escapeHtml(person.name || "");
        const years = person.years ? `<p class="eagle-date">${escapeHtml(person.years)}</p>` : "";
        const note = person.note ? `<p class="eagle-project">${escapeHtml(person.note)}</p>` : "";
        const photo = /^img\/[^"]+\.(?:jpe?g|png|webp)$/i.test(person.image || "")
          ? `<img src="${escapeHtml(person.image)}" alt="${name}">`
          : silhouette;
        return `<li class="eagle-card"><div class="eagle-portrait">${photo}</div><h2>${name}</h2>${years}${note}</li>`;
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
      list.innerHTML = "<li><p class=\"placeholder\">The SPL list could not be loaded.</p></li>";
    });
})();
