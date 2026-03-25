#!/usr/bin/env python3
"""
ComicBookServer v2.0
A modern web-based comic book reader supporting CBR and CBZ formats.
"""

import os
import time
import shutil
import subprocess
from pathlib import Path
from functools import wraps

from flask import Flask, request, session, jsonify, send_from_directory
from flask_cors import CORS

# ── App setup ──────────────────────────────────────────────────────────────────
app = Flask(__name__, static_folder="static", static_url_path="/static")
app.secret_key = os.environ.get("SECRET_KEY", "change-me-in-production-please")

CORS(app, supports_credentials=True, origins=["http://localhost:3000"])

# ── Configuration ──────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).parent
COMIC_DIR = os.environ.get("COMIC_DIR", "")
SESSIONS_DIR = BASE_DIR / "static" / "sessions"
ACCESS_LOG = BASE_DIR / "access.log"
REQUEST_LOG = BASE_DIR / "static" / "request.txt"
ISSUE_LOG = BASE_DIR / "static" / "issue.txt"
BETA_KEYS_FILE = BASE_DIR / "betaKeys"
USE_AUTH = os.environ.get("USE_AUTH", "true").lower() == "true"
REACT_BUILD = BASE_DIR / "frontend" / "dist"


# ── Helpers ────────────────────────────────────────────────────────────────────
def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if USE_AUTH and session.get("status") != "LOGGEDIN":
            return jsonify({"error": "Unauthorized"}), 401
        return f(*args, **kwargs)
    return decorated


def safe_path(relative: str) -> Path | None:
    """Resolve a relative comic path and ensure it stays within COMIC_DIR."""
    if not COMIC_DIR:
        return None
    base = Path(COMIC_DIR).resolve()
    decoded = relative.replace("--and--", "/").replace("--h--", "#") if relative else ""
    full = (base / decoded).resolve() if decoded else base
    if not str(full).startswith(str(base)):
        return None
    return full


def count_comics() -> int:
    if not COMIC_DIR or not Path(COMIC_DIR).is_dir():
        return 0
    return sum(
        1 for p in Path(COMIC_DIR).rglob("*")
        if p.suffix.lower() in (".cbr", ".cbz")
    )


# ── Auth routes ────────────────────────────────────────────────────────────────
@app.route("/api/auth/status")
def auth_status():
    return jsonify({"authenticated": session.get("status") == "LOGGEDIN"})


@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    key = data.get("key", "").strip()

    if not USE_AUTH:
        session["status"] = "LOGGEDIN"
        return jsonify({"success": True})

    try:
        with open(BETA_KEYS_FILE) as f:
            valid_keys = {line.strip() for line in f if line.strip()}
    except FileNotFoundError:
        valid_keys = set()

    if key in valid_keys:
        session["status"] = "LOGGEDIN"
        session["ip"] = request.remote_addr
        return jsonify({"success": True})

    return jsonify({"success": False, "error": "Invalid beta key"}), 401


