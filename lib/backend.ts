/**
 * 后端服务检测工具
 * 在 Vercel 等无 Python 后端的环境中，自动降级为静态数据模式
 */

let cachedPort: number | null | undefined = undefined;

/**
 * 获取后端 API 基础 URL
 * @returns 后端 URL（如 "http://127.0.0.1:12345"）或 null（后端不可用）
 */
export async function getApiBaseUrl(): Promise<string | null> {
  if (cachedPort !== undefined) return cachedPort ? `http://127.0.0.1:${cachedPort}` : null;

  try {
    const res = await fetch(`/backend_config.json?t=${Date.now()}`);
    if (!res.ok) throw new Error('backend_config.json not found');
    const data = await res.json();
    if (data.api_port) {
      cachedPort = data.api_port;
      return `http://127.0.0.1:${data.api_port}`;
    }
    throw new Error('api_port missing');
  } catch {
    cachedPort = null;
    return null;
  }
}

/**
 * 检查后端是否可用
 */
export async function isBackendAvailable(): Promise<boolean> {
  return (await getApiBaseUrl()) !== null;
}
