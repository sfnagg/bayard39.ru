"""Продлевает срок вакансий в разметке JobPosting.

Google считает вакансию устаревшей примерно через месяц после `datePosted` и
убирает её из подборки вакансий — молча, без письма в Search Console. Поэтому
в разметке стоит `validThrough`, а этот скрипт раз в неделю двигает его вперёд.

Двигаем только срок окончания. `datePosted` — настоящая дата публикации, её
переписывать нельзя: это будет враньё о свежести вакансии.

Файл читается и пишется с `newline=''`: в этом репозитории строки хранятся с
CRLF, и обычная перезапись дала бы дифф на весь файл.
"""
import datetime
import io
import re
import sys

PAGE = "compani/vacan.html"
DAYS = 60

until = (datetime.date.today() + datetime.timedelta(days=DAYS)).isoformat()
text = io.open(PAGE, encoding="utf-8", newline="").read()
new, count = re.subn(r'"validThrough": "\d{4}-\d{2}-\d{2}"',
                     '"validThrough": "%s"' % until, text)
if not count:
    sys.exit("в %s не нашлось ни одного validThrough — разметка изменилась?" % PAGE)
if new != text:
    io.open(PAGE, "w", encoding="utf-8", newline="").write(new)
print("вакансий продлено: %d, срок до %s" % (count, until))
