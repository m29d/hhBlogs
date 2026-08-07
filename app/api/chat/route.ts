// app/api/chat/route.ts
// 改为支持 DeepSeek（OpenAI 兼容格式）
import { siteConfig } from '../../../siteConfig';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    // 读取 API Key：优先 DEEPSEEK_API_KEY，回退 OPENAI_API_KEY
    const apiKey = (process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY || '').trim();

    if (!apiKey) {
      console.error("❌ 找不到 API Key");
      return new Response(JSON.stringify({ error: "Key missing" }), { status: 500 });
    }

    // DeepSeek API 地址（OpenAI 兼容），可通过环境变量覆盖
    const baseUrl = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/+$/, '');
    const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

    // 复用 siteConfig 中的聊天配置
    const config = siteConfig.geminiConfig || {};
    const systemPrompt = config.systemPrompt || 'You are a helpful assistant.';
    const maxTokens = config.maxOutputTokens || 150;
    const temperature = config.temperature ?? 0.85;

    console.log(`📡 正在呼叫 DeepSeek 模型: ${model}`);

    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
        max_tokens: maxTokens,
        temperature,
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("🚨 DeepSeek 拒绝了请求:", JSON.stringify(data));
      return new Response(JSON.stringify({
        error: `模型拒绝访问: ${response.status}`,
        details: data.error?.message || "未知错误"
      }), { status: response.status });
    }

    const reply = data.choices?.[0]?.message?.content || "本喵现在不想理你喵...";

    return new Response(JSON.stringify({ reply }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error("🔥 运行时崩溃:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

export async function GET() {
  return new Response(JSON.stringify({ status: "Ready", model: "DeepSeek" }), { status: 200 });
}
