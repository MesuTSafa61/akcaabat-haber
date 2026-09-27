"""Refresh public local service data; never publish an unverified or stale duty list."""
import json
import re
from datetime import datetime, timezone, timedelta
from pathlib import Path
from urllib.request import Request, urlopen
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[2]
PATH = ROOT / 'data/yerel-hizmetler.json'
data = json.loads(PATH.read_text(encoding='utf-8'))
today = datetime.now(timezone(timedelta(hours=3))).date().isoformat()
HEADERS = {'User-Agent': 'Mozilla/5.0 (compatible; AkcaabatHaber/1.0; public-information)'}


def fetch(url):
    with urlopen(Request(url, headers=HEADERS), timeout=25) as response:
        return BeautifulSoup(response.read(), 'html.parser')


def clean(value):
    return re.sub(r'\s+', ' ', value or '').strip()


def refresh_prayer():
    soup = fetch(data['prayer']['source'])
    months = {'Ocak': 1, 'Şubat': 2, 'Mart': 3, 'Nisan': 4, 'Mayıs': 5, 'Haziran': 6,
              'Temmuz': 7, 'Ağustos': 8, 'Eylül': 9, 'Ekim': 10, 'Kasım': 11, 'Aralık': 12}
    days = {}
    for row in soup.select('tr'):
        cells = [clean(cell.get_text(' ', strip=True)) for cell in row.select('td')]
        if len(cells) < 8:
            continue
        date = re.search(r'\b(\d{1,2})\s+(Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık)\s+(20\d{2})\b', cells[0])
        if not date:
            continue
        times = [re.search(r'\b([01]\d|2[0-3]):[0-5]\d\b', cell) for cell in cells[2:8]]
        if not all(times):
            continue
        key = f'{int(date[3]):04d}-{months[date[2]]:02d}-{int(date[1]):02d}'
        days[key] = {'date': key, 'times': [match[0] for match in times]}
    if today not in days:
        raise ValueError(f'Diyanet tablosunda bugün yok; {len(days)} gün ayrıştırıldı')
    fresh = [days[key] for key in sorted(days) if key >= today][:31]
    if fresh != data['prayer'].get('days'):
        data['prayer']['days'] = fresh
        data['prayer']['updatedAt'] = datetime.now(timezone.utc).isoformat()
    print('Diyanet:', len(data['prayer']['days']), 'gün')


def refresh_pharmacies():
    soup = fetch(data['pharmacies']['source'])
    text = clean(soup.get_text(' ', strip=True))
    today_tr = datetime.now(timezone(timedelta(hours=3))).strftime('%d.%m.%Y')
    marker = 'TRABZON AKÇAABAT NÖBETÇİ ECZANELER'
    if marker not in text:
        raise ValueError('Akçaabat listesi bulunamadı')
    text = text.split(marker, 1)[1]
    pattern = re.compile(
        r'AKÇAABAT\s+(?P<name>[A-ZÇĞİÖŞÜ][A-ZÇĞİÖŞÜ ]{2,55} ECZANESİ)\s+'
        r'(?P=name)\s+(?P<date>\d{2}\.\d{2}\.20\d{2})\s+(?P<start_time>\d{2}:\d{2})\s*-\s*'
        r'(?P<end_date>\d{2}\.\d{2}\.20\d{2})\s+(?P<end_time>\d{2}:\d{2})\s+arası nöbetçidir\.\s+'
        r'AKÇAABAT\s+(?P<address>.{10,250}?)\s+(?P<phone>0\d{10})\s+Haritada görüntülemek', re.I
    )
    cards = []
    starts_at = ends_at = None
    for match in pattern.finditer(text):
        if match['date'] != today_tr:
            continue
        start = datetime.strptime(match['date'] + ' ' + match['start_time'], '%d.%m.%Y %H:%M').replace(tzinfo=timezone(timedelta(hours=3)))
        end = datetime.strptime(match['end_date'] + ' ' + match['end_time'], '%d.%m.%Y %H:%M').replace(tzinfo=timezone(timedelta(hours=3)))
        if end <= start:
            continue
        starts_at, ends_at = start.isoformat(), end.isoformat()
        record = {'name': clean(match['name']), 'address': clean(match['address']), 'phone': match['phone']}
        if record not in cards:
            cards.append(record)
    current = data['pharmacies']
    now = datetime.now(timezone(timedelta(hours=3)))
    previous_end = datetime.fromisoformat(current['endsAt']) if current.get('endsAt') else None
    if cards and starts_at and (datetime.fromisoformat(starts_at) <= now or not previous_end or previous_end <= now):
        fresh = {'date': today, 'startsAt': starts_at, 'endsAt': ends_at, 'items': cards[:15]}
        if any(current.get(key) != value for key, value in fresh.items()):
            current.update(fresh, updatedAt=datetime.now(timezone.utc).isoformat())
        print('Eczacı Odası:', len(cards), 'eczane')
    else:
        print('Eczacı Odası: bugün için ayrıştırılabilir kayıt bulunamadı')


