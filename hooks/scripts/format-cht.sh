#!/bin/bash
# CHT Format Hook - auto-formats CHT configuration files after writes
#
# This hook runs after the Write tool and lint-fixes the written file
# if it is a CHT config file and ESLint is available.

# Only run if we're in a CHT project
if [[ ! -f "package.json" ]] || ! grep -q "cht-conf" package.json 2>/dev/null; then
  exit 0
fi

if ! command -v npx &>/dev/null || [[ ! -f "node_modules/.bin/eslint" ]]; then
  exit 0
fi

INPUT=$(cat)
{
  jq -r '.tool_input.file_path // empty' <<< "$INPUT"
  if [[ "${1:-}" == "--codex" ]]; then
    # Codex patch calls carry file names in the patch header.
    jq -r '.tool_input.command // empty' <<< "$INPUT" |
      sed -nE 's/^\*\*\* (Add File|Update File|Move to): (.+)$/\2/p'
  fi
} 2>/dev/null | sort -u | while IFS= read -r FILE_PATH; do
  case "${FILE_PATH##*/}" in
    tasks.js|targets.js|contact-summary.templated.js|purge.js)
      if [[ -f "$FILE_PATH" ]]; then
        npx eslint --fix -- "$FILE_PATH" >/dev/null 2>&1
      fi
      ;;
  esac
done

exit 0
