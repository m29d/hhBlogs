import { NextResponse } from 'next/server';
import { readFile, parseSiteConfig } from '@/lib/github';
import { siteConfig } from '@/siteConfig';

export const dynamic = 'force-dynamic';

export async function GET() {
  // 尝试从 GitHub 读取最新配置
  const file = await readFile('siteConfig.ts');
  if (!file) {
    // 回退到静态导入的配置
    return NextResponse.json({ success: true, data: siteConfig });
  }

  const parsed = parseSiteConfig(file.content);
  return NextResponse.json({ success: true, data: parsed });
}
