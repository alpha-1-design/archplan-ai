#!/usr/bin/env python3
"""
Push the full ARCHPLAN AI tree to alpha-1-design/archplan-ai on GitHub
using the Git Data API (blobs -> tree -> commit -> update ref).
Requires GH_TOKEN env with repo admin scope.
"""
import base64, hashlib, hmac, io, json, os, stat, sys, time, zlib
import urllib.request, urllib.error

TOKEN = os.environ.get("GH_TOKEN", "")
if not TOKEN:
    print("GH_TOKEN not set"); sys.exit(2)

API = "https://api.github.com"
OWNER = "alpha-1-design"
REPO = "archplan-ai"
BRANCH = "main"

HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
}

def http(method, path, body=None, retries=8):
    url = f"{API}/{path}"
    last = None
    for attempt in range(retries):
        req = urllib.request.Request(url, method=method, headers=HEADERS)
        if body is not None:
            req.data = json.dumps(body).encode("utf-8")
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                raw = resp.read()
                return resp.status, raw
        except urllib.error.HTTPError as e:
            last = (e.code, e.read())
            txt = last[1].decode("utf-8", "replace")
            if e.code in (403, 422, 409) and attempt < retries - 1:
                time.sleep(2 ** attempt); continue
            if e.code == 403 and "rate limit" in txt.lower() and attempt < retries - 1:
                time.sleep(2 ** attempt); continue
            print(f"[WARN] HTTP {e.code} {method} {path}: {txt[:200]}", file=sys.stderr)
            if attempt < retries - 1:
                time.sleep(2 ** attempt)
                continue
            return e.code, last[1]
        except Exception as e:
            last = (-1, str(e).encode())
            if attempt < retries - 1:
                time.sleep(2 ** attempt)
                continue
            return -1, last[1]
    raise RuntimeError(f"http failed for {method} {path}: {last}")

def api(method, path, body=None):
    code, raw = http(method, path, body)
    if code < 200 or code >= 300:
        raise RuntimeError(f"API {code} {path}: {raw.decode('utf-8','replace')[:500]}")
    try:
        return json.loads(raw)
    except Exception:
        return raw.decode("utf-8", "replace")

def blob(path):
    with open(path, "rb") as f:
        data = f.read()
    b64 = base64.b64encode(data).decode("ascii")
    j = api("POST", f"repos/{OWNER}/{REPO}/git/blobs", {
        "content": b64, "encoding": "base64"
    })
    return j["sha"]

GITHUB_FILE_MODE = "100644"

def file_mode(path):
    return GITHUB_FILE_MODE

SKIP_DIRS = {".git", "dist", "android", "node_modules", ".cache", ".vscode", ".idea"}

def tree_entries():
    entries = []
    for root, dirs, files in os.walk("."):
        dirs[:] = sorted([d for d in dirs if d not in SKIP_DIRS])
        for fn in sorted(files):
            full = os.path.join(root, fn)
            rel = os.path.relpath(full, ".").replace("\\", "/")
            if rel.startswith("."):
                continue
            entries.append((rel, blob(full)))
    entries.sort(key=lambda x: x[0])
    tree = []
    for path, sha in entries:
        parts = path.split("/")
        tree.append({
            "path": path,
            "mode": file_mode(path),
            "type": "blob",
            "sha": sha,
        })
    return tree

def build_git_tree(entries):
    body = {"tree": entries, "base_tree": None}
    j = api("POST", f"repos/{OWNER}/{REPO}/git/trees", body)
    if isinstance(j, dict) and "sha" in j:
        return j["sha"]
    raise RuntimeError(f"Unexpected tree response: {j}")

def get_main_sha():
    j = api("GET", f"repos/{OWNER}/{REPO}/git/refs/heads/{BRANCH}")
    if isinstance(j, list):
        j = j[0]
    obj = j.get("object")
    if not obj:
        raise RuntimeError(f"Could not resolve main ref: {j}")
    return obj["sha"]

def commit(tree_sha, parent_sha, message, ts):
    body = {
        "message": message,
        "parents": [parent_sha],
        "tree": tree_sha,
        "author": {"name": "Samuel Mensah", "email": "alphariansamuel@gmail.com", "date": ts},
        "committer": {"name": "Samuel Mensah", "email": "alphariansamuel@gmail.com", "date": ts},
    }
    j = api("POST", f"repos/{OWNER}/{REPO}/git/commits", body)
    if isinstance(j, dict) and "sha" in j:
        return j["sha"]
    raise RuntimeError(f"Unexpected commit response: {j}")

def force_update_ref(ref_path, sha):
    j = api("PATCH", f"repos/{OWNER}/{REPO}/git/refs/heads/{BRANCH}", {
        "sha": sha, "force": True
    })
    return j

def verify():
    j = api("GET", f"repos/{OWNER}/{REPO}/git/refs/heads/{BRANCH}")
    if isinstance(j, list):
        j = j[0]
    obj = j.get("object")
    if not obj:
        raise RuntimeError(f"Could not verify main ref: {j}")
    return obj["sha"]

def main():
    print("Collecting blobs from disk...", flush=True)
    entries = tree_entries()
    print(f"Files to push: {len(entries)}", flush=True)
    print("Building git tree on GitHub...", flush=True)
    tree_sha = build_git_tree(entries)
    print("Tree SHA:", tree_sha, flush=True)
    parent = get_main_sha()
    print("Current remote main SHA:", parent, flush=True)
    ts = "2026-09-06T05:05:00Z"
    message = "ARCHPLAN AI: build complete with Jarvis orb, 2D/3D/test modes, voice, calc, APK pipeline"
    print("Creating commit...", flush=True)
    commit_sha = commit(tree_sha, parent, message, ts)
    print("Commit SHA:", commit_sha, flush=True)
    print("Force-updating ref main ->", commit_sha, flush=True)
    ref = force_update_ref(f"refs/heads/{BRANCH}", commit_sha)
    print("Ref update result:", json.dumps(ref), flush=True)
    verified = verify()
    print("Verified main SHA:", verified, flush=True)
    if verified != commit_sha:
        print("MISMATCH — push may not have landed.", flush=True)
        sys.exit(3)
    print("PUSH_OK", flush=True)

if __name__ == "__main__":
    main()
