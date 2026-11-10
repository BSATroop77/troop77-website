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
      list.innerHTML = camps.map((camp) => (
        `<li><p class="record-meta">${escapeHtml(camp.year || "")}</p><h2>${escapeHtml(camp.camp || "")}</h2><p>${escapeHtml(camp.location || "")}</p></li>`
      )).join("");
    })
    .catch(() => {
      list.innerHTML = "<li><p class=\"placeholder\">Placeholder list could not be loaded.</p></li>";
    });
})();
