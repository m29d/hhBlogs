import { NextResponse } from 'next/server';
import { readFile, listFiles } from '@/lib/github';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const postTags = new Set<string>();
    const chatterTags = new Set<string>();

    // 从 posts/ 目录扫描
    const postFiles = await listFiles('posts');
    if (postFiles) {
      for (const file of postFiles) {
        if (file.name.endsWith('.md')) {
          const f = await readFile(file.path);
          if (f) {
            const tags = parseFrontmatterTags(f.content);
            tags.forEach((t: string) => postTags.add(t));
          }
        }
      }
    }

    // 从 chatters/ 目录扫描
    const chatterFiles = await listFiles('chatters');
    if (chatterFiles) {
      for (const file of chatterFiles) {
        if (file.name.endsWith('.md')) {
          const f = await readFile(file.path);
          if (f) {
            const tags = parseFrontmatterTags(f.content);
            tags.forEach((t: string) => chatterTags.add(t));
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      postTags: Array.from(postTags).sort(),
      chatterTags: Array.from(chatterTags).sort(),
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e.message, postTags: [], chatterTags: [] });
  }
}

function parseFrontmatterTags(content: string): string[] {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return [];
  const fm = match[1];
  const tagsMatch = fm.match(/tags:\s*\[(.*?)\]/s);
  if (!tagsMatch) return [];
  const tagsStr = tagsMatch[1];
  const tags: string[] = [];
  const tagRegex = /["']([^"']+)["']/g;
  let m;
  while ((m = tagRegex.exec(tagsStr)) !== null) {
    tags.push(m[1]);
  }
  return tags;
}
