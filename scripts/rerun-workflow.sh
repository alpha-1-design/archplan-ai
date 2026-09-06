#!/usr/bin/env bash
set -euo pipefail

TOKEN="${GH_TOKEN:-}"
if [ -z "$TOKEN" ]; then
  echo "GH_TOKEN not set" >&2
  exit 2
fi

OWNER="alpha-1-design"
REPO="archplan-ai"

echo "=== Workflow registry ==="
curl -sS "https://api.github.com/repos/$OWNER/$REPO/actions/workflows" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  -H "Content-Type: application/json" \
| python3 -c "import sys,json; ws=json.load(sys.stdin); print('count:', len(ws)); [print('-', (w if isinstance(w,str) else w.get('name')), (w if isinstance(w,str) else w.get('state')), (w if isinstance(w,str) else w.get('path'))) for w in ws]"

echo ""
echo "=== Dispatch attempt ==="
curl -sS -X POST \
  "https://api.github.com/repos/$OWNER/$REPO/actions/workflows/351089986/dispatches" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  -H "Content-Type: application/json" \
  -d '{"ref":"refs/heads/main"}' \
| python3 -c "import sys,json; d=json.load(sys.stdin); print(json.dumps(d, indent=2))"

echo ""
echo "DONE"
