# sk2

`sk2` 是一个用于管理 Agent Skill 的命令行工具，支持从 GitHub 仓库发现、查看、安装和更新 Skill。

给你的 Agent Skill 做个精华护理。

## 安装

在项目目录执行：

```bash
npm install
npm link
```

安装后可使用命令：

```bash
sk2 --help
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

## 使用流程建议

1. 添加一个或多个 Skill 仓库
2. 通过 `sk2 list` 查看可用 Skill
3. 使用 `sk2 add` 交互式安装到本地环境（如 `.codex/skills`、`.cursor/skills`）
4. 定期运行 `sk2 update` 同步远程更新

## 说明

- 工具会自动扫描仓库中的 `SKILL.md`
- 安装与更新时会同步 Skill 目录下的相关文件
- 支持通过 `--repo` 指定单个仓库进行操作
