# @medic/cht-ai-tools

AI development tools for the [Community Health Toolkit](https://communityhealthtoolkit.org/) (CHT). Installs CHT-specific skills, MCP servers, commands, and hooks into [Claude Code](https://claude.ai/code), [OpenCode](https://opencode.ai), or [Codex](https://developers.openai.com/codex).

## Installation

### Claude Code

#### As a plugin (recommended)

Run the following slash commands inside Claude Code:

```
/plugin marketplace add medic/cht-ai-tools
/plugin install cht-specialist@medic-cht-ai-tools
/plugin install create-cht-task@medic-cht-ai-tools
/plugin install create-cht-target@medic-cht-ai-tools
/plugin install cht-form-builder@medic-cht-ai-tools
/plugin install cht-docs-mcp@medic-cht-ai-tools
/plugin install cht-dev-hooks@medic-cht-ai-tools
```

Restart Claude Code after installation.

#### Via CLI

```bash
npx @medic/cht-ai-tools install
```

### OpenCode

See [.opencode/INSTALL.md](.opencode/INSTALL.md) for full setup instructions (git clone + symlinks).

Or use the CLI:

```bash
npx @medic/cht-ai-tools install --target opencode
```

> **Note:** Hooks are not supported in OpenCode and will be skipped automatically.

### Codex

Run this from a CHT project directory to install for that project. Omit `--project` for a user-wide installation.

```bash
npx @medic/cht-ai-tools install --target codex --all --project
```

To try this checkout before release, run `npm ci && npm run build` in the tools repository,
then run `node /path/to/cht-ai-tools/dist/index.js install --target codex --all --project` from your CHT project.

Restart Codex, trust the project if prompted, and review the installed hooks with `/hooks`.
Invoke `$cht-specialist`, `$create-cht-task`, `$create-cht-target`, or `$cht-form-builder` in a prompt.
For form creation, comparison, or deployment, describe the action after `$cht-form-builder`.

## What It Installs

| Component | Claude Code | OpenCode | Codex |
|-----------|:-----------:|:--------:|:-----:|
| CHT skills | ✓ | ✓ | ✓ |
| CHT Docs MCP | ✓ | ✓ | ✓ |
| Command workflows | Slash commands | Slash commands | Skills |
| Validation and formatting hooks | ✓ | — | ✓ |

## CLI Usage

The CLI supports interactive prompts, non-interactive flags, and selective installation.

```bash
npx @medic/cht-ai-tools install                # Interactive mode (auto-detect target)
npx @medic/cht-ai-tools install --all          # Install everything
npx @medic/cht-ai-tools install --target opencode --all
npx @medic/cht-ai-tools install --skills --mcp --project
```

| Flag | Description |
|------|-------------|
| `--target <name>` | Target platform: `claude-code`, `opencode`, or `codex` (auto-detected if omitted) |
| `--skills` | Install CHT skills |
| `--mcp` | Install MCP servers |
| `--commands` | Install slash commands or their corresponding Codex skills |
| `--hooks` | Install validation/formatting hooks (Claude Code and Codex) |
| `--all`, `-y`, `--yes` | Install all components (non-interactive) |
| `--project` | Install to project directory instead of global config |

## Components

### CHT Specialist Skill

Expert guidance on CHT development, configuration, and troubleshooting:

- CHT architecture and data model
- App configuration (tasks, targets, contact summaries)
- XLSForm/ODK form development
- cht-conf CLI usage
- Deployment and hosting
- API integration

### Create CHT Task Skill

Interactive task creation with:

- Project detection
- Form integration
- Contact type awareness
- Best practices enforcement

### Create CHT Target Skill

KPI/indicator creation with:

- Counting mode guidance (instance vs contact)
- Aggregation setup
- Goal configuration
- Form field integration

### CHT Form Builder Skill

Generate CHT XLSForm application forms from Excel design documents or conversational input:

- **Design parsing** — reads French/English Excel design sheets with questions, types, and conditions
- **Project-aware** — analyzes existing forms, contact-summary, and tasks to avoid conflicts
- **Smart calculates** — infers intermediate calculate fields from design structure
- **Auto-translate** — detects project languages and translates all labels
- **Validation hook** — catches structural and CHT-specific errors on write
- **Deployment UI** — localhost web page for deploying with cht-conf (credentials never touch the AI)

Commands: `/create-form [design.xlsx] [sheet-name]`, `/deploy`

Requirements: Python 3.10+ (dependencies auto-managed by `uv run`), Node.js 18+ (deployment server), `cht-conf` installed globally

See [docs/cht-form-builder.md](docs/cht-form-builder.md) for the full guide (architecture, agent pipeline, validation, deployment).

### CHT Docs MCP Server

Direct access to CHT documentation through the Model Context Protocol:

```
https://mcp-docs.dev.medicmobile.org/mcp
```

### Slash Commands

Quick access to skills:

- `/cht-task` - Create or modify task definitions
- `/cht-target` - Create or modify target definitions
- `/cht-specialist` - Get expert CHT assistance
- `/create-form` - Generate a form from a design document or conversation
- `/deploy` - Launch the local deployment UI

### Hooks

Automatic validation and formatting of CHT configuration files (`tasks.js`, `targets.js`, `contact-summary.templated.js`, `purge.js`):

- **validate-cht** (PreToolUse → Bash) - Syntax-checks CHT config files before commands run
- **format-cht** (PostToolUse → Codex patches or Claude Code writes) - Auto-formats CHT config files via ESLint after writes

> **Note:** Hook installation merges into your existing Claude Code `settings.json` or Codex `hooks.json`. If you have custom hooks on the same event+matcher (e.g., other `PreToolUse → Bash` hooks), they will be preserved alongside the CHT hooks.

## Configuration Locations

### Codex

| Scope | Skills | MCP and hooks |
|-------|--------|---------------|
| User | `~/.agents/skills/` | `${CODEX_HOME:-$HOME/.codex}/config.toml` and `hooks.json` in the same directory |
| Project | `.agents/skills/` | `.codex/config.toml` and `.codex/hooks.json` |

The Codex hooks use Bash and `jq`. Formatting also uses the project's local ESLint.
Re-run the project hook installer if you move the checkout, since the hook commands
reference their installed scripts by absolute path.

### Claude Code

| Location | Path | Use Case |
|----------|------|----------|
| Global | `~/.claude/` | Available in all projects |
| Project | `./.claude/` | Specific to current project |

### OpenCode

| Location | Skills & Commands | MCP Config (`opencode.json`) |
|----------|-------------------|------------------------------|
| Global | `~/.config/opencode/` | `~/.config/opencode/opencode.json` |
| Project | `./.opencode/` | `./opencode.json` |

## Requirements

The plugin install method (`/plugin marketplace add` + `/plugin install`) requires only Claude Code — no Node.js needed.

The CLI install method (`npx`) requires:

- Node.js 18+
- Claude Code, OpenCode, or Codex

The OpenCode manual setup (git clone + symlinks) requires only Git.

---

## Architecture

```
cht-ai-tools/
├── .claude-plugin/           # Claude Code plugin manifest
│   ├── plugin.json
│   └── marketplace.json
├── .opencode/                # OpenCode install guide
│   └── INSTALL.md
├── src/
│   ├── index.ts              # CLI entry point
│   ├── cli/
│   │   ├── install.ts        # Main install command
│   │   ├── prompts.ts        # Clack interactive prompts
│   │   └── utils.ts          # File operation helpers
│   ├── targets/              # AI tool adapters (extensible)
│   │   ├── base.ts           # Target interface
│   │   ├── utils.ts          # Shared utilities (JSON config, path checks)
│   │   ├── claude-code.ts    # Claude Code implementation
│   │   ├── opencode.ts       # OpenCode implementation
│   │   ├── codex.ts          # Codex implementation
│   │   └── registry.ts       # Target auto-detection registry
│   ├── installers/           # Tool-agnostic installation logic
│   │   ├── skills.ts
│   │   ├── mcp.ts
│   │   ├── commands.ts
│   │   ├── hooks.ts
│   │   ├── common.ts         # Asset path resolution
│   │   └── index.ts
│   └── __tests__/
│       ├── claude-code.test.ts
│       ├── opencode.test.ts
│       └── registry.test.ts
├── skills/                   # Bundled skill assets (package root)
├── commands/                 # Bundled command assets
├── plugins/                  # MCP-only plugins
└── hooks/                    # Bundled hook assets
    └── scripts/
```

### Target Abstraction

The `Target` interface (`src/targets/base.ts`) allows supporting multiple AI tools:

```typescript
interface Target {
  name: string;
  detect(): Promise<boolean>;
  getConfigPath(location: 'global' | 'project'): string;
  installSkill(skill: Skill, location, options?): Promise<void>;
  configureMcp(server: McpServer, location): Promise<void>;
  installCommand(cmd: Command, location, options?): Promise<void>;
  configureHook(hook: Hook, location): Promise<void>;
}
```

Currently implemented targets:

| Target | Skills | MCP | Commands | Hooks |
|--------|:------:|:---:|:--------:|:-----:|
| Claude Code | ✓ | ✓ | ✓ | ✓ |
| OpenCode | ✓ | ✓ | ✓ | — |
| Codex | ✓ | ✓ | Skills | ✓ |

To add support for another AI tool (e.g., Cursor, Windsurf):

1. Create `src/targets/cursor.ts` implementing the `Target` interface
2. Add detection and installation logic specific to that tool
3. Register it in `src/targets/registry.ts`

---

## License

AGPL-3.0 - See [LICENSE](LICENSE) for details.

## About CHT

The [Community Health Toolkit](https://communityhealthtoolkit.org/) (CHT) is an open-source platform for building digital health applications for community health workers.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to add new skills, commands, MCP servers, and hooks.
