/**
 * 后端服务检测工具
 * - 本地模式：Python 后端运行时返回 http://127.0.0.1:{port}
 * - Vercel 模式：Python 后端不可用时返回 ""（同源 Next.js API 路由）
 */

let cachedMode: 'python' | 'nextjs' | undefined = undefined;

/**
 * 获取后端 API 基础 URL
 * @returns 后端 URL（如 "http://127.0.0.1:12345"）、""（同源 API 路由）或 null
 */
export async function getApiBaseUrl(): Promise<string> {
  if (cachedMode === 'python') return cachedPythonUrl!;
  if (cachedMode === 'nextjs') return '';

  // 尝试检测 Python 后端
  try {
    const res = await fetch(`/backend_config.json?t=${Date.now()}`);
    if (res.ok) {
      const data = await res.json();
      if (data.api_port) {
        cachedMode = 'python';
        cachedPythonUrl = `http://127.0.0.1:${data.api_port}`;
        return cachedPythonUrl!;
      }
    }
  } catch {
    // ignore
  }

  // 回退到 Next.js API 路由（同源）
  cachedMode = 'nextjs';
  return '';
}

let cachedPythonUrl: string | null = null;

/**
 * 检查是否为本地 Python 后端模式
 */
export async function isBackendAvailable(): Promise<boolean> {
  const url = await getApiBaseUrl();
  return url !== '';
}

/**
 * 检查是否为 Vercel 在线模式（使用 Next.js API 路由）
 */
export async function isOnlineMode(): Promise<boolean> {
  const url = await getApiBaseUrl();
  return url === '';
}
