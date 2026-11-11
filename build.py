"""Baut die statische NWT-Seite (nwt.joergzambo.com) nach ./site.

Aufbau:
  content.py   – Themenbereiche und Themen (hier neue Themen eintragen)
  tools/<name>.html – fertige interaktive Seiten (z. B. spanning-tree.html)
  static/      – CSS, Schriften, Logo (wird 1:1 kopiert)

Aufruf: python3 build.py
"""
import html
import json
import os
import re
import shutil

from content import AREAS, SITE

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, 'site')
esc = html.escape


def rel(depth):
    return '../' * depth


def head(title, depth, desc):
    r = rel(depth)
    full = esc(title + ' – ' + SITE['name'] if title != SITE['name'] else SITE['name'] + ' – ' + SITE['claim'])
    return f'''<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{full}</title>
<meta name="description" content="{esc(desc)}">
<link rel="icon" type="image/png" sizes="512x512" href="{r}assets/img/nwt-512.png">
<link rel="apple-touch-icon" href="{r}assets/img/nwt-180.png">
<link rel="stylesheet" href="{r}assets/aecp.css">
</head>
'''


def header(depth, active=''):
    r = rel(depth)
    links = ''.join(
        f'<a href="{r}{a["slug"]}/"{" aria-current=\"page\"" if a["slug"] == active else ""}>{esc(a["title"])}</a>'
        for a in AREAS)
    return f'''<header class="aecp-header">
 <div class="aecp-wrap aecp-header-in">
  <a class="aecp-brand" href="{r}"><img src="{r}assets/img/nwt-logo-120.png" alt="{esc(SITE["name"])}" width="160" height="42"></a>
  <input type="checkbox" id="aecp-menu" class="aecp-menu-toggle"><label for="aecp-menu" class="aecp-menu-btn" aria-label="Menü öffnen">Menü</label>
  <nav class="aecp-nav" aria-label="Hauptmenü">{links}</nav>
 </div>
</header>
'''


def footer(depth):
    return f'''<footer class="aecp-footer">
 <p class="aecp-tagline">{esc(SITE["name"])} · {esc(SITE["claim"])}</p>
 <p>Netzwerktechnik lernen · ein Projekt von <a href="https://joergzambo.com/">Jörg Zambo</a></p>
 <p><a href="https://joergzambo.com/impressum/">Impressum</a></p>
</footer>
'''


def live(topic):
    return bool(topic.get('tool'))


def area_card(a, depth):
    r = rel(depth)
    items = ''.join(f'<li class="{"on" if live(t) else "off"}">{esc(t["title"])}</li>' for t in a['topics'])
    n = sum(1 for t in a['topics'] if live(t))
    return (f'<a class="aecp-area" href="{r}{a["slug"]}/"><strong>{esc(a["title"])}</strong><span>{esc(a["text"])}</span>'
            f'<i class="aecp-badge">{n} von {len(a["topics"])} Themen online</i><ul>{items}</ul></a>')


def topic_card(a, t, depth):
    if live(t):
        return (f'<a class="aecp-card" href="{rel(depth)}{a["slug"]}/{t["slug"]}/"><strong>{esc(t["title"])}</strong>'
                f'<span>{esc(t["text"])}</span><em class="go">Öffnen →</em></a>')
    return f'<div class="aecp-card soon"><strong>{esc(t["title"])}</strong><span>{esc(t["text"])}</span><em>in Vorbereitung</em></div>'


