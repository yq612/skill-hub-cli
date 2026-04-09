import { readdir, readFile, stat } from 'node:fs/promises';
import { join, dirname, basename } from 'node:path';

const DEFAULT_EXCLUDES = ['node_modules', '.git', 'dist', 'build'];

export async function scanSkills(dir, excludeDirs = DEFAULT_EXCLUDES) {
  const skills = [];

  async function walk(currentDir) {
    let entries;
    try {
      entries = await readdir(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name);

      if (entry.isDirectory()) {
        if (excludeDirs.includes(entry.name)) continue;
        await walk(fullPath);
      } else if (entry.isFile() && entry.name === 'SKILL.md') {
        const content = await readFile(fullPath, 'utf-8');
        const name = basename(dirname(fullPath));
        skills.push({ name, path: fullPath, content });
      }
    }
  }

  await walk(dir);
  return skills;
}

export function groupByName(skills) {
  const groups = {};
  for (const skill of skills) {
    if (!groups[skill.name]) {
      groups[skill.name] = [];
    }
    groups[skill.name].push({ path: skill.path, content: skill.content });
  }
  return groups;
}

export function diffWithRemote(localSkills, remoteSkills) {
  const localGrouped = groupByName(localSkills);
  const remoteMap = new Map(remoteSkills.map((s) => [s.name, s]));

  const toUpdate = [];
  const upToDate = [];
  const localOnly = [];
  const remoteOnly = [];

  for (const [name, locals] of Object.entries(localGrouped)) {
    const remote = remoteMap.get(name);
    if (!remote) {
      localOnly.push({ name, locals });
      continue;
    }
    const localContent = locals[0].content.trim();
    const remoteContent = remote.content.trim();
    if (localContent === remoteContent) {
      upToDate.push({ name, locals, remote });
    } else {
      toUpdate.push({ name, locals, remote });
    }
  }

  for (const [name, remote] of remoteMap) {
    if (!localGrouped[name]) {
      remoteOnly.push({ name, remote });
    }
  }

  return { toUpdate, upToDate, localOnly, remoteOnly };
}