@app.route("/api/auth/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"success": True})


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
                base = Path(COMIC_DIR).resolve()
                rel = str(item.resolve().relative_to(base))
                comics.append({
                    "name": item.stem,
                    "display": display,
                    "filename": item.name,
                    "path": rel,
                    "ext": item.suffix.lower(),
                })
    except PermissionError:
        return jsonify({"error": "Permission denied"}), 403

    # Build breadcrumb from dir_param
    crumbs = []
    if dir_param:
        parts = dir_param.split("--and--")
        for i, part in enumerate(parts):
            crumbs.append({
                "name": part.replace("_", " ").replace("-", " "),
                "path": "--and--".join(parts[: i + 1]),
            })

    return jsonify({
        "dirs": dirs,
        "comics": comics,
        "current": dir_param,
        "breadcrumbs": crumbs,
        "totalComics": count_comics(),
    })


@app.route("/api/comics/open", methods=["POST"])
@require_auth
def open_comic():
    if not COMIC_DIR:
        return jsonify({"error": "COMIC_DIR is not configured"}), 503

    data = request.get_json() or {}
    comic_path = data.get("path", "")
    full_path = safe_path(comic_path)

    if full_path is None:
        return jsonify({"error": "Forbidden"}), 403
    if not full_path.is_file():
        return jsonify({"error": "Comic not found"}), 404

    session_id = str(int(time.time() * 1000))
    session_dir = SESSIONS_DIR / session_id
    session_dir.mkdir(parents=True, exist_ok=True)

    try:
        dest = session_dir / full_path.name
        shutil.copy2(full_path, dest)

        # CBR/CBZ both need .rar and .zip copies for extraction
        base_name = dest.stem.replace(" ", "_")
        zip_dest = session_dir / f"{base_name}.zip"
        rar_dest = session_dir / f"{base_name}.rar"
        shutil.copy2(dest, zip_dest)
        shutil.copy2(dest, rar_dest)

        subprocess.run(
            ["bash", str(BASE_DIR / "process.sh"), session_id],
            capture_output=True,
            timeout=120,
            cwd=str(BASE_DIR),
        )

        ts = time.strftime("%Y-%m-%d %H:%M:%S")
        with open(ACCESS_LOG, "a") as f:
            f.write(f"{ts} | {request.remote_addr} | {comic_path}\n")

        session["last_comic"] = full_path.name
        session["last_dir"] = str(Path(comic_path).parent) if "/" in comic_path else ""

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
    session_id = request.args.get("sessionId", "")

    if not session_id or not session_id.isdigit():
        return jsonify({"error": "Invalid session ID"}), 400

    session_dir = SESSIONS_DIR / session_id
    if not session_dir.exists():
        return jsonify({"error": "Session not found"}), 404

    image_exts = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"}
    pages = sorted(
        f"/static/sessions/{session_id}/{p.relative_to(session_dir)}"
        for p in session_dir.rglob("*")
        if p.is_file() and p.suffix.lower() in image_exts
    )

    return jsonify({"pages": pages, "total": len(pages)})


@app.route("/api/request", methods=["POST"])
@require_auth
def request_comic():
    data = request.get_json() or {}
    comic_name = data.get("comic", "").strip()[:500]
    ts = time.strftime("%Y-%m-%d %H:%M:%S")
    with open(REQUEST_LOG, "a") as f:
        f.write(f"{ts} | {request.remote_addr} | {comic_name}\n")
    return jsonify({"success": True})


@app.route("/api/issue", methods=["POST"])
@require_auth
def report_issue():
    data = request.get_json() or {}
    description = data.get("description", "").strip()[:1000]
    ts = time.strftime("%Y-%m-%d %H:%M:%S")
    with open(ISSUE_LOG, "a") as f:
        f.write(f"{ts} | {request.remote_addr} | {description}\n")
    return jsonify({"success": True})


# ── Serve React SPA ────────────────────────────────────────────────────────────
@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_react(path):
    # Let Flask's built-in static handler deal with /static/ paths
    if path.startswith("static/"):
        return app.send_static_file(path[len("static/"):])

    # Serve React build assets (e.g. /assets/index-abc123.js)
    file_candidate = REACT_BUILD / path
    if path and file_candidate.exists() and file_candidate.is_file():
        return send_from_directory(str(REACT_BUILD), path)

    # Fallback: serve index.html for client-side routing
    index = REACT_BUILD / "index.html"
    if index.exists():
        return send_from_directory(str(REACT_BUILD), "index.html")

    return (
        "<pre>Frontend not built.\nRun:  cd frontend && npm install && npm run build</pre>",
        404,
    )


# ── Entry point ────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    SESSIONS_DIR.mkdir(parents=True, exist_ok=True)
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("DEBUG", "false").lower() == "true"
    print(f"  ComicBookServer v2.0  →  http://localhost:{port}")
    if not COMIC_DIR:
        print("  ⚠  COMIC_DIR is not set. Set the COMIC_DIR environment variable.")
    app.run(host="0.0.0.0", port=port, debug=debug)
