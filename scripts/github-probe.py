#!/usr/bin/env python3
import urllib.request, json, sys, os

TOKEN = os.environ.get("GH_TOKEN", "")
if not TOKEN:
    print("GH_TOKEN env not set"); sys.exit(2)

API = "https://api.github.com"
OWNER = "alpha-1-design"
REPO = "archplan-ai"

HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
}

def req(method, path, body=None):
    url = f"{API}/{path}"
    r = urllib.request.Request(url, method=method, headers=HEADERS)
    if body is not None:
        r.data = json.dumps(body).encode()
        r.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(r, timeout=60) as resp:
            txt = resp.read().decode("utf-8", "replace")
            return resp.status, txt
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace")
    except Exception as e:
        return -1, str(e)

print("=== WHOAMI ===")
code, body = req("GET", "user")
print("HTTP", code)
print(body[:1500])

print("\n=== REPO ===")
code, body = req("GET", f"repos/{OWNER}/{REPO}")
print("HTTP", code)
print(body[:1500])

print("\n=== REFS ===")
code, body = req("GET", f"repos/{OWNER}/{REPO}/git/refs/heads/main")
print("HTTP", code)
print(body[:1500])

print("\n=== PERMISSIONS ===")
code, body = req("GET", f"repos/{OWNER}/{REPO}/collaborators/{OWNER}/permission")
print("HTTP", code)
print(body[:1500])
