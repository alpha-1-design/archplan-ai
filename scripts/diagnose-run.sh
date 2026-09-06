#!/usr/bin/env bash
set -euo pipefail
TOKEN="${GH_TOKEN:-}"
[ -z "$TOKEN" ] && { echo "GH_TOKEN not set" >&2; exit 2; }
OWNER="alpha-1-design"; REPO="archplan-ai"
HDR=(
  -H "Authorization: Bearer $TOKEN"
  -H "Accept: application/vnd.github+json"
  -H "X-GitHub-Api-Version: 2022-11-28"
)
API="https://api.github.com/repos/${OWNER}/${REPO}"
RUN_ID="${1:-2}"

echo "=== Run #$RUN_ID (full object) ==="
curl -sS "${API}/actions/runs/${RUN_ID}" "${HDR[@]}" \
| python3 -c "
import sys,json
try:
    d=json.load(sys.stdin)
except Exception as e:
    print('JSON parse error:', e); sys.exit(0)
for k in ['run_number','name','status','conclusion','head_sha','head_branch','event','created_at','updated_at','run_attempt','display_title']:
    print(f'  {k}: {d.get(k)}')
print('  jobs_url:', d.get('jobs_url'))
print('  logs_url:', d.get('logs_url'))
print('  artifacts_url:', d.get('artifacts_url'))
print('  check_suite_id:', d.get('check_suite_id'))
print('  check_suite_node_id:', d.get('check_suite_node_id'))
print('  run_attempt:', d.get('run_attempt'))
print('  actor:', d.get('actor',{}).get('login'))
"

echo ""
echo "=== Run #$RUN_ID jobs ==="
curl -sS "${API}/actions/runs/${RUN_ID}/jobs" "${HDR[@]}" \
| python3 -c "
import sys,json
try:
    d=json.load(sys.stdin)
except Exception as e:
    print('JSON parse error:', e); sys.exit(0)
print('total_jobs:', d.get('total_count'))
for j in d.get('jobs',[])[:30]:
    print(f\"  JOB id={j.get('id')} | {j.get('name')} | status={j.get('status')} conclusion={j.get('conclusion')}\")
    for s in j.get('steps',[])[:40]:
        concl=s.get('conclusion')
        marker=' <== FAIL' if concl=='failure' else ''
        print(f\"    - {s.get('name','?')} | status={s.get('status')} conclusion={concl}{marker}\")
"

if [ -f /tmp/diag_jobs_${RUN_ID}.json ]; then
  echo ""
  echo "=== cached jobs JSON (/tmp/diag_jobs_${RUN_ID}.json) sample ==="
  head -c 1000 /tmp/diag_jobs_${RUN_ID}.json
fi
