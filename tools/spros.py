# -*- coding: utf-8 -*-
"""Спрос и выдача Яндекса по Калининграду (Yandex Cloud Search API).

    python tools/spros.py                  # все запросы из Q
    python tools/spros.py "охрана склада"  # свои запросы

Для каждого запроса: частотность за месяц из Wordstat (топ хвостов и
ассоциации) и место bayard39.ru в выдаче Яндекса по региону 22 (Калининград).
Сырые ответы — в spros.json рядом с вызовом.

Ключ лежит вне репозитория: ~/.secrets/yandex-search.env с YANDEX_KEY и
YANDEX_FOLDER_ID (API-ключ сервисного аккаунта Yandex Cloud, тот же, что
в formoza).
"""
import base64
import json
import os
import sys
import urllib.request
import xml.etree.ElementTree as ET

REGION = '22'
OWN = 'bayard39.ru'
Q = ['чоп калининград', 'охранное предприятие калининград', 'охрана калининград',
     'охрана объектов калининград', 'физическая охрана калининград',
     'охрана офиса калининград', 'охрана склада калининград',
     'охрана магазина калининград', 'охрана стройки калининград',
     'охрана мероприятий калининград', 'стоимость охраны калининград',
     'работа охранником калининград', 'вакансии охранника калининград',
     'чоп баярд']

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


out = {}
for q in sys.argv[1:] or Q:
    ws, docs = wordstat(q), serp(q)
    out[q] = {'wordstat': ws, 'serp': docs}
    pos = next((i for i, d in enumerate(docs, 1) if d.split()[0] == OWN), None)
    top = ', '.join(d.split()[0] for d in docs[:3])
    print(f"{q:40} {ws.get('totalCount', '0'):>6}/мес  место: {pos or '>50':>4}  топ-3: {top}")
json.dump(out, open('spros.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
