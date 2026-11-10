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

  function nyClock(date) {
    return Object.fromEntries(new Intl.DateTimeFormat("en-US", {
      timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23"
    }).formatToParts(date).map((part) => [part.type, part.value]));
  }

  function inclusiveEnd(event) {
    if (event.allDay) {
      const last = addDays(event.end, -1);
      return last < event.start ? event.start : last;
    }
    const parts = nyClock(new Date(event.end));
    let iso = `${parts.year}-${parts.month}-${parts.day}`;
    const midnight = (parts.hour === "00" || parts.hour === "24") && parts.minute === "00" && parts.second === "00";
    if (midnight) iso = addDays(iso, -1);
    const start = startDate(event);
    return iso < start ? start : iso;
  }

  function coveredDays(event) {
    const days = [];
    const last = inclusiveEnd(event);
    for (let day = startDate(event); day <= last; day = addDays(day, 1)) days.push(day);
    return days;
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

  function weekdayShort(iso) {
    const [year, month, day] = iso.split("-").map(Number);
    return DOW[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
  }

  function spanLabel(event) {
    const days = coveredDays(event);
    if (days.length < 2) return "";
    const fmt = (iso) => `${weekdayShort(iso)} ${shortDate(iso)}`;
    return `${fmt(days[0])} – ${fmt(days[days.length - 1])}`;
  }

  function whenText(event) {
    if (event.allDay) return coveredDays(event).length > 1 ? spanLabel(event) : "All day";
    const start = startDate(event);
    const end = inclusiveEnd(event);
    if (start === end) return `${formatTime(event.start)} – ${formatTime(event.end)}`;
    return `${formatTime(event.start)} – ${formatTime(event.end)}`;
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

  function monthWeeks(year, month) {
    const key = `${year}-${String(month).padStart(2, "0")}`;
    const cells = [];
    const lead = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
    for (let i = 0; i < lead; i += 1) cells.push(null);
    for (let day = 1; day <= daysInMonth(year, month); day += 1) {
      cells.push(`${key}-${String(day).padStart(2, "0")}`);
    }
    while (cells.length % 7) cells.push(null);
    const weeks = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
    return weeks;
  }

  function renderMonth(year, month, events, today) {
    const key = `${year}-${String(month).padStart(2, "0")}`;
    const monthStart = `${key}-01`;
    const monthEnd = `${key}-${String(daysInMonth(year, month)).padStart(2, "0")}`;
    const inMonth = events.filter((event) => {
      const days = coveredDays(event);
      return days[days.length - 1] >= monthStart && days[0] <= monthEnd;
    });

    const weeks = monthWeeks(year, month).map((dates) => {
      const segments = [];
      inMonth.forEach((event) => {
        const covered = new Set(coveredDays(event));
        let startCol = -1;
        let endCol = -1;
        dates.forEach((iso, index) => {
          if (iso && covered.has(iso)) {
            if (startCol < 0) startCol = index;
            endCol = index;
          }
        });
        if (startCol < 0) return;
        const all = coveredDays(event);
        segments.push({
          event,
          startCol,
          endCol,
          isStart: dates[startCol] === all[0],
          isEnd: dates[endCol] === all[all.length - 1]
        });
      });
      segments.sort((a, b) => a.startCol - b.startCol || (b.endCol - b.startCol) - (a.endCol - a.startCol) || a.event.title.localeCompare(b.event.title));
      const lanes = [];
      segments.forEach((segment) => {
        let lane = lanes.findIndex((row) => row.every((other) => segment.endCol < other.startCol || segment.startCol > other.endCol));
        if (lane < 0) {
          lane = lanes.length;
          lanes.push([]);
        }
        lanes[lane].push(segment);
        segment.lane = lane;
      });
      return { dates, segments, lanes: Math.max(lanes.length, 1) };
    });

    const desk = weeks.map(({ dates, segments, lanes }) => {
      const days = dates.map((iso) => {
        if (!iso) return `<div class="cal-day is-out" style="grid-row:1 / span ${lanes + 1}"></div>`;
        const dayNum = Number(iso.slice(-2));
        return `<div class="cal-day${iso === today ? " is-today" : ""}" style="grid-row:1 / span ${lanes + 1}"><span class="cal-num">${dayNum}</span></div>`;
      }).join("");
      const bars = segments.map((segment) => {
        const label = spanLabel(segment.event) || whenText(segment.event);
        const loc = segment.event.location ? ` · ${segment.event.location}` : "";
        const map = segment.isStart && segment.event.location
          ? `<a class="cal-loc" href="${mapsUrl(segment.event.location)}" rel="noopener" target="_blank">Map</a>`
          : "";
        return `<div class="cal-bar${segment.isStart ? " is-start" : ""}${segment.isEnd ? " is-end" : ""}${isQuiet(segment.event) ? " is-quiet" : ""}" style="grid-column:${segment.startCol + 1} / ${segment.endCol + 2};grid-row:${segment.lane + 2}" title="${escapeHtml(label + loc)}"><span>${escapeHtml(segment.event.title)}</span>${map}</div>`;
      }).join("");
      return `<div class="cal-week">${days}${bars}</div>`;
    }).join("");

    const byDay = new Map();
    inMonth.forEach((event) => {
      coveredDays(event).forEach((day) => {
        if (day < monthStart || day > monthEnd) return;
        if (!byDay.has(day)) byDay.set(day, []);
        byDay.get(day).push(event);
      });
    });
    const groups = [...byDay.entries()];
    if (today.slice(0, 7) === key && !byDay.has(today)) groups.push([today, []]);
    groups.sort((a, b) => a[0].localeCompare(b[0]));
    const agenda = groups.length ? groups.map(([iso, items]) => {
      const body = items.length ? items.map((event) => {
        const days = coveredDays(event).filter((day) => day >= monthStart && day <= monthEnd);
        const primary = iso === days[0];
        const range = spanLabel(event);
        if (!primary) {
          return `<p class="cal-continue${isQuiet(event) ? " is-quiet" : ""}"><span>Continues</span> ${escapeHtml(event.title)}${range ? ` · ${escapeHtml(range)}` : ""}</p>`;
        }
        return `<article class="cal-item${isQuiet(event) ? " is-quiet" : ""}">
            ${range ? `<p class="cal-span">${escapeHtml(range)}</p>` : ""}
            <p class="cal-when">${escapeHtml(whenText(event))}</p>
            <h3>${escapeHtml(event.title)}</h3>
            ${locationLink(event.location)}
          </article>`;
      }).join("") : `<p class="cal-empty">No events today.</p>`;
      return `<section class="cal-group${iso === today ? " is-today" : ""}"><h3>${longDate(iso)}</h3>${body}</section>`;
    }).join("") : `<p class="cal-empty">No events scheduled.</p>`;

    return `<section class="cal-month">
      <h2>${MONTHS[month - 1]} ${year}</h2>
      <div class="cal-desk">
        <div class="cal-dow">${DOW.map((name) => `<span>${name}</span>`).join("")}</div>
        ${desk}
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
