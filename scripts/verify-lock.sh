#!/usr/bin/env bash
set -euo pipefail
cd /home/daytona/codebase

echo "=== package.json deps ==="
python3 -c "
import json
d=json.load(open('package.json'))
deps={**d.get('dependencies',{}), **d.get('devDependencies',{})}
print('total declared:', len(deps))
for k in sorted(deps):
    print(f'  {k}: {deps[k]}')
"

echo ""
echo "=== package-lock.json: do all deps exist? ==="
python3 -c "
import json
declared=json.load(open('package.json'))
lock=json.load(open('package-lock.json'))
lock_pkgs=lock.get('packages',{})
declared_deps={**declared.get('dependencies',{}), **declared.get('devDependencies',{})}
missing=[]
for k in declared_deps:
    if k not in lock_pkgs and ('node_modules/'+k) not in lock_pkgs:
        missing.append(k)
print('missing from lock:', missing if missing else 'NONE — lockfile is in sync')
print('lockfile total packages:', len(lock_pkgs))
"

echo ""
echo "=== git status of lockfile ==="
git status --short package-lock.json
