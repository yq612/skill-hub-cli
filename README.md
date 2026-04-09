# sk2

`sk2` 是一个用于管理 Agent Skill 的命令行工具，支持从 GitHub 仓库发现、查看、安装和更新 Skill。

给你的 Agent Skill 做个精华护理。

## 安装

### 通过 npm 全局安装（推荐）

```bash
npm install -g sk2-cli
```

安装后可直接执行：

```bash
sk2 --help
```

### 本地开发安装

在项目目录执行：

```bash
npm install
npm link
```

安装后可使用命令：

```bash
sk2 --help
```

## 环境要求

- Node.js `>=18`
- 可访问 GitHub（若使用私有仓库需提供 token）

## 快速开始

```bash
# 1) 添加仓库
sk2 repo add https://github.com/<owner>/<repo> --alias my-skills

# 2) 查看可用 Skills
sk2 list --repo my-skills

# 3) 交互式安装
sk2 add --repo my-skills

# 4) 更新本地已安装 Skills
sk2 update --repo my-skills
```

## 核心命令

```bash
# 仓库管理
sk2 repo add <url> [--alias <name>] [--token <token>]
sk2 repo list
sk2 repo remove <alias>

# Skill 操作
sk2 list [--repo <alias>]
sk2 info <skill_name> [--repo <alias>]
sk2 add [--repo <alias>]
sk2 update [--repo <alias>]
```

## 参数说明

- `--alias <name>`：为仓库设置易记别名，便于后续 `--repo` 指定
- `--token <token>`：访问私有仓库时使用（建议最小权限 token）
- `--repo <alias>`：只在指定仓库范围执行命令

## 使用流程建议

1. 添加一个或多个 Skill 仓库
2. 通过 `sk2 list` 查看可用 Skill
3. 使用 `sk2 add` 交互式安装到本地环境（如 `.codex/skills`、`.cursor/skills`）
4. 定期运行 `sk2 update` 同步远程更新

## 配置与目录

- 工具会自动扫描仓库中的 `SKILL.md`
- 安装与更新时会同步 Skill 目录下的相关文件
- 支持通过 `--repo` 指定单个仓库进行操作

## 发布

```bash
npm publish
```

## License

MIT
