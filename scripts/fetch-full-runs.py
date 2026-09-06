#!/usr/bin/env python3
import os, json, urllib.request, urllib.error, sys

TOKEN = os.environ.get("GH_TOKEN","")
if not TOKEN:
    print("GH_TOKEN not set"); sys.exit(2)

API = "https://api.github.com"
OWNER="alpha-1-design"; REPO="archplan-ai"
HDR={"Authorization":f"Bearer {TOKEN}","Accept":"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28"}

def get(path, params=None):
    url=f"{API}/{path}"
    if params:
        sep = "&" if "?" in url else "?"
        url += sep + "&".join(f"{k}={v}" for k,v in params.items())
    req=urllib.request.Request(url, headers=HDR)
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read())

def all_runs(params=None):
    runs=[]
    page=1
    while True:
        p=dict(params or {})
        p["per_page"]=100
        p["page"]=page
        d=get("repos/{owner}/{repo}/actions/runs".format(owner=OWNER,repo=REPO), p)
        rs=d.get("workflow_runs",[])
        if not rs:
            break
        runs.extend(rs)
        if len(rs)<100:
            break
        page+=1
    return runs

runs=all_runs()
print("TOTAL RUNS:", len(runs))
for r in runs:
    print(f"  RUN#:{r.get('run_number')} | {r.get('name')} | {r.get('status')}/{r.get('conclusion')} | sha:{r.get('head_sha','')[:12]} | event={r.get('event')} | branch={r.get('head_branch','')} | created={r.get('created_at')} | updated={r.get('updated_at')}")
