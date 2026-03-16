#!/bin/bash
echo "=== CONDUIKT SESSION INIT ==="
echo ""

for f in SYSTEM_ARCHITECTURE_v2.md ARCHITECTURE_ADDENDUM_v2.1.md CLAUDE_CODE_PHASE3_PROMPT.md PROGRESS_REPORT.md; do
  if [ ! -f "$f" ]; then
    echo "MISSING: $f — stop and tell the user before proceeding"
    exit 1
  else
    echo "Found: $f"
  fi
done

echo ""
echo "=== WHAT IS COMPLETE ==="
grep -E "^(###|- \[)" PROGRESS_REPORT.md | head -40
echo ""
echo "=== READY TO BUILD ==="
