#!/usr/bin/env python3
"""Refresh data/facebook.json from the Graph API and store photos locally.

Reads FACEBOOK_PAGE_TOKEN from the environment. Never prints the token.
On any failure, exits before replacing the existing JSON or images.
"""

from __future__ import annotations

import json
import os
import sys
import tempfile
import urllib.error
import urllib.request
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

PAGE_ID = "957852030740744"
PAGE_NAME = "Scouting America Troop 77 NPR"
PAGE_URL = "https://www.facebook.com/Troop77NPR"
API_URL = (
    "https://graph.facebook.com/v21.0/"
    f"{PAGE_ID}/posts?fields=id,message,created_time,permalink_url,full_picture&limit=4"
)
ROOT = Path(__file__).resolve().parents[1]
OUT_JSON = ROOT / "data" / "facebook.json"
IMG_DIR = ROOT / "img" / "news"
NY = ZoneInfo("America/New_York")


def redact(text: str) -> str:
    token = os.environ.get("FACEBOOK_PAGE_TOKEN", "")
    if token:
        text = text.replace(token, "[redacted]")
    return text


def fail(message: str) -> None:
    print(redact(message), file=sys.stderr)
    sys.exit(1)


def safe_filename(post_id: str) -> str:
    cleaned = "".join(ch if ch.isalnum() or ch in "-_" else "_" for ch in post_id)
    if not cleaned:
        fail("Facebook post id was empty.")
    return cleaned + ".jpg"


def api_get(token: str) -> dict:
    request = urllib.request.Request(
        API_URL,
        headers={
            "Authorization": f"Bearer {token}",
            "User-Agent": "Troop77News/1.0",
            "Accept": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            raw = response.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as err:
        body = err.read().decode("utf-8", errors="replace")
        detail = ""
        try:
            payload = json.loads(body)
            detail = str((payload.get("error") or {}).get("message") or "")
        except json.JSONDecodeError:
            detail = "The Facebook API returned a non-JSON error."
        fail(f"Facebook API request failed ({err.code}). {detail}".strip())
    except urllib.error.URLError as err:
        fail(f"Facebook API request failed: {err.reason}")
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError:
        fail("Facebook API returned invalid JSON.")
    if "error" in payload:
        fail(f"Facebook API error: {(payload.get('error') or {}).get('message') or 'unknown error'}")
    if "data" not in payload or not isinstance(payload["data"], list):
        fail("Facebook API response did not include a posts list.")
    return payload


def download_image(url: str, dest: Path) -> None:
    request = urllib.request.Request(url, headers={"User-Agent": "Troop77News/1.0"})
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            data = response.read()
            content_type = (response.headers.get("Content-Type") or "").lower()
    except urllib.error.URLError as err:
        fail(f"Could not download a post photo: {getattr(err, 'reason', err)}")
    if not data or not content_type.startswith("image/"):
        fail("A post photo download did not return an image.")
    dest.write_bytes(data)


def build(posts: list[dict], image_dir: Path) -> dict:
    normalized = []
    for post in posts:
        post_id = str(post.get("id") or "").strip()
        if not post_id:
            fail("Facebook returned a post without an id.")
        picture = str(post.get("full_picture") or "").strip()
        local = ""
        if picture:
            if picture.startswith("img/news/"):
                local = picture
            else:
                filename = safe_filename(post_id)
                download_image(picture, image_dir / filename)
                local = f"img/news/{filename}"
        normalized.append({
            "id": post_id,
            "message": str(post.get("message") or ""),
            "created_time": str(post.get("created_time") or ""),
            "permalink_url": str(post.get("permalink_url") or ""),
            "full_picture": local,
        })
    normalized.sort(key=lambda item: item["created_time"], reverse=True)
    return {
        "updated": datetime.now(NY).isoformat(timespec="seconds"),
        "page": {"id": PAGE_ID, "name": PAGE_NAME, "url": PAGE_URL},
        "posts": normalized[:4],
    }


def main() -> int:
    token = os.environ.get("FACEBOOK_PAGE_TOKEN", "").strip()
    if not token:
        fail("FACEBOOK_PAGE_TOKEN is not set. Existing news files were left unchanged.")
    payload = api_get(token)
    with tempfile.TemporaryDirectory() as tmp:
        tmp_images = Path(tmp)
        document = build(payload["data"], tmp_images)
        IMG_DIR.mkdir(parents=True, exist_ok=True)
        for post in document["posts"]:
            if not post["full_picture"]:
                continue
            filename = Path(post["full_picture"]).name
            source = tmp_images / filename
            if source.exists():
                (IMG_DIR / filename).write_bytes(source.read_bytes())
        OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
        text = json.dumps(document, indent=2, ensure_ascii=False) + "\n"
        if "fbcdn" in text or "scontent" in text:
            fail("Refusing to write Facebook CDN URLs into facebook.json.")
        OUT_JSON.write_text(text, encoding="utf-8")
    print(f"wrote {OUT_JSON} posts={len(document['posts'])}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
