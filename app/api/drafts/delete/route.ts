import { NextResponse } from 'next/server';
import { readFile, deleteFile } from '@/lib/github';
import { isAuthenticated } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!isAuthenticated(req)) {
    return NextResponse.json({ success: false, message: '未授权，请先登录' }, { status: 401 });
  }

  try {
    const { id, type } = await req.json();
    if (!id) {
      return NextResponse.json({ success: false, message: '缺少文件 ID' });
    }

    const folder = type === 'chatter' ? 'chatters' : 'posts';
    const filePath = `${folder}/${id}.md`;

    const file = await readFile(filePath);
    if (!file) {
      return NextResponse.json({ success: false, message: '文件不存在' });
    }

    const success = await deleteFile(filePath, file.sha, `delete: remove ${id}`);
    return NextResponse.json({ success, message: success ? '已删除' : '删除失败' });
  } catch (e: any) {
    return NextResponse.json({ success: false, message: `错误: ${e.message}` });
  }
}
