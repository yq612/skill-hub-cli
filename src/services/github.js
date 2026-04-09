import { logger } from '../utils/logger.js';

const API_BASE = 'https://api.github.com';

function buildHeaders(token) {
  const headers = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'skill-cli',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function request(url, token) {
  const res = await fetch(url, { headers: buildHeaders(token) });

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('认证失败，请检查 token 是否有效');
    }
    if (res.status === 403) {
      const resetTime = res.headers.get('X-RateLimit-Reset');
      const resetDate = resetTime
        ? new Date(Number(resetTime) * 1000).toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })
        : '未知';
      throw new Error(`GitHub API 限流，重置时间：${resetDate}`);
    }
    if (res.status === 404) {
      throw new Error('仓库或文件不存在');
    }
    throw new Error(`GitHub API 请求失败: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

export async function getRepoInfo(owner, repo, token) {
  return request(`${API_BASE}/repos/${owner}/${repo}`, token);
}

export async function getTree(owner, repo, branch, token) {
  const data = await request(
    `${API_BASE}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
    token
  );
  return data.tree || [];
}

export async function getLastCommit(owner, repo, path, token) {
  const commits = await request(
    `${API_BASE}/repos/${owner}/${repo}/commits?path=${encodeURIComponent(path)}&per_page=1`,
    token
  );
  if (commits.length === 0) {
    return { date: null, message: '' };
  }
  const commit = commits[0];
  return {
    date: commit.commit.committer.date,
    message: commit.commit.message.split('\n')[0],
  };
}

export async function getFileContent(owner, repo, path, token) {
  const data = await request(
    `${API_BASE}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`,
    token
  );
  const content = Buffer.from(data.content, 'base64').toString('utf-8');
  return content;
}

export async function getDirectoryContents(owner, repo, path, token) {
  const data = await request(
    `${API_BASE}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`,
    token
  );
  return data;
}

export async function getSkillDirectoryFiles(owner, repo, skillDirPath, token) {
  const info = await getRepoInfo(owner, repo, token);
  const tree = await getTree(owner, repo, info.default_branch, token);

  const prefix = skillDirPath.endsWith('/') ? skillDirPath : skillDirPath + '/';
  const files = tree.filter(
    (item) => item.type === 'blob' && item.path.startsWith(prefix)
  );

  const results = await Promise.all(
    files.map(async (file) => {
      const content = await getFileContent(owner, repo, file.path, token);
      const relativePath = file.path.slice(prefix.length);
      return { relativePath, content };
    })
  );

  return results;
}

export function parseRepoUrl(url) {
  const match = url.match(/github\.com[/:]([^/]+)\/([^/.]+)/);
  if (!match) {
    return null;
  }
  return { owner: match[1], repo: match[2] };
}
