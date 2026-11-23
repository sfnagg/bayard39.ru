# -*- coding: utf-8 -*-
"""Спрос и выдача Яндекса по Калининграду (Yandex Cloud Search API).

    python -X utf8 tools/spros.py                  # всё семантическое ядро из docs/yadro.csv
    python -X utf8 tools/spros.py "охрана склада"  # свои запросы, ядро не трогает
    python -X utf8 tools/spros.py --new-copy [ДАТА] # 0, если Яндекс скачал главную позже

Для каждого запроса: частотность за месяц из Wordstat (топ хвостов и
ассоциации) и место bayard39.ru в выдаче Яндекса по региону 22 (Калининград).
Прогон по ядру дописывает в docs/yadro.csv место, какая страница сайта нашлась,
дату её копии у Яндекса и дату прогона; частотность — не чаще раза в 28 дней.
Если нашлась не та страница, что в колонке «страница», в выводе стоит «(не та)».
Сырые ответы — в spros.json рядом с вызовом.

Ключ лежит вне репозитория: ~/.secrets/yandex-search.env с YANDEX_KEY и
YANDEX_FOLDER_ID (API-ключ сервисного аккаунта Yandex Cloud, тот же, что
в formoza).
"""
import base64
import csv
import datetime
import json
import os
import pathlib
import sys
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

REGION = '22'
OWN = 'bayard39.ru'
# Ядро — в CSV, а не в коде: его правят руками и открывают в Excel
# (отсюда «;» и BOM). Колонки после «страница» заполняет этот скрипт.
YADRO = pathlib.Path(__file__).resolve().parent.parent / 'docs' / 'yadro.csv'
FIELDS = ['запрос', 'группа', 'страница', 'в месяц', 'частота от', 'место',
          'страница в выдаче', 'копия яндекса', 'дата']

env = dict(l.strip().split('=', 1) for l in open(
    os.path.expanduser('~/.secrets/yandex-search.env'), encoding='utf-8') if '=' in l)


def post(path, body):
    req = urllib.request.Request(
        'https://searchapi.api.cloud.yandex.net/v2/' + path,
        json.dumps({**body, 'folderId': env['YANDEX_FOLDER_ID']}).encode(),
        {'Authorization': 'Api-Key ' + env['YANDEX_KEY'], 'Content-Type': 'application/json'})
    return json.load(urllib.request.urlopen(req, timeout=60))


def wordstat(q):
    return post('wordstat/topRequests', {'phrase': q, 'numPhrases': '20', 'regions': [REGION]})


def serp(q):
    raw = post('web/search', {
        'query': {'searchType': 'SEARCH_TYPE_RU', 'queryText': q}, 'region': REGION,
        'responseFormat': 'FORMAT_XML',
        'groupSpec': {'groupMode': 'GROUP_MODE_DEEP', 'groupsOnPage': 50, 'docsInGroup': 1}})['rawData']
    root = ET.fromstring(base64.b64decode(raw))
    if root.find('.//error') is not None:
        raise RuntimeError(root.findtext('.//error'))
    docs = []
    for d in root.iter('doc'):
        # la в ссылке на сохранённую копию — когда Яндекс скачал страницу. Это
        # единственный способ узнать, какую версию он оценивает: Вебмастер
        # с 06.10 не обновляет историю обхода.
        la = urllib.parse.parse_qs(urllib.parse.urlsplit(d.findtext('saved-copy-url') or '').query).get('la')
        docs.append({'domain': (d.findtext('domain') or '').replace('www.', ''),
                     'url': d.findtext('url') or '',
                     'title': ''.join(d.find('title').itertext()) if d.find('title') is not None else '',
                     'copy': datetime.date.fromtimestamp(int(la[0])).isoformat() if la else ''})
    return docs


def own_place(docs):
    """Место сайта, путь найденной страницы, дата её копии и title в выдаче."""
    for i, d in enumerate(docs, 1):
        if d['domain'] == OWN:
            return i, urllib.parse.urlsplit(d['url']).path or '/', d['copy'], d['title']
    return None, '', '', ''


def load():
    with open(YADRO, encoding='utf-8-sig', newline='') as f:
        return list(csv.DictReader(f, delimiter=';'))


def new_copy(since=None):
    """Precheck для автоматизации: скачал ли Яндекс главную позже `since`
    (по умолчанию — позже копии, по которой мерили в последний раз). 0 — да,
    мерить стоит; 1 — нет, прогон впустую. Один запрос к выдаче вместо всего ядра."""
    rows = load()
    seen = since or max((r.get('копия яндекса') or '' for r in rows
                         if r['страница в выдаче'] == '/'), default='')
    q = next(r['запрос'] for r in rows if r['группа'] == 'бренд')
    try:
        docs = serp(q)
    except Exception as e:
        print('ошибка выдачи:', e)
        return 1
    copy = next((d['copy'] for d in docs if d['domain'] == OWN
                 and (urllib.parse.urlsplit(d['url']).path or '/') == '/'), '')
    print(f"копия главной у Яндекса: {copy or 'нет'}, мерили по: {seen or 'нет'}")
    return 0 if copy and copy > seen else 1


def main():
    if sys.argv[1:2] == ['--new-copy']:
        sys.exit(new_copy(*sys.argv[2:3]))
    rows = None
    if sys.argv[1:]:
        queries = sys.argv[1:]
    else:
        rows = load()
        queries = [r['запрос'] for r in rows]

    out, today, shown = {}, datetime.date.today(), False
    for n, q in enumerate(queries):
        r = rows[n] if rows is not None else {}
        # Частотность — месячная, раз в неделю её перезапрашивать незачем: платим
        # только за выдачу, Wordstat — раз в 28 дней.
        fresh = r.get('частота от') and (today - datetime.date.fromisoformat(r['частота от'])).days < 28
        try:
            ws = {'totalCount': r['в месяц']} if fresh else wordstat(q)
            docs = serp(q)
        except Exception as e:                   # один сбой не должен съесть весь прогон
            print(f"{q:40} ошибка: {e}")
            continue
        out[q] = {'wordstat': ws, 'serp': docs}
        pos, page, copy, title = own_place(docs)
        mark = ''
        if rows is not None:
            r.update({'место': pos or '>50', 'страница в выдаче': page,
                      'копия яндекса': copy, 'дата': today.isoformat()})
            if not fresh:
                r.update({'в месяц': ws.get('totalCount', '0'), 'частота от': today.isoformat()})
            mark = ' (не та)' if page and page != r['страница'] else ''
        top = ', '.join(d['domain'] for d in docs[:3])
        print(f"{q:40} {ws.get('totalCount', '0'):>6}/мес  место: {pos or '>50':>4} {page}{mark}"
              f"  копия {copy or '—'}  топ-3: {top}")
        if page == '/' and title and not shown:
            shown = True                         # по title видно, какую версию главной оценивают
            print(f"{'':40} title главной в выдаче: {title}")

    json.dump(out, open('spros.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    if rows is not None:
        with open(YADRO, 'w', encoding='utf-8-sig', newline='') as f:
            w = csv.DictWriter(f, FIELDS, delimiter=';', lineterminator='\n')
            w.writeheader()
            w.writerows(rows)


if __name__ == '__main__':
    main()
