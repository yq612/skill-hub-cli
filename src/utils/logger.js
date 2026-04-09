import chalk from 'chalk';
import * as emoji from 'node-emoji';
import ora from 'ora';

export const logger = {
  success(msg) {
    console.log(chalk.green(emoji.get('white_check_mark')) + ' ' + msg);
  },
  error(msg) {
    console.log(chalk.red(emoji.get('x')) + ' ' + msg);
  },
  warn(msg) {
    console.log(chalk.yellow(emoji.get('warning')) + ' ' + msg);
  },
  info(msg) {
    console.log(chalk.blue(emoji.get('information_source')) + ' ' + msg);
  },
  spinner(text) {
    return ora({ text, color: 'cyan' });
  },
};