def refresh_obituaries():
    # The municipality renders an empty shell and fetches the public notices
    # through its own ASP.NET page method when a date is selected.
    endpoint = data['obituaries']['source'].rsplit('/', 1)[0] + '/vefat-edenler.aspx/GetVerileri'
    notices = []
    today_local = datetime.now(timezone(timedelta(hours=3))).date()
    for days_ago in range(7):
        date = today_local - timedelta(days=days_ago)
        payload = json.dumps({'tarih': date.strftime('%d.%m.%Y')}).encode('utf-8')
        request = Request(endpoint, data=payload, headers={**HEADERS,
            'Content-Type': 'application/json; charset=utf-8',
            'Accept': 'application/json',
            'Referer': data['obituaries']['source']}, method='POST')
        with urlopen(request, timeout=25) as response:
            markup = json.load(response).get('d', '')
        if not isinstance(markup, str):
            raise ValueError('Belediye servisinden beklenmeyen yanıt')
        for card in BeautifulSoup(markup, 'html.parser').select('.accordion-item'):
            name_node = card.select_one('.accordion-button')
            body_node = card.select_one('.accordion-body')
            if not name_node or not body_node:
                continue
            name = clean(name_node.get_text(' ', strip=True))
            body = clean(body_node.get_text(' ', strip=True))
            date_match = re.search(r'Defin Tarihi\s*:\s*(\d{2}\.\d{2}\.20\d{2})', body, re.I)
            if not name or not date_match or date_match[1] != date.strftime('%d.%m.%Y'):
                continue
            prayer = re.search(r'Namaz Vakti\s*:\s*(.*?)\s+Namaz Yeri\s*:', body, re.I)
            mosque = re.search(r'Namaz Yeri\s*:\s*(.*?)\s*(?:-\s*Haritada Göster|Mezarlık\s*:)', body, re.I)
            cemetery = re.search(r'Mezarlık\s*:\s*(.*?)\s+Yakın Bilgisi\s*:', body, re.I)
            details = ' • '.join(part for part in (
                clean(prayer[1]) if prayer else '',
                clean(mosque[1]) if mosque else '',
                clean(cemetery[1]) if cemetery else ''
            ) if part)
            entry = {'name': name[:150], 'date': date.isoformat(), 'details': details[:300]}
            if entry not in notices:
                notices.append(entry)
    if notices != data['obituaries'].get('items'):
        data['obituaries'].update(updatedAt=datetime.now(timezone.utc).isoformat(), items=notices[:60])
    print('Akçaabat Belediyesi:', len(notices), 'vefat duyurusu')


for label, refresh in [('namaz', refresh_prayer), ('eczane', refresh_pharmacies), ('vefat', refresh_obituaries)]:
    try:
        refresh()
    except Exception as exc:
        print(f'{label}: alınamadı ({type(exc).__name__}: {exc})')
# Keep an overnight duty until its published end time; never show expired data.
expiry = data['pharmacies'].get('endsAt')
if (expiry and datetime.fromisoformat(expiry) <= datetime.now(timezone(timedelta(hours=3)))) or (not expiry and data['pharmacies'].get('date') != today):
    data['pharmacies'].update(date=None, startsAt=None, endsAt=None, items=[])
PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
