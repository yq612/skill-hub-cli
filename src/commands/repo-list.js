import Table from 'cli-table3';
import chalk from 'chalk';
import { getAllRepos } from '../utils/config.js';
import { logger } from '../utils/logger.js';

export function repoList() {
  const repos = getAllRepos();

  if (repos.length === 0) {
    logger.info('暂无已配置的仓库，使用 sk2 repo add <url> 添加');
    return;
  }

  const table = new Table({
    head: [
      chalk.bold.white('Alias'),
      chalk.bold.white('URL'),
      chalk.bold.white('认证状态'),
    ],
  });

  for (const repo of repos) {
    table.push([
      chalk.magenta(repo.alias),
      repo.url,
      repo.token ? chalk.green('有 Token') : chalk.yellow('无 Token'),
    ]);
  }

  console.log(table.toString());
}
