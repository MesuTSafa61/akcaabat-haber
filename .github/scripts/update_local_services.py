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
    data['prayer']['days'] = [days[key] for key in sorted(days) if key >= today][:31]
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
        r'(?P=name)\s+(?P<date>\d{2}\.\d{2}\.20\d{2})\s+\d{2}:\d{2}\s*-\s*'
        r'\d{2}\.\d{2}\.20\d{2}\s+\d{2}:\d{2}\s+arası nöbetçidir\.\s+'
        r'AKÇAABAT\s+(?P<address>.{10,250}?)\s+(?P<phone>0\d{10})\s+Haritada görüntülemek', re.I
    )
    cards = []
    for match in pattern.finditer(text):
        if match['date'] != today_tr:
            continue
        record = {'name': clean(match['name']), 'address': clean(match['address']), 'phone': match['phone']}
        if record not in cards:
            cards.append(record)
    if cards:
        data['pharmacies'].update(date=today, updatedAt=datetime.now(timezone.utc).isoformat(), items=cards[:15])
        print('Eczacı Odası:', len(cards), 'eczane')
    else:
        print('Eczacı Odası: bugün için ayrıştırılabilir kayıt bulunamadı')


def refresh_obituaries():
    soup = fetch(data['obituaries']['source'])
    print('Belediye vefat HTML:', len(str(soup)), 'karakter')
    # Source currently renders an empty heading; do not invent names or reuse old notices.
    # Populate only if structured dates and names are published in an identifiable table.
    items = []
    for row in soup.select('table tr'):
        cells = [clean(cell.get_text(' ', strip=True)) for cell in row.select('td')]
        if len(cells) < 2:
            continue
        date_cell = next((c for c in cells if re.fullmatch(r'\d{2}[./-]\d{2}[./-]20\d{2}', c)), None)
        name_cell = next((c for c in cells if re.fullmatch(r'[A-Za-zÇĞİÖŞÜçğıöşü\s]{5,70}', c) and c.lower() not in ('ad soyad', 'vefat edenler')), None)
        if not (date_cell and name_cell):
            continue
        try:
            date = datetime.strptime(date_cell.replace('/', '.').replace('-', '.'), '%d.%m.%Y').date().isoformat()
        except ValueError:
            continue
        if date < today[:7] + '-01':
            continue
        items.append({'name': name_cell, 'date': date, 'details': ' • '.join(c for c in cells if c not in (date_cell, name_cell))[:250]})
    data['obituaries'].update(updatedAt=datetime.now(timezone.utc).isoformat(), items=items[:30])
    print('Belediye:', len(items), 'duyuru')


for label, refresh in [('namaz', refresh_prayer), ('eczane', refresh_pharmacies), ('vefat', refresh_obituaries)]:
    try:
        refresh()
    except Exception as exc:
        print(f'{label}: alınamadı ({type(exc).__name__}: {exc})')
# Never retain yesterday's duty list, even when the official source is down.
if data['pharmacies']['date'] != today:
    data['pharmacies'].update(date=None, items=[])
PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
