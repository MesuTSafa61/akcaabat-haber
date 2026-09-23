"""Build a public sitemap from published Supabase news using the site's publishable key."""
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[2]
BASE = "https://akcaabathaber.com.tr"
STATIC_PAGES = (
    "", "haber.html", "mac-merkezi.html", "kameralar.html", "trafik.html",
    "hava-durumu.html", "hakkimizda.html", "iletisim.html",
)


def published_news():
    config = (ROOT / "supabase-config.js").read_text()
    url = re.search(r'url:\s*"([^"]+)"', config).group(1)
    key = re.search(r'key:\s*"([^"]+)"', config).group(1)
    rows = []
    offset = 0
    while True:
        request = Request(
            f"{url}/rest/v1/news?select=slug,published_at&status=eq.published&slug=not.is.null&order=published_at.desc&limit=1000&offset={offset}",
            headers={"apikey": key, "Authorization": "Bearer " + key},
        )
        with urlopen(request, timeout=25) as response:
            batch = json.load(response)
        rows.extend(batch)
        if len(batch) < 1000:
            break
        offset += 1000
    return rows


def generate(rows):
    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for page in STATIC_PAGES:
        lines.append(f"  <url><loc>{BASE}/{page}</loc></url>")
    for news in rows:
        slug = news.get("slug", "")
        if not slug:
            continue
        date = datetime.fromisoformat(news["published_at"].replace("Z", "+00:00"))
        if date > datetime.now(timezone.utc):
            continue
        address = BASE + "/haber-detay.html?slug=" + quote(slug, safe="")
        lines.append(f"  <url><loc>{address}</loc><lastmod>{date.date().isoformat()}</lastmod></url>")
    lines.append("</urlset>")
    return "\n".join(lines) + "\n"


if __name__ == "__main__":
    (ROOT / "sitemap.xml").write_text(generate(published_news()))
