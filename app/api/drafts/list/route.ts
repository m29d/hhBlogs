import { NextResponse } from 'next/server';
import { listFiles, readFile } from '@/lib/github';
import { isAuthenticated } from '@/lib/auth';
import matter from 'gray-matter';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  if (!isAuthenticated(req)) {
    return NextResponse.json({ success: false, message: '未授权，请先登录' }, { status: 401 });
  }

  try {
    const [posts, chatters] = await Promise.all([
      listFiles('posts'),
      listFiles('chatters'),
    ]);

    const allDrafts: any[] = [];
    const allTags = new Set<string>();

    for (const file of [...(posts || []), ...(chatters || [])]) {
      if (!file.name.endsWith('.md')) continue;
      const fileData = await readFile(file.path);
      if (!fileData) continue;
      const parsed = matter(fileData.content);
      const draftType = file.path.startsWith('chatters') ? 'chatter' : 'post';
      allDrafts.push({
        id: file.name.replace('.md', ''),
        title: parsed.data.title || file.name,
        type: draftType,
        date: parsed.data.date || '',
        tags: Array.isArray(parsed.data.tags) ? parsed.data.tags : [],
        cover: parsed.data.cover || '',
        description: parsed.data.description || '',
        mood: parsed.data.mood || '',
      });
      if (Array.isArray(parsed.data.tags)) {
        parsed.data.tags.forEach((t: string) => allTags.add(t));
      }
    }

    allDrafts.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    return NextResponse.json({
      success: true,
      drafts: allDrafts,
      stats: {
        posts: allDrafts.filter(d => d.type === 'post').length,
        chatters: allDrafts.filter(d => d.type === 'chatter').length,
        tags: allTags.size,
        total: allDrafts.length,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, message: `错误: ${e.message}` });
  }
}
