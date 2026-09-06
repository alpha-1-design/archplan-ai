#!/usr/bin/env bash
set -euo pipefail
TOKEN="${GH_TOKEN:-}"
[ -z "$TOKEN" ] && { echo "GH_TOKEN not set" >&2; exit 2; }

API="https://api.github.com"
OWNER="alpha-1-design"
REPO="archplan-ai"
HDR=(
  -H "Authorization: Bearer $TOKEN"
  -H "Accept: application/vnd.github+json"
  -H "X-GitHub-Api-Version: 2022-11-28"
)
CURL=(curl -sS "${API}/repos/${OWNER}/${REPO}")

echo "=== main ref ==="
REF=$("${CURL[@]}/git/refs/heads/main" "${HDR[@]}")
echo "$REF" | python3 -c "
import sys,json
d=json.load(sys.stdin)
if isinstance(d, list):
    print('main:', d[0]['object']['sha'])
else:
    print('main:', d.get('object',{}).get('sha'))
"

echo ""
echo "=== workflow files in tree ==="
TREE_SHA=$(echo "$REF" | python3 -c "
import sys,json
d=json.load(sys.stdin)
if isinstance(d, list):
    print(d[0]['object']['sha'])
else:
    print(d.get('object',{}).get('sha'))
")
echo "Tree SHA: $TREE_SHA"
TREE=$(curl -sS "${API}/repos/${OWNER}/${REPO}/git/trees/${TREE_SHA}?recursive=1" "${HDR[@]}")
echo "$TREE" | python3 -c "
import sys,json
d=json.load(sys.stdin)
for t in d.get('tree', []):
    p=t.get('path','')
    if '.github' in p or 'github-push' in p or 'github-probe' in p:
        print('-', p)
"

echo ""
echo "=== workflow registry ==="
curl -sS "${API}/repos/${OWNER}/${REPO}/actions/workflows" "${HDR[@]}" \
| python3 -c "
import sys,json
d=json.load(sys.stdin)
print('total_count:', d.get('total_count'))
for w in d.get('workflows', []):
    print(' -', w.get('name'), '|', w.get('state'), '| id:', w.get('id'))
"

echo ""
echo "=== last 5 runs ==="
curl -sS "${API}/repos/${OWNER}/${REPO}/actions/runs?per_page=5" "${HDR[@]}" \
| python3 -c "
import sys,json
d=json.load(sys.stdin)
for r in d.get('workflow_runs', [])[:5]:
    print(f\"  - {r.get('name')} | {r.get('status')}/{r.get('conclusion')} | run#{r.get('run_number')} | {r.get('created_at')} | sha:{r.get('head_sha', '')[:8]}\")
"

echo ""
echo "=== dispatch attempt ==="
curl -sS -X POST "${API}/repos/${OWNER}/${REPO}/actions/workflows/351089986/dispatches" \
  "${HDR[@]}" \
  -H "Content-Type: application/json" \
  -d '{"ref":"refs/heads/main"}' \
| python3 -c "
import sys,json
d=json.load(sys.stdin)
print('dispatch result:')
print(json.dumps(d, indent=2))
"

echo ""
echo "DONE"
