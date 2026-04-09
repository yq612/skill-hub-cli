import { readFileSync, writeFileSync, chmodSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const CONFIG_PATH = join(homedir(), '.skillrc.json');

export function loadConfig() {
  if (!existsSync(CONFIG_PATH)) {
    return { repos: [] };
  }
  const raw = readFileSync(CONFIG_PATH, 'utf-8');
  return JSON.parse(raw);
}

export function saveConfig(config) {
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
  chmodSync(CONFIG_PATH, 0o600);
}

export function addRepo(repo) {
  const config = loadConfig();
  const existing = config.repos.find((r) => r.alias === repo.alias);
  if (existing) {
    return { success: false, message: `别名 "${repo.alias}" 已存在，请使用其他别名` };
  }
  config.repos.push(repo);
  saveConfig(config);
  return { success: true };
}

export function removeRepo(alias) {
  const config = loadConfig();
  const index = config.repos.findIndex((r) => r.alias === alias);
  if (index === -1) {
    return { success: false, message: `未找到别名为 "${alias}" 的仓库` };
  }
  config.repos.splice(index, 1);
  saveConfig(config);
  return { success: true };
}

export function getRepo(alias) {
  const config = loadConfig();
  return config.repos.find((r) => r.alias === alias) || null;
}

export function getAllRepos() {
  const config = loadConfig();
  return config.repos;
}
