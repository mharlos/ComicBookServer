#!/usr/bin/env python3
"""
ComicBookServer v3.0
Flask REST API with SQLite user accounts, invite system, and admin dashboard.
"""

import os
import time
import shutil
import sqlite3
import secrets
import subprocess
from pathlib import Path
from functools import wraps
from datetime import datetime, timezone, timedelta

from flask import Flask, request, session, jsonify, send_from_directory, g
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash

# ── App setup ──────────────────────────────────────────────────────────────────
app = Flask(__name__, static_folder="static", static_url_path="/static")
app.secret_key = os.environ.get("SECRET_KEY", secrets.token_hex(32))

CORS(app, supports_credentials=True,
     origins=["http://localhost:3000", "http://localhost:5173"])

# ── Configuration ──────────────────────────────────────────────────────────────
BASE_DIR   = Path(__file__).parent
COMIC_DIR  = os.environ.get("COMIC_DIR", "")
DATA_DIR   = Path(os.environ.get("DATA_DIR", str(BASE_DIR)))
DB_PATH    = DATA_DIR / "comics.db"
SESSIONS_DIR = BASE_DIR / "static" / "sessions"
ACCESS_LOG = DATA_DIR / "access.log"
REQUEST_LOG = DATA_DIR / "request.txt"
ISSUE_LOG  = DATA_DIR / "issue.txt"
REACT_BUILD = BASE_DIR / "frontend" / "dist"

# ── Database schema ────────────────────────────────────────────────────────────
_SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    username     TEXT UNIQUE NOT NULL,
    email        TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role         TEXT NOT NULL DEFAULT 'user',
    active       INTEGER NOT NULL DEFAULT 1,
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    last_login   TEXT
);

CREATE TABLE IF NOT EXISTS invites (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    token       TEXT UNIQUE NOT NULL,
    note        TEXT,
    created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
    used_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    used_at     TEXT,
    expires_at  TEXT
);

