import { NextResponse } from 'next/server';
import { readFile } from '@/lib/github';
import matter from 'gray-matter';
import { marked } from 'marked';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rawId = (body.id || '').replace('.md', '');
    const docType = body.type || 'post';

    // 确定文件路径
    let filePath: string;
    if (rawId === 'about' || docType === 'about') {
      filePath = 'app/about/about.md';
    } else {
      const folder = docType === 'chatter' ? 'chatters' : 'posts';
      filePath = `${folder}/${rawId}.md`;
    }

    // 从 GitHub 读取文件
    const file = await readFile(filePath);
    if (!file) {
      return NextResponse.json({ success: false, message: '未找到相关文件' });
    }

    // 解析 YAML frontmatter
    const parsed = matter(file.content);
    const fm = parsed.data;
    const mdBody = parsed.content;

    // 将 Markdown 转换为 HTML（marked 会保留已有的 HTML 标签）
    const htmlContent = await marked.parse(mdBody);

    return NextResponse.json({
      success: true,
      draft: {
        id: rawId,
        type: docType,
        title: fm.title || (docType === 'about' ? '关于我' : ''),
        content: htmlContent,
        tags: Array.isArray(fm.tags) ? fm.tags : (fm.tags ? [fm.tags] : []),
        cover: fm.cover || '',
        description: fm.description || '',
        mood: fm.mood || '',
        date: fm.date || '',
      },
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, message: `错误: ${e.message}` });
  }
}
