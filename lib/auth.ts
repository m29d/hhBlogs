/**
 * 认证工具 - 使用 HMAC 签名的 cookie token
 * 支持运行时密码修改（文件存储）
 */
import { createHmac } from 'crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const ENV_PASSWORD = process.env.ADMIN_PASSWORD || 'change-this-password-2026';
const PASSWORD_FILE = process.env.PASSWORD_FILE_PATH || '/opt/xhblogs-full/data/admin_password.json';

// Token 签名密钥（始终使用环境变量，保证已签发 token 在密码修改后仍然有效）
const SIGNING_SECRET = ENV_PASSWORD;

export const COOKIE_NAME = 'xhblog_admin_token';
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

/**
 * 从文件读取当前密码，文件不存在时回退到环境变量
 */
function getCurrentPassword(): string {
  try {
    if (existsSync(PASSWORD_FILE)) {
      const data = JSON.parse(readFileSync(PASSWORD_FILE, 'utf-8'));
      if (data.password) return data.password;
    }
  } catch {
    // 文件读取失败，回退到环境变量
  }
  return ENV_PASSWORD;
}

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
  const signature = createHmac('sha256', SIGNING_SECRET).update(payloadB64).digest('base64url');
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

    const expectedSig = createHmac('sha256', SIGNING_SECRET).update(payloadB64).digest('base64url');
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
  return password === getCurrentPassword();
}

/**
 * 从 Request 中提取并验证 cookie
 */
export function isAuthenticated(req: Request): boolean {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  return verifyToken(token);
}

/**
 * 修改管理员密码
 * 将新密码写入文件，下次登录即生效
 * 已签发的 token 不受影响（签名密钥不变）
 */
export function changePassword(oldPassword: string, newPassword: string): { success: boolean; message: string } {
  if (!verifyPassword(oldPassword)) {
    return { success: false, message: '旧密码错误' };
  }

  if (oldPassword === newPassword) {
    return { success: false, message: '新密码不能与旧密码相同' };
  }

  try {
    const dir = join(PASSWORD_FILE, '..');
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(PASSWORD_FILE, JSON.stringify({
      password: newPassword,
      updatedAt: new Date().toISOString(),
    }), 'utf-8');
    return { success: true, message: '密码修改成功，下次登录请使用新密码' };
  } catch (e: any) {
    return { success: false, message: `密码修改失败: ${e?.message || e}` };
  }
}
