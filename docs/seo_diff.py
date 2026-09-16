#!/usr/bin/env python3
"""Недельный диф позиций bayard39.ru в Яндексе.

    python docs/seo_diff.py             # показать диф и дописать неделю в историю
    python docs/seo_diff.py --dry-run   # показать, но не записывать
    python docs/seo_diff.py --selftest  # проверить логику дифа, сеть не нужна

Токен берётся из переменной YANDEX_WEBMASTER_TOKEN, иначе из
~/.secrets/yandex-webmaster.token. В репозиторий он попасть не должен.

История лежит в docs/seo-history.json и коммитится — тогда тренд виден
просто из `git log -p docs/seo-history.json`.
"""
import json
import os
import pathlib
import sys
import urllib.request

BASE = ("https://api.webmaster.yandex.net/v4/user/1934888402"
        "/hosts/https:www.bayard39.ru:443")
HISTORY = pathlib.Path(__file__).with_name("seo-history.json")
SHOWS, CLICKS, POS = 0, 1, 2


def get(path):
    token = os.environ.get("YANDEX_WEBMASTER_TOKEN")
    if not token:
        token = (pathlib.Path.home() / ".secrets" / "yandex-webmaster.token").read_text()
    req = urllib.request.Request(BASE + path,
                                 headers={"Authorization": "OAuth " + token.strip()})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def fetch_week():
    indicators = "".join("&query_indicator=" + i
                         for i in ("TOTAL_SHOWS", "TOTAL_CLICKS", "AVG_SHOW_POSITION"))
    data = get("/search-queries/popular?order_by=TOTAL_SHOWS&limit=100" + indicators)
    summary = get("/summary")
    return {
        "week": data["date_from"] + "—" + data["date_to"],
        "pages_in_search": summary["searchable_pages_count"],
        "sqi": summary["sqi"],
        "queries": {q["query_text"]: [q["indicators"].get("TOTAL_SHOWS"),
                                      q["indicators"].get("TOTAL_CLICKS"),
                                      q["indicators"].get("AVG_SHOW_POSITION")]
                    for q in data["queries"]},
    }


def diff(prev, cur):
    """(запрос, показы, клики, было, стало) по убыванию показов за текущую неделю.

    None в позиции значит, что запроса в той неделе не было вовсе — это не ноль
    и не падение, у Яндекса по нему просто не было показов.
    """
    rows = []
    for q in set(prev) | set(cur):
        c, p = cur.get(q), prev.get(q)
        rows.append((q, (c or [0, 0, None])[SHOWS], (c or [0, 0, None])[CLICKS],
                     (p or [0, 0, None])[POS], (c or [0, 0, None])[POS]))
    rows.sort(key=lambda r: (-r[1], r[0]))
    return rows


def mark(was, now):
    if was is None and now is None:
        return "?"
    if was is None:
        return "новый"
    if now is None:
        return "нет показов"
    if now < was - 0.5:
        return "выше"
    if now > was + 0.5:
        return "ниже"
    return "="


def fmt(pos):
    return "—" if pos is None else ("%g" % pos)


def report(prev_week, cur):
    prev = prev_week["queries"] if prev_week else {}
    out = ["Неделя %s (пред. %s)" % (cur["week"], prev_week["week"] if prev_week else "нет"),
           "Страниц в поиске: %s   ИКС: %s   показов: %g   кликов: %g" % (
               cur["pages_in_search"], cur["sqi"],
               sum(v[SHOWS] or 0 for v in cur["queries"].values()),
               sum(v[CLICKS] or 0 for v in cur["queries"].values())),
           "",
           "%-46s %6s %6s %8s %8s  %s" % ("запрос", "показы", "клики", "было", "стало", "")]
    for q, shows, clicks, was, now in diff(prev, cur["queries"]):
        out.append("%-46s %6g %6g %8s %8s  %s" % (
            q[:46], shows, clicks, fmt(was), fmt(now), mark(was, now)))
    return "\n".join(out)


def selftest():
    prev = {"бренд": [1, 0, 46.0], "чоп калининград": [1, 0, 25.0], "ушёл": [2, 0, 4.0]}
    cur = {"бренд": [2, 1, 2.0], "чоп калининград": [1, 0, 25.4], "новый": [3, 0, 8.0]}
    rows = {r[0]: r for r in diff(prev, cur)}
    assert [r[0] for r in diff(prev, cur)][0] == "новый", "сортировка по показам"
    assert mark(rows["бренд"][3], rows["бренд"][4]) == "выше"
    assert mark(rows["чоп калининград"][3], rows["чоп калининград"][4]) == "=", "0.4 — шум, не движение"
    assert mark(rows["ушёл"][3], rows["ушёл"][4]) == "нет показов"
    assert mark(rows["новый"][3], rows["новый"][4]) == "новый"
    assert rows["ушёл"][1] == 0 and rows["ушёл"][4] is None
    assert fmt(2.5) == "2.5" and fmt(2.0) == "2" and fmt(None) == "—"
    print("selftest ok")


def main():
    sys.stdout.reconfigure(encoding="utf-8")  # без этого консоль Windows превращает вывод в кракозябры
    if "--selftest" in sys.argv:
        return selftest()
    history = json.loads(HISTORY.read_text(encoding="utf-8")) if HISTORY.exists() else []
    cur = fetch_week()
    prev = next((w for w in reversed(history) if w["week"] != cur["week"]), None)
    print(report(prev, cur))
    if "--dry-run" in sys.argv:
        return
    history = [w for w in history if w["week"] != cur["week"]] + [cur]
    history.sort(key=lambda w: w["week"])
    HISTORY.write_text(json.dumps(history, ensure_ascii=False, indent=2) + "\n",
                       encoding="utf-8")
    print("\nЗаписано в %s (%d недель)" % (HISTORY.name, len(history)))


if __name__ == "__main__":
    main()
