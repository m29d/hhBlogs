/**
 * GitHub API 工具 - 通过 GitHub REST API 读写仓库文件
 * 用于 Vercel 部署模式下替代本地文件系统操作
 */

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const REPO_OWNER = process.env.GITHUB_REPO_OWNER || 'm29d';
const REPO_NAME = process.env.GITHUB_REPO_NAME || 'hhBlogs';
const API_BASE = 'https://api.github.com';

interface GitHubFile {
  content: string;
  sha: string;
}

/**
 * 从 GitHub 仓库读取文件
 */
export async function readFile(path: string): Promise<GitHubFile | null> {
  if (!GITHUB_TOKEN) return null;
  try {
    const res = await fetch(`${API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    return { content, sha: data.sha };
  } catch {
    return null;
  }
}

/**
 * 向 GitHub 仓库写入文件（自动提交）
 */
export async function writeFile(
  path: string,
  content: string,
  sha: string,
  message: string
): Promise<boolean> {
  if (!GITHUB_TOKEN) return false;
  try {
    const res = await fetch(`${API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        content: Buffer.from(content, 'utf-8').toString('base64'),
        sha,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * 解析 siteConfig.ts 为 JSON 对象
 */
export function parseSiteConfig(content: string): Record<string, any> {
  const parsed: Record<string, any> = {};
  let rootContent = content;

  // 1. 提取嵌套对象
  const knownDicts = ['social', 'gitalkConfig', 'geminiConfig', 'icpConfig', 'counts'];
  for (const dictName of knownDicts) {
    const dictMatch = new RegExp(`${dictName}\\s*:\\s*\\{([\\s\\S]+?)\\}`, 'g').exec(content);
    if (dictMatch) {
      const dictStr = dictMatch[1];
      rootContent = rootContent.replace(new RegExp(`${dictName}\\s*:\\s*\\{[\\s\\S]+?\\},?`, 'g'), '');
      const subDict: Record<string, any> = {};
      const strRegex = /([a-zA-Z0-9_]+)\s*:\s*(["'])([\s\S]*?)\2/g;
      let m;
      while ((m = strRegex.exec(dictStr)) !== null) {
        subDict[m[1]] = m[3].replace(/\\n/g, '\n');
      }
      // 数字
      const numRegex = /([a-zA-Z0-9_]+)\s*:\s*(\d+)/g;
      while ((m = numRegex.exec(dictStr)) !== null) {
        if (subDict[m[1]] === undefined) subDict[m[1]] = parseInt(m[2]);
      }
      // Gitalk admin 数组
      if (dictName === 'gitalkConfig') {
        const adminMatch = /admin\s*:\s*\[(.*?)\]/.exec(dictStr);
        subDict['admin'] = adminMatch
          ? adminMatch[1].split(',').map((x) => x.trim().replace(/["']/g, '')).filter(Boolean)
          : [];
      }
      parsed[dictName] = subDict;
    }
  }

  // 2. 提取数组字段
  const arrayFields = ['bgImages', 'themeColors', 'cloudMusicIds', 'danmakuList', 'footerBadges'];
  for (const field of arrayFields) {
    const arrMatch = new RegExp(`${field}\\s*:\\s*\\[([\\s\\S]*?)\\]`, 'g').exec(rootContent);
    if (arrMatch) {
      rootContent = rootContent.replace(new RegExp(`${field}\\s*:\\s*\\[[\\s\\S]*?\\],?`, 'g'), '');
      try {
        parsed[field] = JSON.parse('[' + arrMatch[1] + ']');
      } catch {
        // 尝试逐个提取字符串
        const items: string[] = [];
        const itemRegex = /["'`]([\s\S]*?)["'`]/g;
        let im;
        while ((im = itemRegex.exec(arrMatch[1])) !== null) {
          items.push(im[1]);
        }
        parsed[field] = items;
      }
    }
  }

  // 3. 提取外层基础变量
  const baseRegex = /([a-zA-Z0-9_]+)\s*:\s*(?:(["'`])([\s\S]*?)\2|(true|false|\d+))/g;
  let match;
  while ((match = baseRegex.exec(rootContent)) !== null) {
    const key = match[1];
    const strVal = match[3];
    const rawVal = match[4];
    if (strVal !== undefined) {
      parsed[key] = strVal.replace(/\\n/g, '\n');
    } else if (rawVal === 'true') {
      parsed[key] = true;
    } else if (rawVal === 'false') {
      parsed[key] = false;
    } else if (rawVal && /^\d+$/.test(rawVal)) {
      parsed[key] = parseInt(rawVal);
    }
  }

  return parsed;
}

/**
 * 更新 siteConfig.ts 内容中的指定字段
 */
export function updateSiteConfigContent(
  content: string,
  updates: Record<string, any>
): string {
  let result = content;

  const VALID_KEYS = new Set([
    'title', 'authorName', 'bio', 'avatarUrl', 'useGradient', 'themeColors',
    'bgImages', 'defaultPostCover', 'photoWallImage', 'cloudMusicIds', 'social',
    'counts', 'chatterTitle', 'chatterDescription', 'picBedName', 'picBedUrl',
    'picBedToken', 'danmakuList', 'gitalkConfig', 'buildDate', 'footerBadges',
    'icpConfig', 'geminiConfig', 'faviconUrl', 'navTitle', 'navSuffix', 'navAfter',
    'friendLinkApplyFormat', 'enableLevelSystem',
  ]);

  for (const [key, value] of Object.entries(updates)) {
    if (!VALID_KEYS.has(key)) continue;

    // Gitalk 特殊处理
    if (key === 'gitalkConfig' && typeof value === 'object') {
      const adminList = Array.isArray(value.admin) ? value.admin : [value.admin || ''];
      const adminStr = '["' + adminList.join('", "') + '"]';
      const gitalkCode = `{
    clientID: ${JSON.stringify(value.clientID || '')},
    clientSecret: ${JSON.stringify(value.clientSecret || '')},
    repo: ${JSON.stringify(value.repo || '')},
    owner: ${JSON.stringify(value.owner || '')},
    admin: ${adminStr},
  }`;
      const pattern = new RegExp(`(${key}\\s*:\\s*)\\{[\\s\\S]*?\\}`);
      result = result.replace(pattern, `$1${gitalkCode}`);
      continue;
    }

    // 通用处理
    let valStr: string;
    if (typeof value === 'string') {
      valStr = JSON.stringify(value);
    } else if (typeof value === 'boolean') {
      valStr = String(value);
    } else if (Array.isArray(value)) {
      valStr = JSON.stringify(value, null, 2).replace(/"/g, '"');
      const pattern = new RegExp(`(${key}\\s*:\\s*)\\[[\\s\\S]*?\\]`);
      result = result.replace(pattern, `$1${valStr}`);
      continue;
    } else if (typeof value === 'object' && value !== null) {
      valStr = JSON.stringify(value, null, 2);
      const pattern = new RegExp(`(${key}\\s*:\\s*)\\{[\\s\\S]*?\\}`);
      result = result.replace(pattern, `$1${valStr}`);
      continue;
    } else {
      valStr = JSON.stringify(value);
    }

    const pattern = new RegExp(`(${key}\\s*:\\s*)(['"\`][\\s\\S]*?['"\`]|true|false|\\d+)`);
    result = result.replace(pattern, `$1${valStr}`);
  }

  return result;
}
