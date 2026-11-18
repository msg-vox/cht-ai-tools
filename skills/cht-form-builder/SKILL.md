---
name: cht-form-builder
description: Generate CHT application forms from Excel designs or conversational input, with a local deployment UI. Parses design documents, infers smart calculate fields, auto-translates, and validates against the project context.
---

# CHT Form Builder Plugin

Generate CHT (Community Health Toolkit) XLSForm application forms from:
- **Excel design documents** — French/English design sheets with questions, types, conditions
- **Conversational input** — describe the form you need and answer follow-up questions

## Features

- **Project-aware**: reads contact-summary, tasks, existing forms to avoid conflicts and reuse patterns
- **Smart calculates**: infers intermediate calculate fields from design structure (group aggregation, condition deduplication, derived classification)
- **Auto-translate**: detects project languages and translates all labels
- **Validation hook**: catches structural, CHT-specific, and cross-project errors on write
- **Deployment UI**: localhost web page for deploying with cht-conf — credentials never touch the AI

## Commands

- `/create-form [design.xlsx] [sheet-name]` — create or update a form from a design document or conversational flow
- `/create-form --compare design.xlsx form.xlsx` — compare a design to an existing form
- `/deploy` — launch the local deployment UI

## Requirements

- Must be run from a CHT config project directory (has `app_settings.json` and `forms/`)
- Python 3.10+ (dependencies auto-managed by `uv run`)
- Node.js 18+ (for deployment server)
- `cht-conf` installed globally (`npm install -g cht-conf`)

## Codex workflow

Invoke `$cht-form-builder` and describe whether to create, update, compare, or deploy a form.
Resolve scripts and references from the directory containing this skill's `SKILL.md`.
In the bundled instructions, substitute that directory for `${CLAUDE_PLUGIN_ROOT}`.
Follow the relevant workflow steps directly, using the documents in `agents/` as instructions
and asking the user in the conversation when a step requires their input or approval.

1. Check the CHT project prerequisites. For a deployment request, follow
   [the deployment instructions](commands/deploy.md) from the CHT project directory.
2. Read [the project analyzer instructions](agents/project-analyzer.md) and run the bundled
   analyzer to collect languages, forms, and project conventions.
3. For a design workbook, follow [the design parser instructions](agents/design-parser.md).
   Ask the user which sheet to use when needed. For a conversational design, gather the form ID,
   title, sections, field types, choices, and conditions. For a comparison, parse the source
   design and use `uv run` with `scripts/parse-xlsform.py` to read the existing workbook,
   then report differences in fields, conditions, and choices.
4. Follow [the form generator instructions](agents/form-generator.md) and review translations
   using [the translator instructions](agents/translator.md). Present proposed language changes
   for approval before applying them.
5. Validate generated or modified workbooks using [the XLSForm checklist](hooks/validate-xlsform.md).
