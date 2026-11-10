(() => {
  const list = document.getElementById("camp-list");
  if (!list) return;

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[ch]));
  }

  fetch("data/summer-camps.json")
    .then((response) => {
      if (!response.ok) throw new Error(String(response.status));
      return response.json();
    })
    .then((data) => {
      const camps = Array.isArray(data) ? data : (data && data.camps) || [];
      list.innerHTML = camps.map((camp) => {
        const flags = [
          camp.cancelled ? "is-cancelled" : "",
          camp.tbd ? "is-tbd" : ""
        ].filter(Boolean).join(" ");
        const tag = camp.cancelled ? `<span class="camp-tag">Cancelled</span>` : "";
        const location = camp.location ? `<p>${escapeHtml(camp.location)}</p>` : "";
        return `<li class="camp-card ${flags}"><span class="camp-year">${escapeHtml(camp.year || "")}</span><div><h2>${escapeHtml(camp.camp || "")}</h2>${tag}${location}</div></li>`;
      }).join("");
    })
    .catch(() => {
      list.innerHTML = "<li><p class=\"placeholder\">The summer camp list could not be loaded.</p></li>";
    });
})();
