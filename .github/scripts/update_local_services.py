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
    soup = fetch(data['obituaries']['source'])
    print('Belediye vefat HTML:', len(str(soup)), 'karakter')
    heading = soup.find(string=lambda value: value and 'VEFAT EDENLER' in value.upper())
    if heading:
        node = heading.parent
        print('Vefat başlık çevresi:', str(node.parent.parent)[:4500])
        print('Vefat sonrası:', [str(item)[:3500] for item in list(node.parent.parent.next_siblings)[:8]])
    print('Vefat iframe:', [(f.get('src'), f.get('id')) for f in soup.select('iframe')])
    print('Vefat script adları:', [s.get('src') for s in soup.select('script[src]')])
    print('Vefat veri betiği:', [s.get_text()[max(0,s.get_text().find('function fetchData')-300):s.get_text().find('function fetchData')+9000] for s in soup.select('script:not([src])') if 'function fetchData' in s.get_text()])
    print('Vefat işaretleri:', [(str(m.start()), soup.get_text(' ', strip=True)[m.start():m.start()+160]) for m in list(re.finditer('vefat', soup.get_text(' ', strip=True), re.I))[-4:]])
    from urllib.parse import urljoin
    for day in (datetime.now(timezone(timedelta(hours=3))).date(), datetime.now(timezone(timedelta(hours=3))).date() - timedelta(days=1)):
        payload = json.dumps({'tarih': day.strftime('%d.%m.%Y')}).encode('utf-8')
        endpoint = urljoin(data['obituaries']['source'], 'vefat-edenler.aspx/GetVerileri')
        req = Request(endpoint, data=payload, headers={**HEADERS, 'Content-Type': 'application/json; charset=utf-8', 'Accept': 'application/json', 'Referer': data['obituaries']['source']}, method='POST')
        try:
            with urlopen(req, timeout=25) as response:
                body = response.read().decode('utf-8-sig')
                print('Vefat servis', day, response.status, len(body), body[:6000])
        except Exception as error:
            print('Vefat servis hatası', type(error).__name__, str(error))
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
    if items[:30] != data['obituaries'].get('items'):
        data['obituaries'].update(updatedAt=datetime.now(timezone.utc).isoformat(), items=items[:30])
    print('Belediye:', len(items), 'duyuru')


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
