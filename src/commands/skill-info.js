import { getAllRepos, getRepo } from '../utils/config.js';
import { getRepoInfo, getTree, getFileContent, parseRepoUrl } from '../services/github.js';
import { logger } from '../utils/logger.js';

export async function skillInfo(skillName, options) {
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

  const spinner = logger.spinner(`正在搜索 Skill "${skillName}"...`);
  spinner.start();

  const matches = [];

  const results = await Promise.allSettled(
    repos.map(async (repoConfig) => {
      const parsed = parseRepoUrl(repoConfig.url);
      if (!parsed) return null;

      const { owner, repo } = parsed;
      const info = await getRepoInfo(owner, repo, repoConfig.token);
      const tree = await getTree(owner, repo, info.default_branch, repoConfig.token);

      const skillFiles = tree.filter(
        (item) => item.type === 'blob' && item.path.endsWith('SKILL.md')
      );

      for (const file of skillFiles) {
        const parts = file.path.split('/');
        const name = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
        if (name === skillName) {
          return { repoConfig, owner, repo, path: file.path };
        }
      }
      return null;
    })
  );

  spinner.stop();

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      matches.push(result.value);
    }
  }

  if (matches.length === 0) {
    logger.error(`未找到名为 "${skillName}" 的 Skill`);
    return;
  }

  if (matches.length > 1) {
    logger.warn(`在多个仓库中找到名为 "${skillName}" 的 Skill，请使用 --repo 指定仓库：`);
    for (const m of matches) {
      logger.info(`  ${m.repoConfig.alias} → ${m.path}`);
    }
    return;
  }

  const match = matches[0];
  const contentSpinner = logger.spinner('正在获取 SKILL.md 内容...');
  contentSpinner.start();

  try {
    const content = await getFileContent(match.owner, match.repo, match.path, match.repoConfig.token);
    contentSpinner.stop();
    console.log();
    console.log(content);
  } catch (err) {
    contentSpinner.stop();
    logger.error(`获取文件内容失败: ${err.message}`);
  }
}
