#!/bin/bash
FEATURE="${1:-unknown}"
STATUS="${2:-complete}"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

echo "[$TIMESTAMP] $FEATURE — $STATUS" >> .claude/checkpoint.log
echo ""
echo "Checkpoint saved: $FEATURE — $STATUS"
echo ""
echo "Now update PROGRESS_REPORT.md to reflect this."
