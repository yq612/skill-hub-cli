import Table from 'cli-table3';
import chalk from 'chalk';
import * as emoji from 'node-emoji';
import { getAllRepos, getRepo } from '../utils/config.js';
import { getRepoInfo, getTree, getLastCommit, parseRepoUrl } from '../services/github.js';
import { logger } from '../utils/logger.js';

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function getTag(dateStr) {
  const now = new Date();
  const then = new Date(dateStr);
  const diffDays = (now - then) / (1000 * 60 * 60 * 24);

  if (diffDays <= 7) {
    return emoji.get('fire') + ' ' + chalk.green('HOT');
  }
  if (diffDays <= 30) {
    return emoji.get('sparkles') + ' ' + chalk.cyan('OK');
  }
  return emoji.get('zzz') + ' ' + chalk.gray('STALE');
}

function getDateColor(dateStr) {
  const now = new Date();
  const then = new Date(dateStr);
  const diffDays = (now - then) / (1000 * 60 * 60 * 24);

  if (diffDays <= 7) return chalk.green;
  if (diffDays <= 30) return chalk.white;
  return chalk.gray;
}

export async function skillList(options) {
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

  const COMMIT_MAX_WIDTH = 50;

  const table = new Table({
    head: [
      chalk.bold.white('仓库'),
      chalk.bold.white('Skill 名称'),
      chalk.bold.white('Commit 信息'),
      chalk.bold.white('标签'),
    ],
    colWidths: [null, null, COMMIT_MAX_WIDTH, null],
    wordWrap: false,
  });

  const results = await Promise.allSettled(
    repos.map(async (repoConfig) => {
      const parsed = parseRepoUrl(repoConfig.url);
      if (!parsed) return [];

      const { owner, repo } = parsed;
      const spinner = logger.spinner(`正在扫描仓库 ${repoConfig.alias}...`);
      spinner.start();

      try {
        const info = await getRepoInfo(owner, repo, repoConfig.token);
        const tree = await getTree(owner, repo, info.default_branch, repoConfig.token);

        const skillFiles = tree.filter(
          (item) => item.type === 'blob' && item.path.endsWith('SKILL.md')
        );

        const skills = await Promise.allSettled(
          skillFiles.map(async (file) => {
            const parts = file.path.split('/');
            const skillName = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
            const commit = await getLastCommit(owner, repo, file.path, repoConfig.token);
            return {
              alias: repoConfig.alias,
              name: skillName,
              path: file.path,
              date: commit.date,
              message: commit.message,
            };
          })
        );

        spinner.stop();

        return skills
          .filter((r) => r.status === 'fulfilled')
          .map((r) => r.value);
      } catch (err) {
        spinner.stop();
        logger.error(`扫描仓库 ${repoConfig.alias} 失败: ${err.message}`);
        return [];
      }
    })
  );

  const allSkills = results
    .filter((r) => r.status === 'fulfilled')
    .flatMap((r) => r.value);

  if (allSkills.length === 0) {
    logger.info('未找到任何 Skill');
    return;
  }

  // Group skills by repo alias for rowSpan merging
  const grouped = [];
  let lastAlias = null;
  let groupStart = -1;

  for (let i = 0; i < allSkills.length; i++) {
    if (allSkills[i].alias !== lastAlias) {
      if (lastAlias !== null) {
        grouped.push({ alias: lastAlias, start: groupStart, count: i - groupStart });
      }
      lastAlias = allSkills[i].alias;
      groupStart = i;
    }
  }
  if (lastAlias !== null) {
    grouped.push({ alias: lastAlias, start: groupStart, count: allSkills.length - groupStart });
  }

  for (const group of grouped) {
    for (let i = 0; i < group.count; i++) {
      const skill = allSkills[group.start + i];
      const dateColor = skill.date ? getDateColor(skill.date) : chalk.gray;
      const row = [];

      if (i === 0) {
        row.push({ content: chalk.magenta(skill.alias), rowSpan: group.count, vAlign: 'center' });
      }

      const commitMsg = skill.message || '';
      const truncated = commitMsg.length > COMMIT_MAX_WIDTH - 4
        ? commitMsg.slice(0, COMMIT_MAX_WIDTH - 4) + '...'
        : commitMsg;

      row.push(
        chalk.cyan(skill.name),
        truncated,
        skill.date ? getTag(skill.date) : '',
      );

      table.push(row);
    }
  }

  console.log(table.toString());
}
