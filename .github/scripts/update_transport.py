"""Cache public TBB timetables and DHMI flight boards without exposing source tokens."""
import json
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone, timedelta
from pathlib import Path
from urllib.parse import parse_qs, urlparse
from urllib.request import Request, urlopen
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[2]
PATH = ROOT / 'data/ulasim.json'
BUS_URL = 'https://ulasim.trabzon.bel.tr/'
FLIGHT_URL = 'https://www.dhmi.gov.tr/Sayfalar/Havalimani/Trabzon/AnaSayfa.aspx'
HEADERS = {'User-Agent': 'Mozilla/5.0 (compatible; AkcaabatHaber/1.0)'}


def stamp():
    return datetime.now(timezone.utc).isoformat()


def get(url, headers=None):
    with urlopen(Request(url, headers={**HEADERS, **(headers or {})}), timeout=30) as response:
        return response.read()


def text(node):
    return re.sub(r'\s+', ' ', node.get_text(' ', strip=True)).strip() if node else ''


def fresh(value, hours):
    try:
        return datetime.now(timezone.utc) - datetime.fromisoformat(value) < timedelta(hours=hours)
    except (ValueError, TypeError):
        return False


def parse_routes(html):
    soup = BeautifulSoup(html, 'html.parser')
    routes = []
    for link in soup.select('a.tbb-hat-link'):
        route_id = parse_qs(urlparse(link.get('href', '')).query).get('hatIdler', [''])[0]
        code, name = text(link.select_one('.tbb-hat-badge')), text(link.select_one('.tbb-hat-name'))
        if route_id.isdigit() and code and name:
            routes.append({'id': route_id, 'code': code, 'name': name,
                           'source': f'{BUS_URL}Web/HatSaat?hatIdler={route_id}&yon=1'})
    if not routes:
        raise ValueError('Belediye hat listesi okunamadı')
    return routes


def parse_schedule(html):
    soup = BeautifulSoup(html, 'html.parser')
    labels = {b.get('data-yon'): text(b) for b in soup.select('.tbb-schedule-yon-btn')}
    directions = []
    for section in soup.select('.tbb-schedule-section[data-yon]'):
        days = [text(th) for th in section.select('thead th')]
        rows = [[text(td) for td in row.select('td')] for row in section.select('tbody tr')]
        if len(days) != 3 or any(len(row) != 3 for row in rows):
            raise ValueError('Sefer tablosu biçimi değişmiş')
        directions.append({'id': section['data-yon'], 'name': labels.get(section['data-yon'], 'Kalkış'),
                           'days': days, 'rows': rows})
    if not directions:
        raise ValueError('Sefer saatleri bulunamadı')
    return directions


def refresh_bus(previous):
    if fresh(previous.get('updatedAt'), 12) and previous.get('routes'):
        return previous
    routes = parse_routes(get(BUS_URL))
    old = {r['id']: r for r in previous.get('routes', [])}

    def load(route):
        cached = old.get(route['id'], {})
        if cached.get('directions') and fresh(cached.get('updatedAt'), 12):
            return {**cached, **route}
        try:
            route['directions'] = parse_schedule(get(route['source']))
            route['updatedAt'] = stamp()
            route['error'] = False
        except Exception as exc:
            print(f"Bus {route['code']}: {type(exc).__name__}")
            route = {**cached, **route, 'error': True}
        return route

    with ThreadPoolExecutor(max_workers=4) as pool:
        routes = list(pool.map(load, routes))
    # Retry incomplete schedules on the next run; individual timestamps remain truthful.
    complete = all(r.get('directions') and not r.get('error') for r in routes)
    return {'source': BUS_URL, 'updatedAt': stamp() if complete else previous.get('updatedAt'),
            'checkedAt': stamp(), 'routes': routes}


def normalize_flights(items):
    if not isinstance(items, list):
        raise ValueError('Uçuş servisi liste döndürmedi')
    result = []
    for item in items:
        if not isinstance(item, dict) or not item.get('Number') or not item.get('Date'):
            raise ValueError('Uçuş servisi biçimi değişmiş')
        result.append({key: str(item.get(source) or '').strip() for key, source in
                       [('number', 'Number'), ('date', 'Date'), ('city', 'SrcDst'),
                        ('planned', 'Planned'), ('estimated', 'Estimated'),
                        ('status', 'Status'), ('gate', 'Gate'), ('airline', 'Airline')]})
    return result


def refresh_flights(previous):
    soup = BeautifulSoup(get(FLIGHT_URL), 'html.parser')
    token = soup.select_one('#Ktoken')
    airport = text(soup.select_one('#flightnumber'))
    if not token or not token.get('value') or airport != '8':
        raise ValueError('Trabzon uçuş servisi doğrulanamadı')
    boards = dict(previous.get('boards', {}))

    def load(direction, kind):
        key = f'{direction}-{kind}'
        da = 'DA' if direction == 'arrivals' else 'DD'
        flight_kind = 'D' if kind == 'domestic' else 'I'
        url = f'https://flightwebsvc.dhmi.gov.tr/api/Flights/{airport}/{da}/{flight_kind}'
        try:
            # The public gateway occasionally returns a non-JSON success page; retry once.
            try:
                items = normalize_flights(json.loads(get(url, {'KToken': token['value'], 'Referer': FLIGHT_URL})))
            except (ValueError, OSError):
                items = normalize_flights(json.loads(get(url, {'KToken': token['value'], 'Referer': FLIGHT_URL})))
            return key, {'updatedAt': stamp(), 'items': items, 'error': False}
        except Exception as exc:
            print(f'Flight {key}: {type(exc).__name__}')
            return key, {**boards.get(key, {}), 'error': True}

    with ThreadPoolExecutor(max_workers=4) as pool:
        futures = [pool.submit(load, d, k) for d in ['arrivals', 'departures'] for k in ['domestic', 'international']]
        for future in as_completed(futures):
            key, board = future.result()
            boards[key] = board
    return {'source': FLIGHT_URL, 'checkedAt': stamp(), 'boards': boards}


def main():
    data = json.loads(PATH.read_text()) if PATH.exists() else {'buses': {}, 'flights': {}}
    with ThreadPoolExecutor(max_workers=2) as pool:
        jobs = {pool.submit(fn, data.get(key, {})): key for key, fn in [('buses', refresh_bus), ('flights', refresh_flights)]}
        for future in as_completed(jobs):
            key = jobs[future]
            try:
                data[key] = future.result()
            except Exception as exc:
                print(f'{key}: {type(exc).__name__}; keeping last verified data')
                data.setdefault(key, {})['error'] = True
    PATH.parent.mkdir(exist_ok=True)
    PATH.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    print('Transport cache saved')


if __name__ == '__main__':
    main()
