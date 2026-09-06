#!/usr/bin/env bash
set -euo pipefail

TOKEN="${GH_TOKEN:-}"
if [ -z "$TOKEN" ]; then
  echo "GH_TOKEN not set" >&2
  exit 2
fi

cd /home/daytona/codebase

echo "=== STEP 1: push updated tree (with correct paths) ==="
GH_TOKEN="$TOKEN" python3 scripts/github-push.py 2>&1 | tail -20

echo ""
echo "=== STEP 2: verify tree contains .github/workflows/ ==="
TREE_SHA=$(curl -sS "https://api.github.com/repos/alpha-1-design/archplan-ai/git/refs/heads/main" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
| python3 -c "import sys,json; print(json.load(sys.stdin)[0]['object']['sha'])")
echo "Current main tree SHA: $TREE_SHA"

curl -sS "https://api.github.com/repos/alpha-1-design/archplan-ai/git/trees/$TREE_SHA?recursive=1" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
| python3 -c "import sys,json; [print('-', t['path']) for t in json.load(sys.stdin).get('tree',[]) if '.github' in t['path'] or 'github-push' in t['path']]"

echo ""
echo "=== STEP 3: re-run APK workflow ==="
WORKFLOW_ID="351089986"
curl -sS -X POST \
  "https://api.github.com/repos/alpha-1-design/archplan-ai/actions/workflows/$WORKFLOW_ID/dispatches" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  -H "Content-Type: application/json" \
  -d '{"ref":"refs/heads/main"}' \
| python3 -c "import sys,json; print(json.dumps(json.load(sys.stdin), indent=2))"

echo ""
echo "DONE"
