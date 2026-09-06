#!/usr/bin/env python3
import os, json, urllib.request, urllib.error

TOKEN = os.environ.get("GH_TOKEN","")
if not TOKEN:
    print("GH_TOKEN not set"); raise SystemExit(2)

API = "https://api.github.com"
OWNER="alpha-1-design"; REPO="archplan-ai"
HDR={"Authorization":f"Bearer {TOKEN}","Accept":"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28"}

def get(path):
    req=urllib.request.Request(f"{API}/{path}", headers=HDR)
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read())

print("=== workflows listing ===")
ws = get(f"repos/{OWNER}/{REPO}/actions/workflows")
print(json.dumps(ws, indent=2))

print("\n=== commit refs ===")
print(json.dumps(get(f"repos/{OWNER}/{REPO}/git/refs/heads/main"), indent=2))

print("\n=== commit 327e1025a3c00ef017a6dbbf8f6557f2d56420be ===")
print(json.dumps(get(f"repos/{OWNER}/{REPO}/git/commits/327e1025a3c00ef017a6dbbf8f6557f2d56420be"), indent=2))

print("\n=== tree 8a599f9e71fe27a8daa6258d08ba05f4654e4123 (recursive) ===")
tree = get(f"repos/{OWNER}/{REPO}/git/trees/8a599f9e71fe27a8daa6258d08ba05f4654e4123?recursive=1")
for t in tree.get("tree", []):
    print(" -", t.get("path"),"|", t.get("type"),"|", t.get("mode"))