def write(path, text):
    full = os.path.join(OUT, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    open(full, 'w', encoding='utf-8').write(text)


def page(title, depth, desc, body, active=''):
    return head(title, depth, desc) + '<body class="aecp">\n' + header(depth, active) + '<main class="aecp-main">\n' + body + '\n</main>\n' + footer(depth) + '</body>\n</html>\n'


# Seiten mit Netzplänen bekommen die Zoom-Leiste (static/zoom.js)
ZOOM_TOOLS = {'spanning-tree', 'vlan', 'inter-vlan-routing', 'collision-broadcast-domains', 'statisches-routing', 'rip', 'ethernet-switching', 'dhcp', 'routing-schleifen'}


def build_tool(area, topic, depth):
    """Die fertige Tool-Seite bekommt Header, Footer, Schriften und Brotkrumen der Plattform."""
    src = open(os.path.join(ROOT, 'tools', topic['tool'] + '.html'), encoding='utf-8').read()
    r = rel(depth)
    src = re.sub(r'<title>.*?</title>', f'<title>{esc(topic["title"])} – {esc(SITE["name"])}</title>', src, count=1, flags=re.S)
    src = src.replace('</head>', f'''<meta name="description" content="{esc(topic["text"])}">
<link rel="icon" type="image/png" sizes="512x512" href="{r}assets/img/nwt-512.png">
<link rel="stylesheet" href="{r}assets/aecp.css">
<style>
/* Schriften der Plattform auch im Tool */
body{{font-family:"Open Sans","Helvetica Neue",Arial,sans-serif}}
.anim{{--body:"Open Sans","Helvetica Neue",Arial,sans-serif}}
main h1,.part,.story h2,.gtitle,.ex h2{{font-family:"Belgrano",Georgia,serif;font-weight:400!important;letter-spacing:.5px}}
main button,.jump,.atabs button,.pager>button{{font-family:"Bitter",Georgia,serif!important;letter-spacing:.3px}}
</style>
</head>''', 1)
    crumbs = (f'<nav class="aecp-crumbs aecp-wrap" aria-label="Brotkrumen"><a href="{r}">Start</a> › '
              f'<a href="{r}{area["slug"]}/">{esc(area["title"])}</a> › <span>{esc(topic["title"])}</span></nav>')
    src = re.sub(r'<body([^>]*)>', lambda m: f'<body{m.group(1)}>\n' + header(depth, area['slug']) + crumbs, src, count=1)
    if topic['tool'] in ZOOM_TOOLS:
        src = src.replace('</body>', f'<script src="{r}assets/zoom.js"></script>\n</body>', 1)
    src = src.replace('</body>', footer(depth) + '</body>', 1)
    return src


def build():
    if os.path.isdir(OUT):
        shutil.rmtree(OUT)
    shutil.copytree(os.path.join(ROOT, 'static'), os.path.join(OUT, 'assets'))

    # Startseite
    areas = ''.join(area_card(a, 0) for a in AREAS)
    news = ''.join(f'<p class="aecp-center">{n}</p>' for n in SITE['news'])
    write('index.html', page(SITE['name'], 0, SITE['description'], f'''<section class="aecp-hero aecp-wrap">
 <h1 class="nwt-title"><img src="assets/img/nwt-logo.png" alt="NWT" width="1983" height="521"></h1>
 <p class="aecp-tagline">Netzwerktechnik lernen</p>
 <hr class="aecp-divider">
 <p class="aecp-center aecp-lead">{SITE["intro"]}</p>
 {news}
</section>
<section class="aecp-wrap aecp-wide"><div class="aecp-areas">{areas}</div></section>'''))

    # Bereiche und Themen
    for a in AREAS:
        cards = ''.join(topic_card(a, t, 1) for t in a['topics'])
        write(f'{a["slug"]}/index.html', page(a['title'], 1, a['text'], f'''<section class="aecp-wrap">
 <nav class="aecp-crumbs" aria-label="Brotkrumen"><a href="../">Start</a> › <span>{esc(a["title"])}</span></nav>
 <h1>{esc(a["title"])}</h1>
 <p class="aecp-lead">{esc(a["text"])} Wähle ein Thema:</p>
</section>
<section class="aecp-wrap aecp-wide"><div class="aecp-cards">{cards}</div></section>''', a['slug']))
        for t in a['topics']:
            if live(t):
                write(f'{a["slug"]}/{t["slug"]}/index.html', build_tool(a, t, 2))

    write('404.html', page('Seite nicht gefunden', 0, 'Seite nicht gefunden', '''<section class="aecp-wrap aecp-narrow aecp-center">
 <h1>Seite nicht gefunden</h1><p>Diese Seite gibt es (noch) nicht. <a href="/">Zur Startseite</a></p></section>'''))
    # Eigene Domain für GitHub Pages
    write('CNAME', SITE.get('domain', 'nwt.joergzambo.com') + '\n')
    # Schutz: keine Verzeichnisauflistung, 404-Seite, Caching für Schriften/Bilder
    write('.htaccess', '''Options -Indexes
ErrorDocument 404 /404.html
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType font/woff2 "access plus 1 year"
  ExpiresByType image/png "access plus 1 month"
  ExpiresByType text/css "access plus 1 week"
</IfModule>
''')
    files = sum(len(f) for _, _, f in os.walk(OUT))
    print('fertig:', OUT, files, 'Dateien')


if __name__ == '__main__':
    build()
