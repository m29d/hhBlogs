import { NextResponse } from 'next/server';
import { isAuthenticated, changePassword } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    // 验证登录状态
    if (!isAuthenticated(req)) {
      return NextResponse.json({ success: false, message: '未登录或登录已过期' });
    }

    const { oldPassword, newPassword } = await req.json();

    // 参数校验
    if (!oldPassword || !newPassword) {
      return NextResponse.json({ success: false, message: '请填写旧密码和新密码' });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ success: false, message: '新密码至少需要6个字符' });
    }

    if (newPassword.length > 128) {
      return NextResponse.json({ success: false, message: '新密码不能超过128个字符' });
    }

    // 执行密码修改
    const result = changePassword(oldPassword, newPassword);

    if (result.success) {
      return NextResponse.json({ success: true, message: result.message });
    } else {
      return NextResponse.json({ success: false, message: result.message });
    }
  } catch (e: any) {
    return NextResponse.json({ success: false, message: `服务器错误: ${e?.message || e}` });
  }
}
