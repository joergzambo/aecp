# AECP – Analyze · Explain · Configure · Practice

Lernplattform Netzwerktechnik für **nwt.joergzambo.com** – eine ganz normale statische Website
(nur HTML, CSS und JavaScript; kein WordPress, kein PHP, keine Datenbank).

## Aufbau

| Pfad | Inhalt |
|---|---|
| `content.py` | Themenbereiche und Themen – hier neue Themen eintragen |
| `tools/<name>.html` | fertige interaktive Seiten (z. B. `spanning-tree.html`, `vlan.html`) |
| `src/<name>/` | Quellen einer Einheit, z. B. `src/vlan/` (Engine, Seite, unabhängige Gegenrechnung `check.py`) |
| `static/` | Design (`aecp.css`), Schriften (lokal, kein Google), Logo |
| `build.py` | erzeugt die fertige Seite im Ordner `site/` |

## Neues Thema online stellen

1. Fertige Seite als `tools/<name>.html` ablegen.
2. In `content.py` beim Thema `'tool': '<name>'` ergänzen.
3. Committen und pushen – GitHub baut und lädt automatisch hoch.

Themen ohne `tool` erscheinen als „in Vorbereitung“.

## Veröffentlichen mit GitHub Pages

Jeder Push auf `main` baut die Seite (`build.py`) und veröffentlicht sie auf **https://nwt.joergzambo.com**
(Workflow `.github/workflows/pages.yml`).

Einmalig einrichten:

1. Repo öffentlich auf GitHub anlegen (z. B. `joergzambo/aecp`) und diesen Inhalt pushen.
2. *Settings → Pages → Build and deployment → Source:* **GitHub Actions**.
3. *Settings → Pages → Custom domain:* `nwt.joergzambo.com` eintragen und speichern.
4. DNS bei hosting.de (Zone joergzambo.com): **CNAME** `nwt` → `joergzambo.github.io`
   (eine eventuell vorhandene Webspace-Subdomain `nwt` vorher entfernen).
5. Sobald der Haken verfügbar ist: **Enforce HTTPS** aktivieren.

## Lokal ansehen

```bash
python3 build.py && cd site && python3 -m http.server 8000
```
