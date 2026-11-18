#!/bin/bash
# CHT Validation Hook - validates CHT configuration files before operations
#
# This hook runs before Bash commands to validate CHT config syntax

# Only run validation if we're in a CHT project
if [[ ! -f "package.json" ]] || ! grep -q "cht-conf" package.json 2>/dev/null; then
  exit 0
fi

CHT_FILES=(tasks.js targets.js contact-summary.templated.js purge.js)

WARNINGS=()
for file in "${CHT_FILES[@]}"; do
  if [[ -f "$file" ]]; then
    if ! node --check "$file" 2>/dev/null; then
      WARNINGS+=("⚠️  Warning: $file has syntax errors")
    fi
  fi
done


if [[ ${#WARNINGS[@]} -gt 0 ]]; then
  if [[ "${1:-}" == "--codex" ]]; then
    printf '%s\n' "${WARNINGS[@]}" | jq -Rs '{systemMessage: rtrimstr("\n")}'
  else
    printf '%s\n' "${WARNINGS[@]}"
  fi
fi

exit 0
