import { checkbox } from '@inquirer/prompts';
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
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
import { logger } from '../utils/logger.js';

const ENVIRONMENTS = [
  { name: '.claude/skills', value: '.claude/skills' },
  { name: '.codex/skills', value: '.codex/skills' },
  { name: '.cursor/skills', value: '.cursor/skills' },
  { name: './ (当前目录)', value: '.' },
];

export async function skillAdd(options) {
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

  // 1. Fetch remote skills
  const spinner = logger.spinner('正在拉取远程 Skill 列表...');
  spinner.start();

  const allSkills = [];

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

      return skillFiles.map((file) => {
        const parts = file.path.split('/');
        const skillName = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
        const skillDirPath = parts.slice(0, -1).join('/');
        return {
          alias: repoConfig.alias,
          name: skillName,
          skillDirPath,
          owner,
          repo,
          token: repoConfig.token,
        };
      });
    })
  );

  spinner.stop();

  for (const result of results) {
    if (result.status === 'fulfilled') {
      allSkills.push(...result.value);
    }
  }

  if (allSkills.length === 0) {
    logger.info('未找到任何远程 Skill');
    return;
  }

  // 2. Interactive: select skills
  const selectedSkills = await checkbox({
    message: '选择要安装的 Skill：',
    choices: allSkills.map((s) => ({
      name: `[${s.alias}] ${s.name}`,
      value: s,
    })),
  });

  if (selectedSkills.length === 0) {
    logger.info('未选择任何 Skill');
    return;
  }

  // 3. Interactive: select target environments
  const selectedEnvs = await checkbox({
    message: '选择安装目标环境：',
    choices: ENVIRONMENTS,
  });

  if (selectedEnvs.length === 0) {
    logger.info('未选择任何目标环境');
    return;
  }

  // 4. Install
  const cwd = process.cwd();
  const summaryTable = new Table({
    head: [
      chalk.bold.white('Skill 名称'),
      chalk.bold.white('环境'),
      chalk.bold.white('操作'),
    ],
  });

  for (const skill of selectedSkills) {
    const installSpinner = logger.spinner(`正在安装 ${skill.name}...`);
    installSpinner.start();

    let remoteFiles;
    try {
      remoteFiles = await getSkillDirectoryFiles(
        skill.owner,
        skill.repo,
        skill.skillDirPath,
        skill.token
      );
    } catch (err) {
      installSpinner.stop();
      logger.error(`获取 ${skill.name} 文件失败: ${err.message}`);
      continue;
    }

    installSpinner.stop();

    for (const env of selectedEnvs) {
      const targetDir = join(cwd, env, skill.name);
      const skillMdPath = join(targetDir, 'SKILL.md');

      let action;

      if (!existsSync(skillMdPath)) {
        // New install
        writeSkillFiles(targetDir, remoteFiles);
        logger.success(`${skill.name} 已安装到 ${env}`);
        action = chalk.green('installed');
      } else {
        // Compare SKILL.md content
        const localContent = readFileSync(skillMdPath, 'utf-8');
        const remoteSkillMd = remoteFiles.find((f) => f.relativePath === 'SKILL.md');
        const remoteContent = remoteSkillMd ? remoteSkillMd.content : '';

        if (localContent.trim() === remoteContent.trim()) {
          logger.info(`${skill.name} 在 ${env} 中已是最新`);
          action = chalk.blue('skipped');
        } else {
          logger.warn(`${skill.name} 在 ${env} 中内容有差异，自动替换`);
          writeSkillFiles(targetDir, remoteFiles);
          logger.success(`${skill.name} 已替换到 ${env}`);
          action = chalk.yellow('replaced');
        }
      }

      summaryTable.push([chalk.cyan(skill.name), env, action]);
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
