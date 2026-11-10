#!/usr/bin/env python3
"""Download the Troop 77 Scoutbook ICS feed and write data/calendar.json.

The window is the 1st of the current month in America/New_York through the
end of the month after next. Event objects contain only uid, title, start,
end, allDay, location, and description.
"""

from __future__ import annotations

import argparse
import html
import json
import re
import sys
import urllib.request
from datetime import date, datetime, time, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

FEED_URL = "https://api.scouting.org/advancements/events/calendar/16991"
NY = ZoneInfo("America/New_York")
UTC = ZoneInfo("UTC")
ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUT = ROOT / "data" / "calendar.json"
WEEKDAYS = {"MO": 0, "TU": 1, "WE": 2, "TH": 3, "FR": 4, "SA": 5, "SU": 6}
UNSPECIFIED_LOCATION = "location was not specified"
MAX_OCCURRENCES = 400


def add_months(year: int, month: int, count: int) -> date:
    index = (year * 12 + (month - 1)) + count
    return date(index // 12, index % 12 + 1, 1)


def window_bounds(now: datetime | None = None) -> tuple[datetime, datetime]:
    now = now or datetime.now(NY)
    start = date(now.year, now.month, 1)
    end = add_months(now.year, now.month, 3)
    return (
        datetime.combine(start, time.min, NY),
        datetime.combine(end, time.min, NY),
    )


def unfold(text: str) -> list[str]:
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    lines: list[str] = []
    for line in text.split("\n"):
        if lines and line.startswith((" ", "\t")):
            lines[-1] += line[1:]
        else:
            lines.append(line)
    return lines


def unescape_ics(value: str) -> str:
    out: list[str] = []
    i = 0
    while i < len(value):
        if value[i] == "\\" and i + 1 < len(value):
            code = value[i + 1]
            if code in ("n", "N"):
                out.append("\n")
            elif code == ",":
                out.append(",")
            elif code == ";":
                out.append(";")
            elif code == "\\":
                out.append("\\")
            else:
                out.append(code)
            i += 2
        else:
            out.append(value[i])
            i += 1
    return "".join(out)


def clean_text(value: str) -> str:
    value = html.unescape(unescape_ics(value))
    value = value.replace("\xa0", " ")
    value = re.sub(r"\s+", " ", value).strip()
    return value


def parse_property(line: str) -> tuple[str, dict[str, str], str] | None:
    if ":" not in line:
        return None
    head, raw = line.split(":", 1)
    bits = head.split(";")
    name = bits[0].upper()
    params: dict[str, str] = {}
    for bit in bits[1:]:
        if "=" in bit:
            key, val = bit.split("=", 1)
            params[key.upper()] = val
        else:
            params[bit.upper()] = ""
    return name, params, raw


def parse_datetime(value: str, params: dict[str, str]) -> tuple[datetime | date, bool]:
    if params.get("VALUE", "").upper() == "DATE" or re.fullmatch(r"\d{8}", value):
        return datetime.strptime(value[:8], "%Y%m%d").date(), True
    if value.endswith("Z"):
        parsed = datetime.strptime(value[:15], "%Y%m%dT%H%M%S").replace(tzinfo=UTC)
        return parsed.astimezone(NY), False
    parsed = datetime.strptime(value[:15], "%Y%m%dT%H%M%S")
    tzid = params.get("TZID")
    if tzid:
        parsed = parsed.replace(tzinfo=ZoneInfo(tzid))
    else:
        parsed = parsed.replace(tzinfo=NY)
    return parsed.astimezone(NY), False


def as_ny(moment: datetime | date, all_day: bool) -> datetime:
    if isinstance(moment, datetime):
        return moment.astimezone(NY)
    return datetime.combine(moment, time.min, NY)


def format_start(moment: datetime | date, all_day: bool) -> str:
    if all_day:
        assert isinstance(moment, date) and not isinstance(moment, datetime)
        return moment.isoformat()
    assert isinstance(moment, datetime)
    return moment.astimezone(NY).isoformat(timespec="seconds")


def parse_rule(value: str) -> dict[str, str]:
    rule: dict[str, str] = {}
    for part in value.split(";"):
        if "=" in part:
            key, val = part.split("=", 1)
            rule[key.upper()] = val
    return rule


def occurrence_dates(start: datetime, rule: dict[str, str], until_limit: datetime) -> list[datetime]:
    freq = rule.get("FREQ", "").upper()
    if freq not in {"DAILY", "WEEKLY", "MONTHLY", "YEARLY"}:
        return [start]
    interval = max(1, int(rule.get("INTERVAL", "1")))
    count = int(rule["COUNT"]) if "COUNT" in rule else None
    until = None
    if "UNTIL" in rule:
        until_moment, until_all_day = parse_datetime(rule["UNTIL"], {"VALUE": "DATE"} if re.fullmatch(r"\d{8}", rule["UNTIL"]) else {})
        until = as_ny(until_moment, until_all_day)
        if until_all_day:
            until = until + timedelta(days=1) - timedelta(seconds=1)
    byday = None
    if "BYDAY" in rule:
        byday = []
        for token in rule["BYDAY"].split(","):
            token = token.strip().upper()
            match = re.fullmatch(r"([+-]?\d)?(MO|TU|WE|TH|FR|SA|SU)", token)
            if not match:
                continue
            nth = int(match.group(1)) if match.group(1) else None
            byday.append((nth, WEEKDAYS[match.group(2)]))
    bymonthday = None
    if "BYMONTHDAY" in rule:
        bymonthday = [int(part) for part in rule["BYMONTHDAY"].split(",") if part]

    found: list[datetime] = []
    cursor_day = start.date()
    horizon = min(until_limit.date() + timedelta(days=1), start.date() + timedelta(days=366 * 4))

    def accept(day: date) -> bool:
        if day < start.date() or day > horizon:
            return False
        stamp = datetime.combine(day, time(start.hour, start.minute, start.second), NY)
        if stamp < start:
            return False
        if until and stamp > until:
            return False
        if count is not None and len(found) >= count:
            return False
        found.append(stamp)
        return True

    if freq == "DAILY":
        day = start.date()
        while day <= horizon and (count is None or len(found) < count):
            accept(day)
            day += timedelta(days=interval)
        return found

    if freq == "WEEKLY":
        weekdays = {weekday for _, weekday in byday} if byday else {start.weekday()}
        origin_week = start.date() - timedelta(days=start.weekday())
        day = start.date()
        while day <= horizon and (count is None or len(found) < count):
            week_start = day - timedelta(days=day.weekday())
            weeks = (week_start - origin_week).days // 7
            if weeks >= 0 and weeks % interval == 0 and day.weekday() in weekdays:
                accept(day)
            day += timedelta(days=1)
        return found

    if freq == "MONTHLY":
        month_cursor = date(start.year, start.month, 1)
        while month_cursor <= horizon and (count is None or len(found) < count):
            months = (month_cursor.year - start.year) * 12 + (month_cursor.month - start.month)
            if months >= 0 and months % interval == 0:
                days = month_days(month_cursor.year, month_cursor.month, start, byday, bymonthday)
                for day in days:
                    if count is not None and len(found) >= count:
                        break
                    accept(day)
            month_cursor = add_months(month_cursor.year, month_cursor.month, 1)
        return found

    year = start.year
    while date(year, start.month, 1) <= horizon and (count is None or len(found) < count):
        if (year - start.year) % interval == 0:
            try:
                accept(date(year, start.month, start.day))
            except ValueError:
                pass
        year += 1
    return found


def month_days(year: int, month: int, start: datetime, byday, bymonthday) -> list[date]:
    if bymonthday:
        days = []
        for number in bymonthday:
            if number > 0:
                try:
                    days.append(date(year, month, number))
                except ValueError:
                    continue
            else:
                last = add_months(year, month, 1) - timedelta(days=1)
                days.append(last + timedelta(days=1 + number))
        return sorted(days)
    if byday:
        days = []
        first = date(year, month, 1)
        last = add_months(year, month, 1) - timedelta(days=1)
        for nth, weekday in byday:
            matches = []
            day = first
            while day <= last:
                if day.weekday() == weekday:
                    matches.append(day)
                day += timedelta(days=1)
            if nth is None:
                days.extend(matches)
            elif nth > 0 and nth <= len(matches):
                days.append(matches[nth - 1])
            elif nth < 0 and abs(nth) <= len(matches):
                days.append(matches[nth])
        return sorted(days)
    try:
        return [date(year, month, start.day)]
    except ValueError:
        return []


def parse_exdates(raw_values: list[tuple[dict[str, str], str]]) -> set[str]:
    skipped: set[str] = set()
    for params, value in raw_values:
        for piece in value.split(","):
            moment, all_day = parse_datetime(piece, params)
            skipped.add(format_start(moment, all_day))
    return skipped


def event_bounds(start: datetime | date, end: datetime | date | None, all_day: bool) -> tuple[datetime, datetime, datetime | date]:
    if end is None:
        if all_day:
            end = start + timedelta(days=1) if isinstance(start, date) else start
        else:
            end = start
    start_dt = as_ny(start, all_day)
    if all_day:
        end_dt = datetime.combine(end, time.min, NY) if isinstance(end, date) and not isinstance(end, datetime) else as_ny(end, True)
    else:
        end_dt = as_ny(end, False)
    if end_dt < start_dt:
        end_dt = start_dt
    return start_dt, end_dt, end


def overlaps(start_dt: datetime, end_dt: datetime, window_start: datetime, window_end: datetime) -> bool:
    if end_dt == start_dt:
        return window_start <= start_dt < window_end
    return start_dt < window_end and end_dt > window_start


def component_events(component: dict, window_start: datetime, window_end: datetime) -> list[dict]:
    status = (component.get("STATUS") or "").upper()
    if status == "CANCELLED":
        return []
    if "DTSTART" not in component:
        return []
    start, start_all_day = component["DTSTART"]
    end_info = component.get("DTEND")
    end = end_info[0] if end_info else None
    end_all_day = end_info[1] if end_info else start_all_day
    all_day = start_all_day or end_all_day
    if all_day and isinstance(start, datetime):
        start = start.date()
    if all_day and isinstance(end, datetime):
        end = end.date()
    start_dt = as_ny(start, all_day)
    _, end_dt, _stored_end = event_bounds(start, end, all_day)
    duration = end_dt - start_dt

    starts = [start_dt]
    if "RRULE" in component:
        starts = occurrence_dates(start_dt, component["RRULE"], window_end + timedelta(days=1))
    skipped = component.get("EXDATES", set())
    events = []
    for occ_start in starts:
        occ_end = occ_start + duration
        key = occ_start.date().isoformat() if all_day else occ_start.isoformat(timespec="seconds")
        if key in skipped:
            continue
        if not overlaps(occ_start, occ_end, window_start, window_end):
            continue
        if all_day:
            start_text = occ_start.date().isoformat()
            end_text = occ_end.date().isoformat()
        else:
            start_text = occ_start.isoformat(timespec="seconds")
            end_text = occ_end.isoformat(timespec="seconds")
        location = clean_text(component.get("LOCATION", ""))
        if location.lower() == UNSPECIFIED_LOCATION:
            location = ""
        events.append({
            "uid": component.get("UID", ""),
            "title": clean_text(component.get("SUMMARY", "")),
            "start": start_text,
            "end": end_text,
            "allDay": all_day,
            "location": location,
            "description": clean_text(component.get("DESCRIPTION", "")),
        })
    return events


def parse_ics(text: str, window_start: datetime, window_end: datetime) -> list[dict]:
    events: list[dict] = []
    current: dict | None = None
    for line in unfold(text):
        if line == "BEGIN:VEVENT":
            current = {"EXDATES": set()}
            continue
        if line == "END:VEVENT":
            if current:
                events.extend(component_events(current, window_start, window_end))
            current = None
            continue
        if current is None:
            continue
        parsed = parse_property(line)
        if not parsed:
            continue
        name, params, raw = parsed
        if name in {"ORGANIZER", "ATTENDEE"}:
            continue
        if name in {"DTSTART", "DTEND"}:
            current[name] = parse_datetime(raw, params)
        elif name == "RRULE":
            current["RRULE"] = parse_rule(unescape_ics(raw))
        elif name == "EXDATE":
            current["EXDATES"].update(parse_exdates([(params, piece) for piece in raw.split(",")]))
        elif name == "STATUS":
            current["STATUS"] = raw.strip()
        elif name in {"UID", "SUMMARY", "LOCATION", "DESCRIPTION"}:
            current[name] = raw if name == "UID" else raw
            if name != "UID":
                current[name] = raw
    events.sort(key=lambda item: (item["start"], item["title"], item["uid"]))
    return events


def build_payload(ics_text: str, now: datetime | None = None) -> dict:
    window_start, window_end = window_bounds(now)
    return {
        "fetchedAt": (now or datetime.now(UTC)).astimezone(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "timeZone": "America/New_York",
        "windowStart": window_start.date().isoformat(),
        "windowEnd": window_end.date().isoformat(),
        "events": parse_ics(ics_text, window_start, window_end),
    }


def download(url: str) -> str:
    request = urllib.request.Request(url, headers={"User-Agent": "Troop77Calendar/1.0", "Accept": "text/calendar"})
    with urllib.request.urlopen(request, timeout=60) as response:
        charset = response.headers.get_content_charset() or "utf-8"
        return response.read().decode(charset, errors="replace")


def write_json(payload: dict, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def self_test() -> None:
    sample = "\r\n".join([
        "BEGIN:VCALENDAR",
        "BEGIN:VEVENT",
        "UID:folded@example",
        "SUMMARY:Campout\\, weekend",
        "DESCRIPTION:Line one\\nLine two\\, still",
        "LOCATION:Camp Brorein\\, Odessa FL",
        "DTSTART:20261113T230000Z",
        "DTEND:20261115T160000Z",
        "ORGANIZER:Hidden Person",
        "ATTENDEE:hidden@example.com",
        "END:VEVENT",
        "BEGIN:VEVENT",
        "UID:allday@example",
        "SUMMARY:Service day",
        "DTSTART;VALUE=DATE:20261120",
        "DTEND;VALUE=DATE:20261122",
        "STATUS:CONFIRMED",
        "END:VEVENT",
        "BEGIN:VEVENT",
        "UID:cancel@example",
        "SUMMARY:Dropped",
        "DTSTART:20261118T150000Z",
        "DTEND:20261118T160000Z",
        "STATUS:CANCELLED",
        "END:VEVENT",
        "BEGIN:VEVENT",
        "UID:weekly@example",
        "SUMMARY:Weekly hike",
        "DTSTART;TZID=America/New_York:20261102T183000",
        "DTEND;TZID=America/New_York:20261102T200000",
        "RRULE:FREQ=WEEKLY;INTERVAL=1;COUNT=3",
        "END:VEVENT",
        "BEGIN:VEVENT",
        "UID:folded-desc@example",
        "SUMMARY:Folded",
        "DESCRIPTION:Hello ",
        " world",
        "DTSTART;VALUE=DATE:20261201",
        "END:VEVENT",
        "END:VCALENDAR",
    ])
    now = datetime(2026, 11, 10, 12, tzinfo=NY)
    payload = build_payload(sample, now)
    by_uid = {}
    for event in payload["events"]:
        by_uid.setdefault(event["uid"], []).append(event)
        assert "organizer" not in event and "attendee" not in event
    camp = by_uid["folded@example"][0]
    assert camp["title"] == "Campout, weekend"
    assert camp["start"] == "2026-11-13T18:00:00-05:00"
    assert camp["end"] == "2026-11-15T11:00:00-05:00"
    assert camp["description"] == "Line one Line two, still"
    assert camp["location"] == "Camp Brorein, Odessa FL"
    assert camp["allDay"] is False
    allday = by_uid["allday@example"][0]
    assert allday["allDay"] is True and allday["start"] == "2026-11-20" and allday["end"] == "2026-11-22"
    assert "cancel@example" not in by_uid
    weekly = by_uid["weekly@example"]
    assert [item["start"][:10] for item in weekly] == ["2026-11-02", "2026-11-09", "2026-11-16"]
    assert by_uid["folded-desc@example"][0]["description"] == "Hello world"
    print("self-test ok", len(payload["events"]))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    parser.add_argument("--self-test", action="store_true")
    parser.add_argument("--input", type=Path)
    args = parser.parse_args()
    if args.self_test:
        self_test()
        return 0
    text = args.input.read_text(encoding="utf-8") if args.input else download(FEED_URL)
    payload = build_payload(text)
    write_json(payload, args.out)
    print(f"wrote {args.out} events={len(payload['events'])} window={payload['windowStart']}..{payload['windowEnd']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
