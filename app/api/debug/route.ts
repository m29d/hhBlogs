import { NextResponse } from 'next/server';
import { GITHUB_TOKEN, REPO_OWNER, REPO_NAME } from '@/lib/github';

export const dynamic = 'force-dynamic';

export async function GET() {
  let apiTest = '未测试';
  if (GITHUB_TOKEN) {
    try {
      const res = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/siteConfig.ts`, {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
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
    tokenSet: !!GITHUB_TOKEN,
    tokenLength: GITHUB_TOKEN.length,
    tokenPrefix: GITHUB_TOKEN ? GITHUB_TOKEN.substring(0, 6) + '...' : '(空)',
    owner: REPO_OWNER,
    repo: REPO_NAME,
    apiTest,
  });
}
