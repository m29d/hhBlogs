import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  // 诊断环境变量状态（不泄露敏感值）
  const token = process.env.GITHUB_TOKEN || '';
  const owner = process.env.GITHUB_REPO_OWNER || 'm29d';
  const repo = process.env.GITHUB_REPO_NAME || 'hhBlogs';

  // 列出所有以 GITHUB 开头的环境变量名
  const githubKeys = Object.keys(process.env).filter(k => k.includes('GITHUB') || k.includes('GH_'));

  // 测试 GitHub API 连通性
  let apiTest = '未测试';
  if (token) {
    try {
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/siteConfig.ts`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'vercel-debug',
        },
      });
      apiTest = `HTTP ${res.status} ${res.statusText}`;
    } catch (e: any) {
      apiTest = `错误: ${e.message}`;
    }
  }

  return NextResponse.json({
    tokenSet: !!token,
    tokenLength: token.length,
    tokenPrefix: token ? token.substring(0, 6) + '...' : '(空)',
    owner,
    repo,
    githubEnvKeys: githubKeys,
    apiTest,
  });
}
