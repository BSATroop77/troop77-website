(() => {
  const list = document.getElementById("scoutmasters");
  if (!list) return;

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
      list.innerHTML = people.map((person) => (
        `<li><p class="record-meta">${escapeHtml(person.years || "")}</p><h2>${escapeHtml(person.name || "")}</h2></li>`
      )).join("");
    })
    .catch(() => {
      list.innerHTML = "<li><p class=\"placeholder\">Placeholder list could not be loaded.</p></li>";
    });
})();
