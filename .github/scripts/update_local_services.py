"""Refresh public local service data; never publish an unverified or stale duty list."""
import json
import re
from datetime import datetime, timezone, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.request import Request, urlopen, build_opener, HTTPCookieProcessor
from http.cookiejar import CookieJar
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
    months = {'Ocak': 1, 'Şubat': 2, 'Mart': 3, 'Nisan': 4, 'Mayıs': 5, 'Haziran': 6,
              'Temmuz': 7, 'Ağustos': 8, 'Eylül': 9, 'Ekim': 10, 'Kasım': 11, 'Aralık': 12}
    locations = {
        'Akçaabat': (9891, 'akcaabat'), 'Ortahisar': (9905, 'trabzon'),
        'Araklı': (9892, 'arakli'), 'Arsin': (9893, 'arsin'),
        'Beşikdüzü': (9894, 'besikduzu'), 'Çarşıbaşı': (9895, 'carsibasi'),
        'Çaykara': (9896, 'caykara'), 'Dernekpazarı': (9897, 'dernekpazari'),
        'Düzköy': (9898, 'duzkoy'), 'Hayrat': (9899, 'hayrat'),
        'Köprübaşı': (9900, 'koprubasi-t'), 'Of': (9901, 'of'),
        'Şalpazarı': (9902, 'salpazari'), 'Sürmene': (9903, 'surmene'),
        'Tonya': (9904, 'tonya'), 'Vakfıkebir': (9906, 'vakfikebir'),
        'Yomra': (9907, 'yomra'),
    }

    def fetch_days(location):
        city_id, slug = locations[location]
        url = f'https://namazvakitleri.diyanet.gov.tr/tr-TR/{city_id}/{slug}-namaz-vakitleri'
        soup = fetch(url)
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
            raise ValueError(f'{location}: bugünkü Diyanet vakitleri bulunamadı')
        return [days[key] for key in sorted(days) if key >= today][:31]

    current = data['prayer']
    previous = current.get('districts') or {'Akçaabat': current.get('days', [])}
    grouped = {name: days for name, days in previous.items() if isinstance(days, list) and any(item.get('date') == today for item in days)}
    errors = []
    with ThreadPoolExecutor(max_workers=4) as pool:
        jobs = {pool.submit(fetch_days, name): name for name in locations}
        for job in as_completed(jobs):
            name = jobs[job]
            try:
                grouped[name] = job.result()
            except Exception as exc:
                errors.append(f'{name}: {type(exc).__name__}')
    if 'Akçaabat' not in grouped:
        raise ValueError('Akçaabat için doğrulanmış güncel vakit bulunamadı')
    fresh = {'days': grouped['Akçaabat'], 'districts': grouped}
    if any(current.get(key) != value for key, value in fresh.items()):
        current.update(fresh, updatedAt=datetime.now(timezone.utc).isoformat())
    print('Diyanet:', len(grouped), '/', len(locations), 'konum;', ', '.join(errors) if errors else 'tüm konumlar alındı')


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
    # Belediye sayfası kayıtları JavaScript ile ASP.NET PageMethod üzerinden getiriyor.
    # Önce sayfayı açıp oturum/cookie oluşturuyoruz; ardından farklı olası tarih
    # parametre adlarını deneyerek servisteki küçük değişikliklere dayanıklı kalıyoruz.
    source = data['obituaries']['source']
    endpoint = source.rsplit('/', 1)[0] + '/vefat-edenler.aspx/GetVerileri'
    cookie_jar = CookieJar()
    opener = build_opener(HTTPCookieProcessor(cookie_jar))
    opener.open(Request(source, headers=HEADERS), timeout=25).read()

    notices = []
    today_local = datetime.now(timezone(timedelta(hours=3))).date()

    def fetch_markup(date):
        date_text = date.strftime('%d.%m.%Y')
        last_error = None
        for payload_obj in ({'tarih': date_text}, {'Tarih': date_text}, {'date': date_text}):
            try:
                payload = json.dumps(payload_obj).encode('utf-8')
                request = Request(endpoint, data=payload, headers={**HEADERS,
                    'Content-Type': 'application/json; charset=utf-8',
                    'Accept': 'application/json, text/javascript, */*; q=0.01',
                    'Origin': 'https://www.akcaabat.bel.tr',
                    'Referer': source,
                    'X-Requested-With': 'XMLHttpRequest'}, method='POST')
                with opener.open(request, timeout=25) as response:
                    raw = response.read().decode('utf-8', errors='replace')
                parsed = json.loads(raw)
                markup = parsed.get('d', '') if isinstance(parsed, dict) else parsed
                if isinstance(markup, dict):
                    markup = markup.get('html') or markup.get('data') or ''
                if isinstance(markup, list):
                    markup = ''.join(str(item) for item in markup)
                if isinstance(markup, str):
                    return markup
            except Exception as exc:
                last_error = exc
        if last_error:
            raise last_error
        return ''

    for days_ago in range(7):
        date = today_local - timedelta(days=days_ago)
        markup = fetch_markup(date)
        if not isinstance(markup, str):
            raise ValueError('Belediye servisinden beklenmeyen yanıt')

        soup = BeautifulSoup(markup, 'html.parser')
        cards = soup.select('.accordion-item')
        if not cards:
            cards = soup.select('.accordion, .vefat-item, .vefat-karti, .card')

        for card in cards:
            name_node = card.select_one('.accordion-button, .card-header, .vefat-adi, h3, h4, strong')
            body_node = card.select_one('.accordion-body, .card-body, .vefat-detay') or card
            if not name_node or not body_node:
                continue
            name = clean(name_node.get_text(' ', strip=True))
            body = clean(body_node.get_text(' ', strip=True))

            date_match = re.search(r'(?:Defin\s*Tarihi|Tarih)\s*:?\s*(\d{1,2}[./-]\d{1,2}[./-]20\d{2})', body, re.I)
            record_date = date
            if date_match:
                normalized_date = date_match[1].replace('/', '.').replace('-', '.')
                try:
                    record_date = datetime.strptime(normalized_date, '%d.%m.%Y').date()
                except ValueError:
                    record_date = date
                if record_date != date:
                    continue

            prayer = re.search(r'Namaz\s*Vakti\s*:?\s*(.*?)\s+Namaz\s*Yeri\s*:', body, re.I)
            mosque = re.search(r'Namaz\s*Yeri\s*:?\s*(.*?)\s*(?:-\s*Haritada\s*Göster|Mezarlık\s*:)', body, re.I)
            cemetery = re.search(r'Mezarlık\s*:?\s*(.*?)\s+Yakın\s*Bilgisi\s*:', body, re.I)
            relative = re.search(r'Yakın\s*Bilgisi\s*:?\s*(.*)$', body, re.I)
            map_node = body_node.select_one('.open-map, [data-lat][data-lng]')
            latitude = clean(map_node.get('data-lat')) if map_node else ''
            longitude = clean(map_node.get('data-lng')) if map_node else ''
            try:
                if not (-90 <= float(latitude) <= 90 and -180 <= float(longitude) <= 180):
                    latitude = longitude = ''
            except (ValueError, TypeError):
                latitude = longitude = ''

            details = ' • '.join(part for part in (
                clean(prayer[1]) if prayer else '',
                clean(mosque[1]) if mosque else '',
                clean(cemetery[1]) if cemetery else ''
            ) if part)
            entry = {
                'name': name[:150], 'date': record_date.isoformat(), 'details': details[:300],
                'prayerTime': clean(prayer[1])[:80] if prayer else '',
                'mosque': clean(mosque[1])[:180] if mosque else '',
                'cemetery': clean(cemetery[1])[:180] if cemetery else '',
                'relative': clean(relative[1])[:180] if relative else '',
                'latitude': latitude, 'longitude': longitude,
            }
            if entry not in notices:
                notices.append(entry)

    current = data['obituaries']
    if notices != current.get('items'):
        current.update(updatedAt=datetime.now(timezone.utc).isoformat(), items=notices[:60])
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
