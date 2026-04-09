import { addRepo } from '../utils/config.js';
import { getRepoInfo, parseRepoUrl } from '../services/github.js';
import { logger } from '../utils/logger.js';

export async function repoAdd(url, options) {
  const parsed = parseRepoUrl(url);
  if (!parsed) {
    logger.error('无效的 GitHub 仓库地址，请使用格式: https://github.com/owner/repo');
    return;
  }

  const { owner, repo } = parsed;
  const token = options.token || null;
  const alias = options.alias || repo;

  const spinner = logger.spinner(`正在验证仓库 ${owner}/${repo}...`);
  spinner.start();

  try {
    await getRepoInfo(owner, repo, token);
    spinner.stop();
  } catch (err) {
    spinner.stop();
    if (!token && err.message.includes('不存在')) {
      logger.error(`无法访问仓库 ${owner}/${repo}，该仓库可能是私有的，请使用 --token 提供访问令牌`);
    } else {
      logger.error(err.message);
    }
    return;
  }

  const result = addRepo({ url, token, alias });
  if (!result.success) {
    logger.error(result.message);
    return;
  }

  logger.success(`仓库 ${alias} 已添加`);
}
