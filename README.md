# ComicBook Server

A self-hosted web application for browsing and reading digital comic books (CBR and CBZ) in any modern browser.

**Stack:** Python 3 / Flask · React 18 · Vite · Tailwind CSS · SQLite · Docker

---

## Features

- Browse your comic library with a clean, dark-themed, mobile-friendly UI
- Read CBR and CBZ comics in the browser — full-screen page reader
- Keyboard navigation (← → Esc) and click zones
- **User accounts** with email + password (invite-only registration)
- **Admin dashboard** — stats, user management, invite system, comic inventory
- **Invite system** — generate single-use links with optional expiry
- Reading history per user
- Submit comic requests and bug reports
- Docker deployment — one command to run
- Fully responsive — desktop, tablet, and mobile

---

## Quick Start (Docker)

The easiest way to run ComicBookServer:

```bash
# 1. Clone the repo
git clone <repo-url> && cd ComicBookServer

# 2. Create your .env file
cp .env.example .env
# Edit .env: set COMIC_DIR and SECRET_KEY

# 3. Start
docker compose up -d

# 4. Open http://localhost:8080
# Register the first account — it becomes admin automatically (no invite needed)
```

---

## First-time setup

1. Open `http://localhost:8080` and click **Create an account**
2. Register with any email/username/password (no invite token needed for the very first user)
3. You are now the **admin** — log in to `/admin` to invite other users

---

## Docker Compose environment variables

| Variable    | Required | Description |
|-------------|----------|-------------|
| `COMIC_DIR` | Yes      | Path to your comics folder on the host (e.g. `/mnt/nas/comics`) |
| `SECRET_KEY`| Yes      | Long random string for signing sessions. Generate: `python3 -c "import secrets; print(secrets.token_hex(32))"` |
| `DATA_DIR`  | No       | Where to store the database and logs. Default: `/app/data` (inside container, persisted via volume) |
| `PORT`      | No       | Internal port. Default: `8080` |

---

## Manual setup (development)

**Requirements:**
- Python 3.11+
- Node.js 20+
- `unzip` and `unrar-free` system packages

```bash
# Backend
pip install -r requirements.txt

# Frontend
cd frontend && npm install && npm run build && cd ..

# Run
export COMIC_DIR="/path/to/comics"
export SECRET_KEY="your-secret-key"
python3 app.py
```

**Dev mode (hot reload):**
```bash
# Terminal 1 — Flask
export COMIC_DIR="/path/to/comics"
python3 app.py

# Terminal 2 — Vite (proxies /api to Flask)
cd frontend && npm run dev
# Open http://localhost:3000
```

---

## API Reference

### Auth
| Method | Path | Description |
|--------|------|-------------|
| GET  | `/api/auth/status`   | Current session status + user info |
| POST | `/api/auth/register` | Register with invite token (first user = admin, no token) |
| POST | `/api/auth/login`    | Login with email + password |
| POST | `/api/auth/logout`   | Clear session |
| GET  | `/api/auth/me`       | Current user profile |
| PUT  | `/api/auth/me`       | Update profile / change password |

### Comics
| Method | Path | Description |
|--------|------|-------------|
| GET  | `/api/comics/browse?dir=` | List directories and comics |
| POST | `/api/comics/open`        | Extract and open a comic |
| GET  | `/api/comics/pages?sessionId=` | Get extracted page image URLs |
| GET  | `/api/comics/history`     | Reading history for current user |

### Admin (requires admin role)
| Method | Path | Description |
|--------|------|-------------|
| GET    | `/api/admin/stats`          | Dashboard statistics |
| GET    | `/api/admin/users`          | List users (paginated, searchable) |
| PUT    | `/api/admin/users/:id`      | Update user role/active status |
| DELETE | `/api/admin/users/:id`      | Delete user |
| GET    | `/api/admin/invites`        | List all invites |
| POST   | `/api/admin/invites`        | Create invite link |
| DELETE | `/api/admin/invites/:id`    | Revoke unused invite |
| GET    | `/api/admin/inventory`      | Browse comic inventory (paginated, searchable) |

### Feedback
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/request` | Submit a comic request |
| POST | `/api/issue`   | Report a problem |

---

## Data storage

| What | Where |
|------|-------|
| User accounts + invites + history | `DATA_DIR/comics.db` (SQLite) |
| Access log | `DATA_DIR/access.log` |
| Comic requests | `DATA_DIR/request.txt` |
| Issue reports  | `DATA_DIR/issue.txt` |
| Extracted comic sessions | `static/sessions/` |

---

## User roles

| Role  | Capabilities |
|-------|-------------|
| user  | Browse library, read comics, submit requests/issues, view own history |
| admin | All user capabilities + admin panel (user management, invites, inventory, stats) |
