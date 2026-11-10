(() => {
  const feed = document.getElementById("news-feed");
  if (!feed) return;

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[ch]));
  }

  function postsFrom(data) {
    const posts = Array.isArray(data) ? data : (data && data.posts);
    return Array.isArray(posts) ? posts : [];
  }

  function renderCards(posts, extraClass) {
    const cls = extraClass ? "cards news-cards " + extraClass : "cards news-cards";
    return `<div class="${cls}">${posts.map(renderPost).join("")}</div>`;
  }

  function linkify(message) {
    const re = /https?:\/\/[^\s<>"']+/gi;
    const text = String(message);
    let out = "";
    let last = 0;
    for (const match of text.matchAll(re)) {
      out += escapeHtml(text.slice(last, match.index));
      let url = match[0];
      let trail = "";
      while (url && /[.,;:!?]$/.test(url)) {
        trail = url.slice(-1) + trail;
        url = url.slice(0, -1);
      }
      const opens = (url.match(/\(/g) || []).length;
      let closes = (url.match(/\)/g) || []).length;
      while (url.endsWith(")") && closes > opens) {
        trail = ")" + trail;
        url = url.slice(0, -1);
        closes -= 1;
      }
      if (url) {
        const safe = escapeHtml(url);
        out += `<a href="${safe}" rel="noopener" target="_blank">${safe}</a>${escapeHtml(trail)}`;
      } else {
        out += escapeHtml(match[0]);
      }
      last = match.index + match[0].length;
    }
    return out + escapeHtml(text.slice(last));
  }

  function renderPost(post) {
    const when = post.created_time
      ? new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York", month: "short", day: "numeric", year: "numeric"
      }).format(new Date(post.created_time))
      : "";
    const photo = post.full_picture
      ? `<img class="news-photo" src="${escapeHtml(post.full_picture)}" alt="">`
      : "";
    const text = post.message ? `<p class="news-text">${linkify(post.message)}</p>` : "";
    const link = post.permalink_url
      ? `<a href="${escapeHtml(post.permalink_url)}" rel="noopener" target="_blank">View on Facebook</a>`
      : "";
    return `<article class="card news-card">${photo}<p class="news-date">${escapeHtml(when)}</p>${text}${link}</article>`;
  }

  const frame = feed.querySelector("iframe");
  if (frame) {
    const hideIfBlocked = () => {
      try {
        const href = frame.contentWindow.location.href;
        if (!href || href === "about:blank" || href.indexOf("chrome-error:") === 0) {
          const embed = frame.closest(".fb-embed");
          if (embed) embed.hidden = true;
        }
      } catch (err) {
        // A cross-origin document means the Facebook plugin loaded.
      }
    };
    frame.addEventListener("load", hideIfBlocked);
  }

  fetch("data/facebook.json")
    .then((response) => {
      if (!response.ok) throw new Error(String(response.status));
      return response.json();
    })
    .then((data) => {
      const posts = postsFrom(data);
      if (!posts.length) throw new Error("empty");
      const latest = posts.slice().sort((a, b) => String(b.created_time || "").localeCompare(String(a.created_time || ""))).slice(0, 6);
      feed.innerHTML = renderCards(latest);
    })
    .catch(() => {});

  const older = document.getElementById("older-news");
  const olderFeed = document.getElementById("older-news-feed");
  if (older && olderFeed) {
    fetch("data/older-news.json")
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.json();
      })
      .then((data) => {
        const posts = postsFrom(data);
        if (!posts.length) return;
        olderFeed.innerHTML = renderCards(posts, "older-cards");
        older.hidden = false;
      })
      .catch(() => {});
  }
})();
