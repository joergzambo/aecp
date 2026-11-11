# AECP – Analyze · Explain · Configure · Practice

Lernplattform Netzwerktechnik für **nwt.joergzambo.com** – eine ganz normale statische Website
(nur HTML, CSS und JavaScript; kein WordPress, kein PHP, keine Datenbank).

## Aufbau

| Pfad | Inhalt |
|---|---|
| `content.py` | Themenbereiche und Themen – hier neue Themen eintragen |
| `tools/<name>.html` | fertige interaktive Seiten (z. B. `spanning-tree.html`) |
| `static/` | Design (`aecp.css`), Schriften (lokal, kein Google), Logo |
| `build.py` | erzeugt die fertige Seite im Ordner `site/` |

## Neues Thema online stellen

1. Fertige Seite als `tools/<name>.html` ablegen.
2. In `content.py` beim Thema `'tool': '<name>'` ergänzen.
3. Committen und pushen – GitHub baut und lädt automatisch hoch.

Themen ohne `tool` erscheinen als „in Vorbereitung“.

## Automatisch hochladen (GitHub → hosting.de per FTP)

Einmalig im GitHub-Repo unter *Settings → Secrets and variables → Actions* anlegen:

| Secret | Wert |
|---|---|
| `FTP_SERVER` | FTP-Server von hosting.de |
| `FTP_USERNAME` | FTP-Benutzer |
| `FTP_PASSWORD` | FTP-Passwort |
| `FTP_DIR` | Zielordner der Subdomain, mit `/` am Ende, z. B. `/nwt.joergzambo.com/` |

Danach lädt jeder Push auf `main` die Seite hoch (Workflow `.github/workflows/deploy.yml`).
Ohne GitHub: `python3 build.py` ausführen und den Inhalt von `site/` per FTP in den Ordner der Subdomain kopieren.

## Lokal ansehen

```bash
python3 build.py && cd site && python3 -m http.server 8000
```
