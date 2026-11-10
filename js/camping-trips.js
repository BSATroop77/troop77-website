(() => {
  const list = document.getElementById("trip-list");
  const mapEl = document.getElementById("trip-map");
  if (!list || !mapEl) return;

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

      if (!window.L) return;
      const map = L.map(mapEl, { scrollWheelZoom: false });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }).addTo(map);
      const markers = [];
      trips.forEach((trip) => {
        const lat = Number(trip.lat);
        const lng = Number(trip.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
        const marker = L.marker([lat, lng]).addTo(map);
        marker.bindPopup(`<strong>${escapeHtml(trip.place || "")}</strong><br>${escapeHtml(trip.date || "")}`);
        markers.push(marker);
      });
      if (markers.length) {
        map.fitBounds(L.featureGroup(markers).getBounds().pad(0.35));
      } else {
        map.setView([28.27, -82.72], 8);
      }
      requestAnimationFrame(() => map.invalidateSize());
    })
    .catch(() => {
      list.innerHTML = "<li><p class=\"placeholder\">Placeholder trips could not be loaded.</p></li>";
    });
})();
