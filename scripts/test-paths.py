#!/usr/bin/env python3
import os, sys
sys.path.insert(0, "scripts")

SKIP_DIRS = {".git", "dist", "android", "node_modules", ".cache", ".vscode", ".idea"}

def list_paths():
    entries = []
    for root, dirs, files in os.walk("."):
        dirs[:] = sorted([d for d in dirs if d not in SKIP_DIRS])
        for fn in sorted(files):
            full = os.path.join(root, fn)
            rel = os.path.relpath(full, ".").replace("\\", "/")
            if rel.startswith("/"):
                rel = rel.lstrip("/")
            if rel.startswith("."):
                if rel.startswith(".github") or rel.startswith(".gitignore") or rel.startswith(".oxlintrc"):
                    pass
                else:
                    continue
            entries.append(rel)
    entries.sort()
    return entries

paths = list_paths()
print("TOTAL:", len(paths))
print("--- .github and scripts/github ---")
for p in paths:
    if ".github" in p or "github-push" in p or "github-probe" in p:
        print(" -", p)
print("--- all scripts/ ---")
for p in paths:
    if p.startswith("scripts/"):
        print(" -", p)
print("--- dist/ or android/ or node_modules/ presence (should be empty): ---")
bad = [p for p in paths if any(p.startswith(d) for d in ("dist/","android/","node_modules/"))]
print("skipped-content leaks:", bad if bad else "NONE")
