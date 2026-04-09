import { confirm } from '@inquirer/prompts';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import Table from 'cli-table3';
import chalk from 'chalk';
import { getAllRepos, getRepo } from '../utils/config.js';
import {
  getRepoInfo,
  getTree,
  getFileContent,
  getSkillDirectoryFiles,
  parseRepoUrl,
} from '../services/github.js';
import { scanSkills, groupByName } from '../services/local-scanner.js';
import { logger } from '../utils/logger.js';

export async function skillUpdate(options) {
  let repos;
  if (options.repo) {
    const repo = getRepo(options.repo);
    if (!repo) {
      logger.error(`未找到别名为 "${options.repo}" 的仓库`);
      return;
    }
    repos = [repo];
  } else {
    repos = getAllRepos();
  }

  if (repos.length === 0) {
    logger.info('暂无已配置的仓库，使用 sk2 repo add <url> 添加');
    return;
  }

  // 1. Scan local skills
  const scanSpinner = logger.spinner('正在扫描本地 Skill...');
  scanSpinner.start();

  const cwd = process.cwd();
  const localSkills = await scanSkills(cwd);
  const localGrouped = groupByName(localSkills);

  scanSpinner.stop();

  if (localSkills.length === 0) {
    logger.info(' 未找到任何本地 Skill');
    return;
  }

  // 2. Fetch remote skills and compare
  const remoteSpinner = logger.spinner('正在拉取远程 Skill 列表...');
  remoteSpinner.start();

  const updatable = [];

  const results = await Promise.allSettled(
    repos.map(async (repoConfig) => {
      const parsed = parseRepoUrl(repoConfig.url);
      if (!parsed) return [];

      const { owner, repo } = parsed;
      const info = await getRepoInfo(owner, repo, repoConfig.token);
      const tree = await getTree(owner, repo, info.default_branch, repoConfig.token);

      const skillFiles = tree.filter(
        (item) => item.type === 'blob' && item.path.endsWith('SKILL.md')
      );

      const matched = [];

      for (const file of skillFiles) {
        const parts = file.path.split('/');
        const skillName = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
        const skillDirPath = parts.slice(0, -1).join('/');

        if (!localGrouped[skillName]) continue;

        const remoteContent = await getFileContent(owner, repo, file.path, repoConfig.token);
        const localContent = localGrouped[skillName][0].content;

        if (localContent.trim() !== remoteContent.trim()) {
          // Get last commit date
          const commits = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/commits?path=${encodeURIComponent(file.path)}&per_page=1`,
            {
              headers: {
                Accept: 'application/vnd.github.v3+json',
                'User-Agent': 'skill-cli',
                ...(repoConfig.token ? { Authorization: `Bearer ${repoConfig.token}` } : {}),
              },
            }
          ).then((r) => r.json());

          const lastUpdate = commits.length > 0
            ? commits[0].commit.committer.date
            : null;

          matched.push({
            name: skillName,
            alias: repoConfig.alias,
            skillDirPath,
            owner,
            repo,
            token: repoConfig.token,
            localPaths: localGrouped[skillName].map((s) => s.path),
            lastUpdate,
          });
        }
      }

      return matched;
    })
  );

  remoteSpinner.stop();

  for (const result of results) {
    if (result.status === 'fulfilled') {
      updatable.push(...result.value);
    }
  }

  if (updatable.length === 0) {
    logger.success('所有 Skill 均为最新');
    return;
  }

  // 3. Show updatable table
  const previewTable = new Table({
    head: [
      chalk.bold.white('Skill 名称'),
      chalk.bold.white('所在仓库'),
      chalk.bold.white('本地路径'),
      chalk.bold.white('远程最后更新'),
    ],
  });

  for (const item of updatable) {
    const dateStr = item.lastUpdate
      ? new Date(item.lastUpdate).toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '未知';

    previewTable.push([
      chalk.cyan(item.name),
      chalk.magenta(item.alias),
      item.localPaths.join('\n'),
      dateStr,
    ]);
  }

  console.log(previewTable.toString());

  // 4. Confirm
  const confirmed = await confirm({
    message: '是否确认更新以上 Skill？',
    default: true,
  });

  if (!confirmed) {
    logger.info('已取消更新');
    return;
  }

  // 5. Update all copies
  const summaryTable = new Table({
    head: [
      chalk.bold.white('Skill 名称'),
      chalk.bold.white('更新路径数'),
      chalk.bold.white('状态'),
    ],
  });

  for (const item of updatable) {
    const updateSpinner = logger.spinner(`正在更新 ${item.name}...`);
    updateSpinner.start();

    try {
      const remoteFiles = await getSkillDirectoryFiles(
        item.owner,
        item.repo,
        item.skillDirPath,
        item.token
      );

      for (const localPath of item.localPaths) {
        // localPath is the SKILL.md path, get the skill directory
        const skillDir = dirname(localPath);
        writeSkillFiles(skillDir, remoteFiles);
      }

      updateSpinner.stop();
      summaryTable.push([
        chalk.cyan(item.name),
        String(item.localPaths.length),
        chalk.green('updated'),
      ]);
    } catch (err) {
      updateSpinner.stop();
      logger.error(`更新 ${item.name} 失败: ${err.message}`);
      summaryTable.push([
        chalk.cyan(item.name),
        String(item.localPaths.length),
        chalk.red('failed'),
      ]);
    }
  }

  console.log();
  console.log(summaryTable.toString());
}

function writeSkillFiles(targetDir, files) {
  for (const file of files) {
    const filePath = join(targetDir, file.relativePath);
    const dir = dirname(filePath);
    mkdirSync(dir, { recursive: true });
    writeFileSync(filePath, file.content, 'utf-8');
  }
}
