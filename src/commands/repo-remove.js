import { removeRepo } from '../utils/config.js';
import { logger } from '../utils/logger.js';

export function repoRemove(alias) {
  const result = removeRepo(alias);
  if (!result.success) {
    logger.error(result.message);
    return;
  }
  logger.success(`仓库 ${alias} 已移除`);
}
