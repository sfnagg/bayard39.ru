# -*- coding: utf-8 -*-
"""Спрос и выдача Яндекса по Калининграду (Yandex Cloud Search API).

    python tools/spros.py                  # всё семантическое ядро из docs/yadro.csv
    python tools/spros.py "охрана склада"  # свои запросы, ядро не трогает

Для каждого запроса: частотность за месяц из Wordstat (топ хвостов и
ассоциации) и место bayard39.ru в выдаче Яндекса по региону 22 (Калининград).
Прогон по ядру дописывает в docs/yadro.csv частотность, место, какая страница
сайта нашлась и дату. Если нашлась не та страница, что в колонке «страница»,
в выводе стоит «(не та)». Сырые ответы — в spros.json рядом с вызовом.

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
    return [(d.findtext('domain') or '').replace('www.', '') + ' ' + (d.findtext('url') or '')
            for d in root.iter('doc')]


def own_place(docs):
    """Место сайта в выдаче и путь найденной страницы; (None, '') — дальше 50."""
    for i, d in enumerate(docs, 1):
        domain, url = d.split(' ', 1)
        if domain == OWN:
            return i, urllib.parse.urlsplit(url).path or '/'
    return None, ''


def main():
    rows = None
    if sys.argv[1:]:
        queries = sys.argv[1:]
    else:
        with open(YADRO, encoding='utf-8-sig', newline='') as f:
            rows = list(csv.DictReader(f, delimiter=';'))
        fields = list(rows[0].keys())
        queries = [r['запрос'] for r in rows]

    out, today = {}, datetime.date.today().isoformat()
    for n, q in enumerate(queries):
        try:
            ws, docs = wordstat(q), serp(q)
        except Exception as e:                   # один сбой не должен съесть весь прогон
            print(f"{q:40} ошибка: {e}")
            continue
        out[q] = {'wordstat': ws, 'serp': docs}
        pos, page = own_place(docs)
        mark = ''
        if rows is not None:
            r = rows[n]
            r.update({'в месяц': ws.get('totalCount', '0'), 'место': pos or '>50',
                      'страница в выдаче': page, 'дата': today})
            mark = ' (не та)' if page and page != r['страница'] else ''
        top = ', '.join(d.split()[0] for d in docs[:3])
        print(f"{q:40} {ws.get('totalCount', '0'):>6}/мес  место: {pos or '>50':>4} {page}{mark}  топ-3: {top}")

    json.dump(out, open('spros.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    if rows is not None:
        with open(YADRO, 'w', encoding='utf-8-sig', newline='') as f:
            w = csv.DictWriter(f, fields, delimiter=';', lineterminator='\n')
            w.writeheader()
            w.writerows(rows)


if __name__ == '__main__':
    main()
