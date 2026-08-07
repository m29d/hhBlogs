/**
 * 认证工具 - 使用 HMAC 签名的 cookie token
 * 无需额外依赖，使用 Node.js 内置 crypto 模块
 */
import { createHmac } from 'crypto';

const SECRET = process.env.ADMIN_PASSWORD || 'change-this-password-2026';
export const COOKIE_NAME = 'xhblog_admin_token';
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

/**
 * 创建签名 token
 */
export function createToken(): string {
  const payload = JSON.stringify({
    role: 'admin',
    iat: Date.now(),
    exp: Date.now() + COOKIE_MAX_AGE * 1000,
  });
  const payloadB64 = Buffer.from(payload).toString('base64url');
  const signature = createHmac('sha256', SECRET).update(payloadB64).digest('base64url');
  return `${payloadB64}.${signature}`;
}

/**
 * 验证 token 是否有效
 */
export function verifyToken(token: string | undefined): boolean {
  if (!token) return false;
  try {
    const [payloadB64, signature] = token.split('.');
    if (!payloadB64 || !signature) return false;

    const expectedSig = createHmac('sha256', SECRET).update(payloadB64).digest('base64url');
    if (signature !== expectedSig) return false;

    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8'));
    if (Date.now() > payload.exp) return false;

    return payload.role === 'admin';
  } catch {
    return false;
  }
}

/**
 * 验证管理员密码
 */
export function verifyPassword(password: string): boolean {
  return password === SECRET;
}

/**
 * 从 Request 中提取并验证 cookie
 */
export function isAuthenticated(req: Request): boolean {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  return verifyToken(token);
}
