#!/usr/bin/env node

import { Command } from 'commander';
import { repoAdd } from '../src/commands/repo-add.js';
import { repoRemove } from '../src/commands/repo-remove.js';
import { repoList } from '../src/commands/repo-list.js';
import { skillList } from '../src/commands/skill-list.js';
import { skillInfo } from '../src/commands/skill-info.js';
import { skillAdd } from '../src/commands/skill-add.js';
import { skillUpdate } from '../src/commands/skill-update.js';

const program = new Command();

program
  .name('sk2')
  .description('CLI tool for managing AI Agent Skills from GitHub repositories')
  .version('1.0.0');

const repo = program.command('repo').description('管理 GitHub 仓库');

repo
  .command('add <url>')
  .description('添加 GitHub 仓库')
  .option('--token <token>', '访问令牌（私有仓库必填）')
  .option('--alias <name>', '仓库别名')
  .action(repoAdd);

repo
  .command('remove <alias>')
  .description('移除已配置的仓库')
  .action(repoRemove);

repo
  .command('list')
  .description('列出所有已配置的仓库')
  .action(repoList);

program
  .command('list')
  .description('列出所有 Skill')
  .option('--repo <alias>', '指定仓库别名')
  .action(skillList);

program
  .command('info <skill_name>')
  .description('查看 Skill 详情')
  .option('--repo <alias>', '指定仓库别名')
  .action(skillInfo);

program
  .command('add')
  .description('交互式安装远程 Skill 到本地环境')
  .option('--repo <alias>', '指定仓库别名')
  .action(skillAdd);

program
  .command('update')
  .description('检查并更新本地已安装的 Skill')
  .option('--repo <alias>', '指定仓库别名')
  .action(skillUpdate);

program.parse();
