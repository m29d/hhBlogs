import { NextResponse } from 'next/server';
import { readFile, writeFile } from '@/lib/github';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, type, title, tags, cover, mood, description, content, date, published } = body;

    // 确定 doc type 和 id
    const docType = type || 'post';
    let docId = id;

    // 如果没有 id 或 id 为 new，生成一个基于标题的 id
    if (!docId || docId === 'new') {
      const safeTitle = (title || '').replace(/[^\w\u4e00-\u9fa5]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      docId = safeTitle || `post-${Date.now()}`;
    }

    // 确定文件路径
    let filePath: string;
    if (docType === 'about') {
      filePath = 'app/about/about.md';
      docId = 'about';
    } else {
      const folder = docType === 'chatter' ? 'chatters' : 'posts';
      filePath = `${folder}/${docId}.md`;
    }

    // 读取现有文件（获取 sha 用于更新，如果文件不存在则创建新文件）
    const existingFile = await readFile(filePath);

    // 构建 YAML frontmatter
    const fmLines: string[] = ['---'];
    fmLines.push(`title: ${JSON.stringify(title || '')}`);
    fmLines.push(`date: ${JSON.stringify(date || new Date().toISOString().split('T')[0])}`);
    if (description) fmLines.push(`description: ${JSON.stringify(description)}`);
    if (cover) fmLines.push(`cover: ${JSON.stringify(cover)}`);
    if (mood) fmLines.push(`mood: ${JSON.stringify(mood)}`);
    if (tags && Array.isArray(tags) && tags.length > 0) {
      const tagsStr = tags.map((t: string) => JSON.stringify(t)).join(', ');
      fmLines.push(`tags: [${tagsStr}]`);
    }
    fmLines.push('---');
    fmLines.push('');

    // content 可能是 HTML 或 Markdown，直接保存
    const finalContent = fmLines.join('\n') + (content || '');

    // 写入 GitHub
    const success = await writeFile(
      filePath,
      finalContent,
      existingFile?.sha,
      `feat: ${published ? 'publish' : 'save draft'} - ${title || docId}`
    );

    if (success) {
      return NextResponse.json({
        success: true,
        message: published ? '已发布到 GitHub，正在重新构建' : '草稿已保存到 GitHub',
        id: docId,
      });
    }
    return NextResponse.json({ success: false, message: '提交到 GitHub 失败' });
  } catch (e: any) {
    return NextResponse.json({ success: false, message: `错误: ${e.message}` });
  }
}
