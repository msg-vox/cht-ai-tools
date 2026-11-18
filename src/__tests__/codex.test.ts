import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { parse } from 'smol-toml';
import { CodexTarget } from '../targets/codex.js';

const target = new CodexTarget();
let project: string;
let configDir: string;

beforeEach(async () => {
  project = await fs.mkdtemp(path.join(tmpdir(), 'cht-codex-'));
  vi.spyOn(process, 'cwd').mockReturnValue(project);
  configDir = path.join(project, '.codex');
  await fs.mkdir(configDir);
});

afterEach(async () => {
  vi.restoreAllMocks();
  await fs.rm(project, { recursive: true, force: true });
});

describe('Codex configuration', () => {
  const server = { name: 'cht-docs', type: 'http', url: 'https://example.com/mcp' } as const;

  it('preserves Codex settings and adds a server only once', async () => {
    const configFile = path.join(configDir, 'config.toml');
    const original = '# Local settings\nmodel = "gpt-5"\n\n[mcp_servers.other]\ncommand = "other"\n';
    await fs.writeFile(configFile, original);
    await target.configureMcp(server, 'project');
    await target.configureMcp(server, 'project');
    const result = await fs.readFile(configFile, 'utf8');

    expect(result.startsWith(original)).toBe(true);
    expect(parse(result)).toEqual({
      model: 'gpt-5',
      mcp_servers: { other: { command: 'other' }, 'cht-docs': { url: server.url } },
    });
  });

  it('extends an existing inline server table', async () => {
    const configFile = path.join(configDir, 'config.toml');
    await fs.writeFile(configFile, 'mcp_servers = { other = { command = "other" } }\n');
    await target.configureMcp(server, 'project');
    expect(parse(await fs.readFile(configFile, 'utf8')).mcp_servers).toEqual({
      other: { command: 'other' },
      'cht-docs': { url: server.url },
    });
  });

  it('keeps existing hook handlers and avoids duplicate registration', async () => {
    const configFile = path.join(configDir, 'hooks.json');
    const existing = { type: 'command', command: 'echo existing' };
    await fs.writeFile(configFile, JSON.stringify({
      hooks: { PreToolUse: [{ matcher: 'Bash', hooks: [existing] }] },
    }));
    const sourcePath = path.join(project, 'validate-cht.sh');
    await fs.writeFile(sourcePath, '#!/bin/bash\n');
    const hook = { event: 'PreToolUse', matcher: 'Bash', scriptName: 'validate-cht.sh', sourcePath } as const;
    await target.configureHook(hook, 'project');
    await target.configureHook(hook, 'project');

    const result = JSON.parse(await fs.readFile(configFile, 'utf8'));
    expect(result.hooks.PreToolUse).toEqual([{
      matcher: 'Bash',
      hooks: [
        existing,
        { type: 'command', command: `bash '${configDir}/hooks/validate-cht.sh' --codex` },
      ],
    }]);
  });
});
