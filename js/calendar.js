(() => {
  const root = document.getElementById("calendar");
  if (!root) return;

  const TZ = "America/New_York";
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[ch]));
  }

  function nyDate(date) {
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
      timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit"
    }).formatToParts(date).map((part) => [part.type, part.value]));
    return `${parts.year}-${parts.month}-${parts.day}`;
  }

  function addDays(iso, count) {
    const [year, month, day] = iso.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day + count)).toISOString().slice(0, 10);
  }

  function startDate(event) {
    return event.allDay ? event.start : nyDate(new Date(event.start));
  }

  function endDate(event) {
    if (event.allDay) return addDays(event.end, -1);
    return nyDate(new Date(event.end));
  }

  function formatTime(iso) {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: TZ, hour: "numeric", minute: "2-digit"
    }).format(new Date(iso));
  }

  function shortDate(iso) {
    const [, month, day] = iso.split("-").map(Number);
    return `${MONTHS[month - 1].slice(0, 3)} ${day}`;
  }

  function longDate(iso) {
    const [year, month, day] = iso.split("-").map(Number);
    const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    return `${WEEKDAYS[weekday]}, ${MONTHS[month - 1]} ${day}`;
  }

  function whenText(event) {
    if (event.allDay) {
      const last = addDays(event.end, -1);
      return last === event.start ? "All day" : `All day · ${shortDate(event.start)} – ${shortDate(last)}`;
    }
    const start = startDate(event);
    const end = endDate(event);
    if (start === end) return `${formatTime(event.start)} – ${formatTime(event.end)}`;
    return `${shortDate(start)}, ${formatTime(event.start)} – ${shortDate(end)}, ${formatTime(event.end)}`;
  }

  function mapsUrl(location) {
    return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(location);
  }

  function isQuiet(event) {
    return /no\s*scouts/i.test(event.title);
  }

  function locationLink(location) {
    if (!location) return "";
    return `<a class="cal-loc" href="${mapsUrl(location)}" rel="noopener" target="_blank">${escapeHtml(location)}</a>`;
  }

  function daysInMonth(year, month) {
    return new Date(Date.UTC(year, month, 0)).getUTCDate();
  }

  function renderMonth(year, month, events, today) {
    const key = `${year}-${String(month).padStart(2, "0")}`;
    const monthStart = `${key}-01`;
    const monthEnd = `${key}-${String(daysInMonth(year, month)).padStart(2, "0")}`;
    const inMonth = events.filter((event) => {
      const end = event.allDay ? addDays(event.end, -1) : endDate(event);
      return end >= monthStart && startDate(event) <= monthEnd;
    });
    const byDay = new Map();
    inMonth.forEach((event) => {
      const start = startDate(event);
      const day = start < monthStart ? monthStart : start;
      if (!byDay.has(day)) byDay.set(day, []);
      byDay.get(day).push(event);
    });

    let cells = "";
    const lead = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
    for (let i = 0; i < lead; i += 1) cells += `<div class="cal-day is-out"></div>`;
    for (let day = 1; day <= daysInMonth(year, month); day += 1) {
      const iso = `${key}-${String(day).padStart(2, "0")}`;
      const chips = (byDay.get(iso) || []).map((event) => (
        `<div class="cal-chip${isQuiet(event) ? " is-quiet" : ""}">
          <p class="cal-when">${escapeHtml(whenText(event))}</p>
          <p class="cal-title">${escapeHtml(event.title)}</p>
          ${locationLink(event.location)}
        </div>`
      )).join("");
      cells += `<div class="cal-day${iso === today ? " is-today" : ""}"><span class="cal-num">${day}</span>${chips}</div>`;
    }

    const groups = [...byDay.entries()];
    if (today.slice(0, 7) === key && !byDay.has(today)) groups.push([today, []]);
    groups.sort((a, b) => a[0].localeCompare(b[0]));
    const agenda = groups.length ? groups.map(([iso, items]) => {
      const body = items.length
        ? items.map((event) => (
          `<article class="cal-item${isQuiet(event) ? " is-quiet" : ""}">
            <p class="cal-when">${escapeHtml(whenText(event))}</p>
            <h3>${escapeHtml(event.title)}</h3>
            ${locationLink(event.location)}
          </article>`
        )).join("")
        : `<p class="cal-empty">No events today.</p>`;
      return `<section class="cal-group${iso === today ? " is-today" : ""}"><h3>${longDate(iso)}</h3>${body}</section>`;
    }).join("") : `<p class="cal-empty">No events scheduled.</p>`;

    return `<section class="cal-month">
      <h2>${MONTHS[month - 1]} ${year}</h2>
      <div class="cal-desk">
        <div class="cal-dow">${DOW.map((name) => `<span>${name}</span>`).join("")}</div>
        <div class="cal-grid">${cells}</div>
      </div>
      <div class="cal-agenda">${agenda}</div>
    </section>`;
  }

  function render(data) {
    const today = nyDate(new Date());
    const [year, month] = today.split("-").map(Number);
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const fetched = new Intl.DateTimeFormat("en-US", {
      timeZone: TZ, month: "short", day: "numeric", year: "numeric",
      hour: "numeric", minute: "2-digit", timeZoneName: "short"
    }).format(new Date(data.fetchedAt));
    root.innerHTML = `<p class="cal-updated">Updated from Scoutbook · ${escapeHtml(fetched)}</p>
      ${renderMonth(year, month, data.events || [], today)}
      ${renderMonth(nextYear, nextMonth, data.events || [], today)}`;
  }

  fetch("data/calendar.json")
    .then((response) => {
      if (!response.ok) throw new Error(String(response.status));
      return response.json();
    })
    .then(render)
    .catch(() => {
      root.innerHTML = `<p class="cal-error">The calendar couldn’t be loaded right now. Please check back shortly.</p>`;
    });
})();
