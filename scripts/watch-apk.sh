#!/usr/bin/env bash
set -euo pipefail
TOKEN="${GH_TOKEN:-}"
[ -z "$TOKEN" ] && { echo "GH_TOKEN not set" >&2; exit 2; }
API="https://api.github.com/repos/alpha-1-design/archplan-ai"
HDR=(
  -H "Authorization: Bearer $TOKEN"
  -H "Accept: application/vnd.github+json"
  -H "X-GitHub-Api-Version: 2022-11-28"
)

SHA=$(curl -sS "${API}/git/refs/heads/main" "${HDR[@]}" \
| python3 -c "import sys,json; print(json.load(sys.stdin)[0]['object']['sha'])")
echo "[$(date +%H:%M:%S)] HEAD: $SHA"

for attempt in $(seq 1 120); do
  RES=$(curl -sS "${API}/actions/runs?per_page=10&head_sha=${SHA}" "${HDR[@]}")
  # fetch runs via python to avoid jq-shape fragility
  python3 - <<PY
import sys,json
try:
    d=json.loads('''$RES''')
except Exception:
    d={"workflow_runs":[]}
runs=d.get("workflow_runs",[])
print("total on HEAD:", len(runs))
for r in runs:
    print(f"  RUN#:{r.get('run_number')} | {r.get('status')}/{r.get('conclusion')} | event={r.get('event')} | updated={r.get('updated_at')}")
success=[str(r.get("id")) for r in runs if r.get("conclusion")=="success"]
if success:
    print("SUCCESS_ID:"+success[0])
PY
  SUCCESS_ID=$(python3 -c "import sys,json; d=json.loads('''$RES'''); print(next((str(r.get('id')) for r in d.get('workflow_runs',[]) if r.get('conclusion')=='success'), ''))" 2>/dev/null || true)
  if [ -n "$SUCCESS_ID" ]; then
    echo ""
    echo "========================================="
    echo "APK SUCCESS: run $SUCCESS_ID"
    echo "========================================="
    echo ""
    echo "=== artifacts ==="
    curl -sS "${API}/actions/runs/${SUCCESS_ID}/artifacts" "${HDR[@]}" \
    | python3 -c "
import sys,json
d=json.loads(sys.stdin.read())
print('total_artifacts:', d.get('total_count'))
for a in d.get('artifacts',[]):
    print(' -', a.get('name'), '| id:', a.get('id'), '| size:', a.get('size_in_bytes'), '| expired:', a.get('expired'))
"
    exit 0
  fi
  sleep 15
done
echo "TIMEOUT"
exit 1
