import { NextResponse } from 'next/server';
import { readFile, writeFile, updateSiteConfigContent } from '@/lib/github';
import { isAuthenticated } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  // 认证检查
  if (!isAuthenticated(req)) {
    return NextResponse.json({ success: false, message: '未授权，请先登录' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const updates = body.updates || body;
    if (!updates || Object.keys(updates).length === 0) {
      return NextResponse.json({ success: false, message: '没有收到需要更新的数据' });
    }

    // 从 GitHub 读取当前文件
    const file = await readFile('siteConfig.ts');
    if (!file) {
      return NextResponse.json({ success: false, message: '无法读取 siteConfig.ts' });
    }

    // 更新内容
    const newContent = updateSiteConfigContent(file.content, updates);

    // 提交到 GitHub
    const success = await writeFile(
      'siteConfig.ts',
      newContent,
      file.sha,
      `feat: update site config via web editor`
    );

    if (success) {
      return NextResponse.json({
        success: true,
        message: '配置已提交到 GitHub，正在重新构建',
      });
    }
    return NextResponse.json({ success: false, message: '提交到 GitHub 失败' });
  } catch (e: any) {
    return NextResponse.json({ success: false, message: `错误: ${e.message}` });
  }
}
