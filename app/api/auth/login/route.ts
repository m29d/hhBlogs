import { NextResponse } from 'next/server';
import { verifyPassword, createToken, COOKIE_NAME, COOKIE_MAX_AGE } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { password } = await req.json();

    if (!password) {
      return NextResponse.json({ success: false, message: '请输入密码' });
    }

    if (!verifyPassword(password)) {
      return NextResponse.json({ success: false, message: '密码错误' });
    }

    const token = createToken();
    const response = NextResponse.json({ success: true, message: '登录成功' });
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    });

    return response;
  } catch (e: any) {
    return NextResponse.json({ success: false, message: `服务器错误: ${e?.message || e}` });
  }
}