CREATE TABLE IF NOT EXISTS reading_history (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    comic_path  TEXT NOT NULL,
    session_id  TEXT,
    last_page   INTEGER DEFAULT 0,
    total_pages INTEGER DEFAULT 0,
    started_at  TEXT NOT NULL DEFAULT (datetime('now')),
    last_read_at TEXT NOT NULL DEFAULT (datetime('now'))
);
"""


def init_db():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.executescript(_SCHEMA)
    conn.commit()
    conn.close()


def get_db():
    db = getattr(g, "_database", None)
    if db is None:
        db = g._database = sqlite3.connect(str(DB_PATH), check_same_thread=False)
        db.row_factory = sqlite3.Row
        db.execute("PRAGMA journal_mode=WAL")
        db.execute("PRAGMA foreign_keys=ON")
    return db


@app.teardown_appcontext
def close_db(error):
    db = getattr(g, "_database", None)
    if db is not None:
        db.close()


# ── Auth decorators ────────────────────────────────────────────────────────────
def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get("user_id"):
            return jsonify({"error": "Unauthorized"}), 401
        return f(*args, **kwargs)
    return decorated


def require_admin(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get("user_id"):
            return jsonify({"error": "Unauthorized"}), 401
        if session.get("role") != "admin":
            return jsonify({"error": "Forbidden — admin only"}), 403
        return f(*args, **kwargs)
    return decorated


# ── Path helpers ───────────────────────────────────────────────────────────────
def safe_path(relative: str):
    if not COMIC_DIR:
        return None
    base = Path(COMIC_DIR).resolve()
    decoded = relative.replace("--and--", "/").replace("--h--", "#") if relative else ""
    full = (base / decoded).resolve() if decoded else base
    return full if str(full).startswith(str(base)) else None


def count_comics() -> int:
    if not COMIC_DIR or not Path(COMIC_DIR).is_dir():
        return 0
    return sum(1 for p in Path(COMIC_DIR).rglob("*")
               if p.suffix.lower() in (".cbr", ".cbz"))


def _user_dict(u):
    return {
        "id": u["id"], "username": u["username"], "email": u["email"],
        "role": u["role"], "active": bool(u["active"]),
        "created_at": u["created_at"], "last_login": u["last_login"],
    }


# ── Auth routes ────────────────────────────────────────────────────────────────
@app.route("/api/auth/status")
def auth_status():
    uid = session.get("user_id")
    if not uid:
        return jsonify({"authenticated": False, "user": None})
    return jsonify({
        "authenticated": True,
        "user": {
            "id": uid,
            "username": session.get("username"),
            "email": session.get("email"),
            "role": session.get("role"),
        },
    })


@app.route("/api/auth/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    username = data.get("username", "").strip()[:64]
    email    = data.get("email", "").strip().lower()[:128]
    password = data.get("password", "")
    token    = data.get("inviteToken", "").strip()

    if not username or not email or not password:
        return jsonify({"error": "Username, email, and password are required"}), 400
    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400

    db = get_db()
    user_count = db.execute("SELECT COUNT(*) FROM users").fetchone()[0]
    is_first   = user_count == 0

    if not is_first:
        if not token:
            return jsonify({"error": "An invite token is required"}), 400
        inv = db.execute(
            "SELECT * FROM invites WHERE token=? AND used_by IS NULL", (token,)
        ).fetchone()
        if not inv:
            return jsonify({"error": "Invalid or already used invite token"}), 400
        if inv["expires_at"]:
            exp = datetime.fromisoformat(inv["expires_at"])
            if datetime.now(timezone.utc) > exp.replace(tzinfo=timezone.utc):
                return jsonify({"error": "This invite has expired"}), 400

    existing = db.execute(
        "SELECT id FROM users WHERE username=? OR email=?", (username, email)
    ).fetchone()
    if existing:
        return jsonify({"error": "Username or email already in use"}), 409

    pw_hash = generate_password_hash(password)
    role    = "admin" if is_first else "user"

    try:
        cur = db.execute(
            "INSERT INTO users (username, email, password_hash, role) VALUES (?,?,?,?)",
            (username, email, pw_hash, role),
        )
        uid = cur.lastrowid
        if not is_first and token:
            db.execute(
                "UPDATE invites SET used_by=?, used_at=datetime('now') WHERE token=?",
                (uid, token),
            )
        db.commit()
    except sqlite3.IntegrityError:
        return jsonify({"error": "Username or email already in use"}), 409

    session["user_id"]  = uid
    session["username"] = username
    session["email"]    = email
    session["role"]     = role

    return jsonify({"success": True, "role": role})


@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email    = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    db   = get_db()
    user = db.execute(
        "SELECT * FROM users WHERE email=? AND active=1", (email,)
    ).fetchone()

    if not user or not check_password_hash(user["password_hash"], password):
        return jsonify({"error": "Invalid email or password"}), 401

    db.execute("UPDATE users SET last_login=datetime('now') WHERE id=?", (user["id"],))
    db.commit()

    session["user_id"]  = user["id"]
    session["username"] = user["username"]
    session["email"]    = user["email"]
    session["role"]     = user["role"]

    return jsonify({"success": True, "user": _user_dict(user)})


@app.route("/api/auth/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"success": True})


@app.route("/api/auth/me")
@require_auth
def me():
    db   = get_db()
    user = db.execute(
        "SELECT id,username,email,role,active,created_at,last_login FROM users WHERE id=?",
        (session["user_id"],),
    ).fetchone()
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify(_user_dict(user))


@app.route("/api/auth/me", methods=["PUT"])
@require_auth
def update_me():
    data = request.get_json() or {}
    db   = get_db()
    user = db.execute("SELECT * FROM users WHERE id=?", (session["user_id"],)).fetchone()

    updates = {}
    if "username" in data:
        u = data["username"].strip()[:64]
        if not u:
            return jsonify({"error": "Username cannot be empty"}), 400
        updates["username"] = u
    if "email" in data:
        updates["email"] = data["email"].strip().lower()[:128]
    if "password" in data:
        if len(data["password"]) < 8:
            return jsonify({"error": "Password must be at least 8 characters"}), 400
        if not check_password_hash(user["password_hash"], data.get("currentPassword", "")):
            return jsonify({"error": "Current password is incorrect"}), 400
        updates["password_hash"] = generate_password_hash(data["password"])

    if updates:
        set_clause = ", ".join(f"{k}=?" for k in updates)
        try:
            db.execute(
                f"UPDATE users SET {set_clause} WHERE id=?",
                list(updates.values()) + [session["user_id"]],
            )
            db.commit()
        except sqlite3.IntegrityError:
            return jsonify({"error": "Username or email already in use"}), 409

        if "username" in updates:
            session["username"] = updates["username"]
        if "email" in updates:
            session["email"] = updates["email"]

    return jsonify({"success": True})


# ── Admin — stats ──────────────────────────────────────────────────────────────
@app.route("/api/admin/stats")
@require_admin
def admin_stats():
    db = get_db()
    recent_logins = db.execute(
        "SELECT username, email, last_login FROM users "
        "WHERE last_login IS NOT NULL ORDER BY last_login DESC LIMIT 10"
    ).fetchall()
    return jsonify({
        "totalUsers":    db.execute("SELECT COUNT(*) FROM users").fetchone()[0],
        "activeUsers":   db.execute("SELECT COUNT(*) FROM users WHERE active=1").fetchone()[0],
        "adminCount":    db.execute("SELECT COUNT(*) FROM users WHERE role='admin'").fetchone()[0],
        "pendingInvites":db.execute("SELECT COUNT(*) FROM invites WHERE used_by IS NULL").fetchone()[0],
        "totalInvites":  db.execute("SELECT COUNT(*) FROM invites").fetchone()[0],
        "totalReads":    db.execute("SELECT COUNT(*) FROM reading_history").fetchone()[0],
        "totalComics":   count_comics(),
        "recentLogins":  [dict(r) for r in recent_logins],
    })


# ── Admin — users ──────────────────────────────────────────────────────────────
@app.route("/api/admin/users")
@require_admin
def admin_users():
    db      = get_db()
    search  = request.args.get("search", "").strip()
    page    = max(1, int(request.args.get("page", 1)))
    per_page = 25
    offset  = (page - 1) * per_page

    if search:
        where  = "WHERE username LIKE ? OR email LIKE ?"
        params = [f"%{search}%", f"%{search}%"]
    else:
        where, params = "", []

    total = db.execute(f"SELECT COUNT(*) FROM users {where}", params).fetchone()[0]
    users = db.execute(
        f"SELECT id,username,email,role,active,created_at,last_login "
        f"FROM users {where} ORDER BY created_at DESC LIMIT ? OFFSET ?",
        params + [per_page, offset],
    ).fetchall()

    return jsonify({
        "users": [_user_dict(u) for u in users],
        "total": total, "page": page, "perPage": per_page,
    })


@app.route("/api/admin/users/<int:uid>", methods=["PUT"])
@require_admin
def admin_update_user(uid):
    if uid == session["user_id"]:
        return jsonify({"error": "Cannot modify your own account this way"}), 400
    data = request.get_json() or {}
    updates = {}
    if "role" in data and data["role"] in ("admin", "user"):
        updates["role"] = data["role"]
    if "active" in data:
        updates["active"] = 1 if data["active"] else 0
    if not updates:
        return jsonify({"error": "Nothing to update"}), 400
    db = get_db()
    set_clause = ", ".join(f"{k}=?" for k in updates)
    db.execute(f"UPDATE users SET {set_clause} WHERE id=?", list(updates.values()) + [uid])
    db.commit()
    return jsonify({"success": True})


@app.route("/api/admin/users/<int:uid>", methods=["DELETE"])
@require_admin
def admin_delete_user(uid):
    if uid == session["user_id"]:
        return jsonify({"error": "Cannot delete your own account"}), 400
    db = get_db()
    db.execute("DELETE FROM users WHERE id=?", (uid,))
    db.commit()
    return jsonify({"success": True})


# ── Admin — invites ────────────────────────────────────────────────────────────
@app.route("/api/admin/invites")
@require_admin
def admin_invites():
    db = get_db()
    rows = db.execute("""
        SELECT i.id, i.token, i.note, i.created_at, i.used_at, i.expires_at,
               u1.username AS created_by_name,
               u2.username AS used_by_name
        FROM invites i
        LEFT JOIN users u1 ON i.created_by = u1.id
        LEFT JOIN users u2 ON i.used_by    = u2.id
        ORDER BY i.created_at DESC
        LIMIT 200
    """).fetchall()
    return jsonify({"invites": [dict(r) for r in rows]})


@app.route("/api/admin/invites", methods=["POST"])
@require_admin
def admin_create_invite():
    data        = request.get_json() or {}
    note        = data.get("note", "").strip()[:256] or None
    expires_days = data.get("expiresDays")
    expires_at  = None
    if expires_days:
        exp = datetime.now(timezone.utc) + timedelta(days=int(expires_days))
        expires_at = exp.strftime("%Y-%m-%d %H:%M:%S")

    token = secrets.token_urlsafe(24)
    db    = get_db()
    db.execute(
        "INSERT INTO invites (token, note, created_by, expires_at) VALUES (?,?,?,?)",
        (token, note, session["user_id"], expires_at),
    )
    db.commit()

    base_url   = request.host_url.rstrip("/")
    invite_url = f"{base_url}/register?token={token}"
    return jsonify({"success": True, "token": token, "inviteUrl": invite_url})


@app.route("/api/admin/invites/<int:iid>", methods=["DELETE"])
@require_admin
def admin_delete_invite(iid):
    db = get_db()
    db.execute("DELETE FROM invites WHERE id=? AND used_by IS NULL", (iid,))
    db.commit()
    return jsonify({"success": True})


# ── Admin — inventory ──────────────────────────────────────────────────────────
@app.route("/api/admin/inventory")
@require_admin
def admin_inventory():
    if not COMIC_DIR or not Path(COMIC_DIR).is_dir():
        return jsonify({"comics": [], "total": 0, "error": "COMIC_DIR not configured"})

    search   = request.args.get("search", "").strip().lower()
    page     = max(1, int(request.args.get("page", 1)))
    per_page = 50
    base     = Path(COMIC_DIR).resolve()

    all_comics = []
    for p in sorted(base.rglob("*"), key=lambda x: x.name.lower()):
        if p.suffix.lower() not in (".cbr", ".cbz"):
            continue
        rel = str(p.relative_to(base))
        if search and search not in p.name.lower() and search not in rel.lower():
            continue
        parent_rel = str(p.parent.relative_to(base)) if p.parent != base else ""
        all_comics.append({
            "name": p.stem, "filename": p.name, "path": rel,
            "ext": p.suffix.lower(),
            "size": p.stat().st_size,
            "parent": parent_rel,
        })

    total      = len(all_comics)
    start      = (page - 1) * per_page
    page_items = all_comics[start : start + per_page]

    return jsonify({
        "comics": page_items, "total": total,
        "page": page, "perPage": per_page,
    })


# ── Comics routes ──────────────────────────────────────────────────────────────
@app.route("/api/comics/browse")
@require_auth
def browse():
    if not COMIC_DIR:
        return jsonify({"error": "COMIC_DIR is not configured on the server"}), 503

    dir_param = request.args.get("dir", "")
    full_path = safe_path(dir_param)

    if full_path is None:
        return jsonify({"error": "Forbidden"}), 403
    if not full_path.is_dir():
        return jsonify({"error": "Directory not found"}), 404

    dirs, comics = [], []
    hidden = {"DS_Store", "thumbs", "restricted"}

    try:
        for item in sorted(full_path.iterdir(), key=lambda x: x.name.lower()):
            if item.name.startswith(".") or item.name in hidden:
                continue
            display = item.stem.replace("_", " ").replace("-", " ")
            if item.is_dir():
                path = f"{dir_param}--and--{item.name}" if dir_param else item.name
                dirs.append({"name": item.name, "display": display, "path": path})
            elif item.suffix.lower() in (".cbr", ".cbz"):
                rel = str(item.resolve().relative_to(Path(COMIC_DIR).resolve()))
                comics.append({
                    "name": item.stem, "display": display,
                    "filename": item.name, "path": rel,
                    "ext": item.suffix.lower(),
                })
    except PermissionError:
        return jsonify({"error": "Permission denied"}), 403

    crumbs = []
    if dir_param:
        parts = dir_param.split("--and--")
        for i, part in enumerate(parts):
            crumbs.append({
                "name": part.replace("_", " ").replace("-", " "),
                "path": "--and--".join(parts[: i + 1]),
            })

    return jsonify({
        "dirs": dirs, "comics": comics,
        "current": dir_param, "breadcrumbs": crumbs,
        "totalComics": count_comics(),
    })


@app.route("/api/comics/open", methods=["POST"])
@require_auth
def open_comic():
    if not COMIC_DIR:
        return jsonify({"error": "COMIC_DIR is not configured"}), 503

    data       = request.get_json() or {}
    comic_path = data.get("path", "")
    full_path  = safe_path(comic_path)

    if full_path is None:
        return jsonify({"error": "Forbidden"}), 403
    if not full_path.is_file():
        return jsonify({"error": "Comic not found"}), 404

    session_id  = str(int(time.time() * 1000))
    session_dir = SESSIONS_DIR / session_id
    session_dir.mkdir(parents=True, exist_ok=True)

    try:
        dest      = session_dir / full_path.name
        shutil.copy2(full_path, dest)
        base_name = dest.stem.replace(" ", "_")
        shutil.copy2(dest, session_dir / f"{base_name}.zip")
        shutil.copy2(dest, session_dir / f"{base_name}.rar")

        subprocess.run(
            ["bash", str(BASE_DIR / "process.sh"), session_id],
            capture_output=True, timeout=120, cwd=str(BASE_DIR),
        )

        ts = time.strftime("%Y-%m-%d %H:%M:%S")
        with open(ACCESS_LOG, "a") as f:
            f.write(f"{ts} | {session.get('username', 'anon')} | "
                    f"{request.remote_addr} | {comic_path}\n")

        db = get_db()
        db.execute(
            "INSERT INTO reading_history (user_id, comic_path, session_id) VALUES (?,?,?)",
            (session["user_id"], comic_path, session_id),
        )
        db.commit()

        return jsonify({"success": True, "sessionId": session_id})

    except subprocess.TimeoutExpired:
        shutil.rmtree(session_dir, ignore_errors=True)
        return jsonify({"error": "Extraction timed out"}), 500
    except Exception as e:
        shutil.rmtree(session_dir, ignore_errors=True)
        return jsonify({"error": str(e)}), 500


@app.route("/api/comics/pages")
@require_auth
def comic_pages():
    sid = request.args.get("sessionId", "")
    if not sid or not sid.isdigit():
        return jsonify({"error": "Invalid session ID"}), 400
    session_dir = SESSIONS_DIR / sid
    if not session_dir.exists():
        return jsonify({"error": "Session not found"}), 404
    image_exts = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"}
    pages = sorted(
        f"/static/sessions/{sid}/{p.relative_to(session_dir)}"
        for p in session_dir.rglob("*")
        if p.is_file() and p.suffix.lower() in image_exts
    )
    return jsonify({"pages": pages, "total": len(pages)})


@app.route("/api/comics/history")
@require_auth
def reading_history():
    db = get_db()
    rows = db.execute(
        "SELECT comic_path, session_id, last_page, total_pages, started_at, last_read_at "
        "FROM reading_history WHERE user_id=? ORDER BY last_read_at DESC LIMIT 20",
        (session["user_id"],),
    ).fetchall()
    return jsonify({"history": [dict(r) for r in rows]})


# ── Feedback ───────────────────────────────────────────────────────────────────
@app.route("/api/request", methods=["POST"])
@require_auth
def request_comic():
    data  = request.get_json() or {}
    comic = data.get("comic", "").strip()[:500]
    ts    = time.strftime("%Y-%m-%d %H:%M:%S")
    with open(REQUEST_LOG, "a") as f:
        f.write(f"{ts} | {session.get('username', 'anon')} | {comic}\n")
    return jsonify({"success": True})


@app.route("/api/issue", methods=["POST"])
@require_auth
def report_issue():
    data = request.get_json() or {}
    desc = data.get("description", "").strip()[:1000]
    ts   = time.strftime("%Y-%m-%d %H:%M:%S")
    with open(ISSUE_LOG, "a") as f:
        f.write(f"{ts} | {session.get('username', 'anon')} | {desc}\n")
    return jsonify({"success": True})


# ── Serve React SPA ────────────────────────────────────────────────────────────
@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_react(path):
    if path.startswith("static/"):
        return app.send_static_file(path[len("static/"):])
    file_candidate = REACT_BUILD / path
    if path and file_candidate.exists() and file_candidate.is_file():
        return send_from_directory(str(REACT_BUILD), path)
    index = REACT_BUILD / "index.html"
    if index.exists():
        return send_from_directory(str(REACT_BUILD), "index.html")
    return (
        "<pre>Frontend not built.\nRun:  cd frontend && npm install && npm run build</pre>",
        404,
    )


# ── Error handlers ─────────────────────────────────────────────────────────────
@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Not found"}), 404


@app.errorhandler(500)
def server_error(e):
    return jsonify({"error": "Internal server error"}), 500


# ── Entry point ────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    init_db()
    SESSIONS_DIR.mkdir(parents=True, exist_ok=True)
    port  = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("DEBUG", "false").lower() == "true"
    print(f"  ComicBookServer v3.0  →  http://localhost:{port}")
    if not COMIC_DIR:
        print("  ⚠  COMIC_DIR is not set. Set the COMIC_DIR environment variable.")
    app.run(host="0.0.0.0", port=port, debug=debug)
