#!/usr/bin/env bash
set -euo pipefail
TOKEN="${GH_TOKEN:-}"
[ -z "$TOKEN" ] && { echo "GH_TOKEN not set" >&2; exit 2; }
cd /home/daytona/codebase

echo "[$(date +%H:%M:%S)] === staging files ==="
git add package-lock.json scripts/check-workflows.py scripts/diagnose-run.sh \
  scripts/fetch-full-runs.py scripts/github-probe.py scripts/github-push.py \
  scripts/push-fix.sh scripts/rerun-workflow.sh scripts/test-paths.py \
  scripts/verify-github.sh scripts/verify-lock.sh 2>/dev/null || true
echo "staged:"
git status --short

echo ""
echo "[$(date +%H:%M:%S)] === committing ==="
git commit -m "chore: sync package-lock.json + add GitHub push/monitor utilities"

echo ""
echo "[$(date +%H:%M:%S)] === pushing via GitHub Git Data API ==="
GH_TOKEN="$TOKEN" python3 scripts/github-push.py 2>&1 | tail -12

echo ""
echo "[$(date +%H:%M:%S)] === watching for successful run ==="
SHA=$(curl -sS "https://api.github.com/repos/alpha-1-design/archplan-ai/git/refs/heads/main" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
| python3 -c "import sys,json; print(json.load(sys.stdin)[0]['object']['sha'])")
echo "current main SHA: $SHA"

for attempt in $(seq 1 80); do
  RUNS=$(curl -sS "https://api.github.com/repos/alpha-1-design/archplan-ai/actions/runs?per_page=10&head_sha=${SHA}" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Accept: application/vnd.github+json" \
    -H "X-GitHub-Api-Version: 2022-11-28")
  echo "$RUNS" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print('  total on SHA:', d.get('total_count'))
for r in d.get('workflow_runs',[])[:10]:
    print(f\"    RUN#:{r.get('run_number')} | {r.get('status')}/{r.get('conclusion')} | event={r.get('event')} | created={r.get('created_at')} | updated={r.get('updated_at')}\")
"
  SUCCESS=$(echo "$RUNS" | python3 -c "
import sys,json
d=json.load(sys.stdin)
for r in d.get('workflow_runs',[]):
    if r.get('conclusion')=='success':
        print(r.get('id'))
        break
")
  if [ -n "$SUCCESS" ]; then
    echo ""
    echo "========================================="
    echo "APK SUCCESS: run $SUCCESS"
    echo "========================================="
    echo ""
    echo "=== artifacts ==="
    curl -sS "https://api.github.com/repos/alpha-1-design/archplan-ai/actions/runs/${SUCCESS}/artifacts" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Accept: application/vnd.github+json" \
      -H "X-GitHub-Api-Version: 2022-11-28" \
    | python3 -c "
import sys,json
d=json.load(sys.stdin)
print('total_artifacts:', d.get('total_count'))
for a in d.get('artifacts',[]):
    print(' -', a.get('name'), '| id:', a.get('id'), '| size:', a.get('size_in_bytes'), '| expired:', a.get('expired'))
"
    exit 0
  fi
  sleep 15
done
echo ""
echo "TIMEOUT: no successful run within ~20 minutes"
exit 1
