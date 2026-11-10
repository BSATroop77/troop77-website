(() => {
  const list = document.getElementById("trip-list");
  if (!list) return;

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[ch]));
  }

  function placeHtml(trip) {
    const name = escapeHtml(trip.place || "");
    const url = String(trip.url || "");
    if (/^https?:\/\//i.test(url)) {
      return `<a href="${escapeHtml(url)}" rel="noopener" target="_blank">${name}</a>`;
    }
    return name;
  }

  fetch("data/camping-trips.json")
    .then((response) => {
      if (!response.ok) throw new Error(String(response.status));
      return response.json();
    })
    .then((data) => {
      const years = Array.isArray(data) ? data : (data && (data.years || data.trips)) || [];
      const groups = Array.isArray(years) && years.length && years[0].trips
        ? years
        : [{ year: "", trips: years }];
      list.innerHTML = groups.map((group) => {
        const rows = (group.trips || []).map((trip) => {
          const tag = trip.cancelled ? `<span class="trip-tag">Cancelled</span>` : "";
          const where = trip.location ? `<span class="trip-where">${escapeHtml(trip.location)}</span>` : `<span class="trip-where"></span>`;
          const cls = trip.tbd || group.tbd ? "is-tbd" : "";
          return `<li class="trip-row ${cls}"><span class="trip-month">${escapeHtml(trip.month || "")}</span><span class="trip-place">${placeHtml(trip)}${tag}</span>${where}</li>`;
        }).join("");
        const year = escapeHtml(group.year || "");
        return `<details class="trip-year${group.tbd ? " is-tbd" : ""}" open><summary>${year}</summary><ul>${rows}</ul></details>`;
      }).join("");
    })
    .catch(() => {
      list.innerHTML = "<p class=\"placeholder\">The campout list could not be loaded.</p>";
    });
})();
