(() => {
  const list = document.getElementById("trip-list");
  if (!list) return;

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[ch]));
  }

  fetch("data/camping-trips.json")
    .then((response) => {
      if (!response.ok) throw new Error(String(response.status));
      return response.json();
    })
    .then((data) => {
      const trips = Array.isArray(data) ? data : (data && data.trips) || [];
      list.innerHTML = trips.map((trip) => (
        `<li><p class="record-meta">${escapeHtml(trip.date || "")}</p><h2>${escapeHtml(trip.place || "")}</h2><p>${escapeHtml(trip.notes || "")}</p></li>`
      )).join("");
    })
    .catch(() => {
      list.innerHTML = "<li><p class=\"placeholder\">Placeholder trips could not be loaded.</p></li>";
    });
})();
