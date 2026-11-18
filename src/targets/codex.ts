import { execFile } from 'node:child_process';
import * as fs from 'node:fs/promises';
import { homedir } from 'node:os';
import * as path from 'node:path';
import { promisify } from 'node:util';
import { parse, stringify } from 'smol-toml';
import type { Command, Hook, InstallOptions, McpServer, Skill, Target } from './base.js';
import { isNodeError, pathExists, readJsonConfig } from './utils.js';

type Location = 'global' | 'project';

interface HookGroup {
  matcher?: string;
  hooks: Array<{ type: string; command?: string }>;
}

interface HookConfig {
  hooks?: Partial<Record<Hook['event'], HookGroup[]>>;
}

export class CodexTarget implements Target {
  readonly name = 'codex';

  async detect(): Promise<boolean> {
    try {
      if ((await fs.stat(this.getConfigPath('global'))).isDirectory()) return true;
    } catch {}

    try {
      await promisify(execFile)('codex', ['--version']);
      return true;
    } catch {
      return false;
    }
  }

  getConfigPath(location: Location): string {
    return location === 'project'
      ? path.join(process.cwd(), '.codex')
      : path.resolve(process.env.CODEX_HOME || path.join(homedir(), '.codex'));
  }

  async installSkill(skill: Skill, location: Location, options: InstallOptions = {}): Promise<void> {
    const root = location === 'global' ? homedir() : process.cwd();
    const skillsDir = path.join(root, '.agents', 'skills');
    const targetDir = path.join(skillsDir, skill.name);

    if (await pathExists(targetDir)) {
      if (!options.overwrite) {
        throw new Error(`Skill '${skill.name}' already exists at ${targetDir}. Use overwrite option to replace.`);
      }
      await fs.rm(targetDir, { recursive: true, force: true });
    }

    await fs.mkdir(skillsDir, { recursive: true });
    await fs.cp(skill.sourcePath, targetDir, { recursive: true });
  }

  async installCommand(cmd: Command, location: Location, options?: InstallOptions): Promise<void> {
    // Codex invokes the underlying skills directly with $skill-name.
    const skillNames: Record<string, string> = {
      'cht-task': 'create-cht-task',
      'cht-target': 'create-cht-target',
      'cht-specialist': 'cht-specialist',
    };
    const name = skillNames[cmd.name];
    if (!name) throw new Error(`No Codex skill for command '${cmd.name}'.`);
    await this.installSkill({
      name,
      sourcePath: path.resolve(path.dirname(cmd.sourcePath), '..', 'skills', name),
    }, location, options);
  }

  async configureMcp(server: McpServer, location: Location): Promise<void> {
    const configDir = this.getConfigPath(location);
    const configPath = path.join(configDir, 'config.toml');
    let content = '';
    try {
      content = await fs.readFile(configPath, 'utf8');
    } catch (error) {
      if (!isNodeError(error) || error.code !== 'ENOENT') throw error;
    }

    const config = parse(content, { integersAsBigInt: true });
    const servers = config.mcp_servers ?? {};
    if (typeof servers !== 'object' || Array.isArray(servers)) {
      throw new Error(`Expected an MCP server table in ${configPath}.`);
    }
    // Keep user settings, including authentication and server overrides.
    if (Object.hasOwn(servers, server.name)) return;

    const entry = server.type === 'http'
      ? { url: server.url }
      : { command: server.command, args: server.args ?? [] };
    const table = stringify({ mcp_servers: { [server.name]: entry } });
    let updated = content.trimEnd() ? `${content.trimEnd()}\n\n${table}` : table;
    try {
      parse(updated);
    } catch {
      // An inline mcp_servers table cannot be extended with another header.
      updated = stringify({ ...config, mcp_servers: { ...servers, [server.name]: entry } });
    }

    await fs.mkdir(configDir, { recursive: true });
    await fs.writeFile(configPath, updated, { mode: 0o600 });
  }

  async configureHook(hook: Hook, location: Location): Promise<void> {
    const configDir = this.getConfigPath(location);
    const hooksDir = path.join(configDir, 'hooks');
    const configPath = path.join(configDir, 'hooks.json');
    const config = await readJsonConfig<HookConfig>(configPath, {});
    const script = path.join(hooksDir, hook.scriptName);
    const quotedScript = `'${script.replaceAll("'", "'\\''")}'`;
    const command = `bash ${quotedScript} --codex`;
    const matcher = hook.scriptName === 'format-cht.sh' ? '^(apply_patch|Edit|Write)$' : hook.matcher;

    const hooks = config.hooks ??= {};
    const groups = hooks[hook.event] ??= [];
    let group = groups.find(item => item.matcher === matcher);
    if (!group) {
      group = { matcher, hooks: [] };
      groups.push(group);
    }
    if (!group.hooks.some(handler => handler.type === 'command' && handler.command === command)) {
      group.hooks.push({ type: 'command', command });
    }

    await fs.mkdir(hooksDir, { recursive: true });
    await fs.copyFile(hook.sourcePath, script);
    await fs.chmod(script, 0o755);
    await fs.writeFile(configPath, JSON.stringify(config, null, 2) + '\n');
  }
}
