# -*- coding: utf-8 -*-
"""Переобход изменённых страниц: Яндекс.Вебмастер и Google Indexing API.

    python tools/pereobhod.py                       # страница вакансий
    python tools/pereobhod.py https://... https://...

В Яндекс уходит любой адрес, суточная квота ~150. В Google — только страница
вакансий: Indexing API принимает JobPosting и BroadcastEvent, для остальных
страниц остаётся «Запросить индексирование» в Search Console руками.

Ключи лежат вне репозитория, в каталоге .secrets домашней папки:
  yandex-webmaster.token               — OAuth-токен, действует 6 месяцев
  bayard-509415-*.json                 — ключ сервисного аккаунта Google
Сервисный аккаунт добавлен в Search Console владельцем; «Полный доступ»
не годится, API отвечает 403.
"""
import glob
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

SECRETS = os.path.join(os.path.expanduser('~'), '.secrets')
YANDEX = ('https://api.webmaster.yandex.net/v4/user/1934888402'
          '/hosts/https:www.bayard39.ru:443/recrawl/queue')
VACANCIES = 'https://www.bayard39.ru/compani/vacan.html'


def post(url, data, headers):
    req = urllib.request.Request(url, data=json.dumps(data).encode(),
                                 headers=dict(headers, **{'Content-Type': 'application/json'}))
    return json.load(urllib.request.urlopen(req))


def yandex(urls):
    with open(os.path.join(SECRETS, 'yandex-webmaster.token'), encoding='utf-8') as f:
        token = f.read().strip()
    for u in urls:
        try:
            r = post(YANDEX, {'url': u}, {'Authorization': 'OAuth ' + token})
            print('яндекс ok  %s (осталось %s)' % (u, r.get('quota_remainder', '?')))
        except urllib.error.HTTPError as e:
            print('яндекс %d %s %s' % (e.code, u, e.read().decode('utf-8', 'replace')[:200]))


def google(urls):
    """Токен получаем сами: google-auth ради одного JWT ставить незачем."""
    import jwt
    keys = glob.glob(os.path.join(SECRETS, 'bayard-*.json'))
    if not keys:
        print('google: ключа нет, пропускаю')
        return
    k = json.load(open(keys[0], encoding='utf-8'))
    now = int(time.time())
    assertion = jwt.encode({'iss': k['client_email'],
                            'scope': 'https://www.googleapis.com/auth/indexing',
                            'aud': 'https://oauth2.googleapis.com/token',
                            'iat': now, 'exp': now + 3600},
                           k['private_key'], algorithm='RS256')
    req = urllib.request.Request(
        'https://oauth2.googleapis.com/token',
        data=urllib.parse.urlencode({
            'grant_type': 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            'assertion': assertion}).encode(),
        headers={'Content-Type': 'application/x-www-form-urlencoded'})
    token = json.load(urllib.request.urlopen(req))['access_token']

    for u in urls:
        try:
            post('https://indexing.googleapis.com/v3/urlNotifications:publish',
                 {'url': u, 'type': 'URL_UPDATED'}, {'Authorization': 'Bearer ' + token})
            print('google ok  %s' % u)
        except urllib.error.HTTPError as e:
            print('google %d %s %s' % (e.code, u, e.read().decode('utf-8', 'replace')[:200]))


if __name__ == '__main__':
    urls = sys.argv[1:] or [VACANCIES]
    yandex(urls)
    google([u for u in urls if u == VACANCIES])
