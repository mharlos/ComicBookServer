# ComicBook Server

A self-hosted web application for browsing and reading digital comic books (CBR and CBZ) in any modern browser.

**Stack:** Python 3 / Flask REST API · React 18 · Vite · Tailwind CSS

---

## Features

- Browse your comic library with a clean, dark-themed UI
- Read CBR and CBZ comics right in the browser — page by page
- Keyboard navigation in the reader (← → Esc)
- Beta-key access control
- Submit comic requests and bug reports
- Fully responsive — works on desktop, tablet, and mobile

---

## Requirements

| Tool | Version |
|------|---------|
| Python | 3.10+ |
| Node.js | 18+ |
| npm | 9+ |
| unzip | any |
| unrar | any |

---

## Quick Start

### 1. Clone the repo

```bash
git clone https://github.com/mharlos/comicbookserver.git
cd comicbookserver
```

### 2. Set up the Python backend

```bash
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Build the React frontend

```bash
cd frontend
npm install
npm run build
cd ..
```

### 4. Configure

Set the path to your comics folder:

```bash
export COMIC_DIR="/path/to/your/comics"
export SECRET_KEY="$(python3 -c 'import secrets; print(secrets.token_hex(32))')"
```

### 5. Add beta keys

Each line in `betaKeys` is one valid key:

```
mysecretkey123
anotherkey456
```

To disable authentication entirely, set `USE_AUTH=false`.

### 6. Start the server

```bash
python3 app.py
```

Open [http://localhost:5000](http://localhost:5000) and log in with a beta key.

---

## Development Mode

Run the Flask API and the Vite dev server simultaneously:

**Terminal 1 — backend:**
```bash
export COMIC_DIR="/path/to/comics"
export DEBUG=true
python3 app.py
```

**Terminal 2 — frontend:**
```bash
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Vite proxies `/api` and `/static` requests to Flask automatically.

---

## Project Structure

```
comicbookserver/
├── app.py              # Flask REST API
├── requirements.txt    # Python dependencies
├── process.sh          # Archive extraction script (unzip / unrar)
├── betaKeys            # One beta key per line
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── index.css
│   │   ├── api/client.js       # Fetch wrappers for all endpoints
│   │   ├── components/         # Navbar, ComicCard, Modal, …
│   │   └── pages/              # Login, Browser, Reader
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
└── static/
    ├── images/         # Logo, backgrounds, UI assets
    ├── music/          # Optional theme music
    └── sessions/       # Runtime — extracted comic pages (auto-created)
```

---

## API Reference

All endpoints are under `/api`. Auth endpoints use Flask sessions (cookie-based).

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/auth/status` | Check if the current session is authenticated |
| `POST` | `/api/auth/login` | Login with `{ key }` body |
| `POST` | `/api/auth/logout` | Clear session |
| `GET` | `/api/comics/browse?dir=` | List directories and comics |
| `POST` | `/api/comics/open` | Extract a comic into a session. Body: `{ path }` |
| `GET` | `/api/comics/pages?sessionId=` | Return image URLs for an open comic session |
| `POST` | `/api/request` | Submit a comic request. Body: `{ comic }` |
| `POST` | `/api/issue` | Submit a bug report. Body: `{ description }` |

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `COMIC_DIR` | *(required)* | Absolute path to your comics folder |
| `SECRET_KEY` | `change-me-in-production-please` | Flask session secret — **change this** |
| `PORT` | `5000` | Port to listen on |
| `DEBUG` | `false` | Enable Flask debug mode |
| `USE_AUTH` | `true` | Set to `false` to disable beta-key auth |

---

## Comic Format Support

| Format | Extension | Notes |
|--------|-----------|-------|
| Comic Book RAR | `.cbr` | Requires `unrar` |
| Comic Book ZIP | `.cbz` | Requires `unzip` |

---

## Session Cleanup

Extracted comic sessions live in `static/sessions/`. They are not cleaned up automatically. To purge old sessions:

```bash
rm -rf static/sessions/*/
```

Or via cron to clear sessions older than 24 hours:

```bash
find static/sessions -mindepth 1 -maxdepth 1 -type d -mtime +1 -exec rm -rf {} +
```

---

## Version History

**v2.0**
- Complete rewrite with React 18 + Vite + Tailwind CSS frontend
- Python 3 Flask REST API (replaces Python 2 / Jinja2 template approach)
- Removed Redis/Beaker dependency — uses Flask's built-in sessions
- Dark-themed UI with comic-book aesthetic, keyboard navigation in reader
- Breadcrumb navigation, comic count, shimmer loading skeletons
- Comic request and issue report modals

**v1.0b** — v0.1a
> Original Python 2 / jQuery implementation. See git history for details.

---

## License

MIT
