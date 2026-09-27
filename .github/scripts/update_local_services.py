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
    districts = {
        'AKÇAABAT': 'Akçaabat', 'ARAKLI': 'Araklı', 'ARSİN': 'Arsin',
        'BEŞİKDÜZÜ': 'Beşikdüzü', 'ÇARŞIBAŞI': 'Çarşıbaşı', 'ÇAYKARA': 'Çaykara',
        'DERNEKPAZARI': 'Dernekpazarı', 'DÜZKÖY': 'Düzköy', 'HAYRAT': 'Hayrat',
        'KÖPRÜBAŞI': 'Köprübaşı', 'MAÇKA': 'Maçka', 'OF': 'Of',
        'ORTAHİSAR': 'Ortahisar', 'SÜRMENE': 'Sürmene', 'ŞALPAZARI': 'Şalpazarı',
        'TONYA': 'Tonya', 'VAKFIKEBİR': 'Vakfıkebir', 'YOMRA': 'Yomra',
    }
    # The province list contains the district on each pharmacy card.
    source = 'https://www.trabzoneczaciodasi.org.tr/nobetci-eczaneler/61'
    soup = fetch(source)
    text = clean(soup.get_text(' ', strip=True))
    today_tr = datetime.now(timezone(timedelta(hours=3))).strftime('%d.%m.%Y')
    if 'TRABZON NÖBETÇİ ECZANELER' not in text:
        raise ValueError('Trabzon nöbet listesi bulunamadı')
    district_pattern = '|'.join(districts)
    pattern = re.compile(
        r'(?P<name>[A-ZÇĞİÖŞÜ][A-ZÇĞİÖŞÜ0-9 .\-]{2,55} ECZANESİ)\s+'
        r'(?P=name)\s+(?P<date>\d{2}\.\d{2}\.20\d{2})\s+(?P<start_time>\d{2}:\d{2})\s*-\s*'
        r'(?P<end_date>\d{2}\.\d{2}\.20\d{2})\s+(?P<end_time>\d{2}:\d{2})\s+arası nöbetçidir\.\s+'
        rf'(?P<district>{district_pattern})\s+(?P<address>.{{5,300}}?)\s+(?P<phone>0\d{{10}})\s+Haritada görüntülemek', re.I
    )
    grouped = {display: [] for display in districts.values()}
    for match in pattern.finditer(text):
        if match['date'] != today_tr:
            continue
        start = datetime.strptime(match['date'] + ' ' + match['start_time'], '%d.%m.%Y %H:%M').replace(tzinfo=timezone(timedelta(hours=3)))
        end = datetime.strptime(match['end_date'] + ' ' + match['end_time'], '%d.%m.%Y %H:%M').replace(tzinfo=timezone(timedelta(hours=3)))
        if end <= start:
            continue
        display = districts.get(match['district'].upper())
        if not display:
            continue
        record = {'name': clean(match['name']), 'address': clean(match['address']),
                  'phone': match['phone'], 'startsAt': start.isoformat(), 'endsAt': end.isoformat()}
        if record not in grouped[display]:
            grouped[display].append(record)
    current = data['pharmacies']
    now = datetime.now(timezone(timedelta(hours=3)))
    total = sum(map(len, grouped.values()))
    if total:
        grouped = {name: cards[:25] for name, cards in grouped.items()}
        akcaabat = grouped['Akçaabat']
        active = next((item for item in akcaabat if datetime.fromisoformat(item['startsAt']) <= now < datetime.fromisoformat(item['endsAt'])), None)
        fresh = {'date': today, 'source': source, 'districts': grouped,
                 'startsAt': active['startsAt'] if active else None,
                 'endsAt': active['endsAt'] if active else None,
                 'items': [{key: card[key] for key in ('name', 'address', 'phone')} for card in akcaabat]}
        if any(current.get(key) != value for key, value in fresh.items()):
            current.update(fresh, updatedAt=datetime.now(timezone.utc).isoformat())
        print('Eczacı Odası:', total, 'eczane /', sum(bool(cards) for cards in grouped.values()), 'ilçe')
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
            relative = re.search(r'Yakın Bilgisi\s*:\s*(.*)$', body, re.I)
            map_node = body_node.select_one('.open-map')
            latitude = clean(map_node.get('data-lat')) if map_node else ''
            longitude = clean(map_node.get('data-lng')) if map_node else ''
            try:
                if not (-90 <= float(latitude) <= 90 and -180 <= float(longitude) <= 180):
                    latitude = longitude = ''
            except ValueError:
                latitude = longitude = ''
            details = ' • '.join(part for part in (
                clean(prayer[1]) if prayer else '',
                clean(mosque[1]) if mosque else '',
                clean(cemetery[1]) if cemetery else ''
            ) if part)
            entry = {
                'name': name[:150], 'date': date.isoformat(), 'details': details[:300],
                'prayerTime': clean(prayer[1])[:80] if prayer else '',
                'mosque': clean(mosque[1])[:180] if mosque else '',
                'cemetery': clean(cemetery[1])[:180] if cemetery else '',
                'relative': clean(relative[1])[:180] if relative else '',
                'latitude': latitude, 'longitude': longitude,
            }
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
if data['pharmacies'].get('date') != today:
    data['pharmacies'].update(date=None, startsAt=None, endsAt=None, items=[], districts={})
elif expiry and datetime.fromisoformat(expiry) <= datetime.now(timezone(timedelta(hours=3))) and not data['pharmacies'].get('districts'):
    data['pharmacies'].update(date=None, startsAt=None, endsAt=None, items=[])
PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
