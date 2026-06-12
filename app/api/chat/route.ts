import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT } from '@/lib/prompt';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
  baseURL: process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com',
});

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    if (!process.env.ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'API key 未配置，请在 Vercel 环境变量中设置 ANTHROPIC_API_KEY' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 只保留最近 20 条消息，控制 token 消耗
    const recentMessages = messages.slice(-20);

    const stream = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: recentMessages.map((m: { role: string; content: string }) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })),
      stream: true,
    });

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta'
            ) {
              const data = JSON.stringify({
                type: 'text',
                text: event.delta.text,
              });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (err) {
          console.error('Stream error:', err);
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (err: any) {
    console.error('Chat error:', err);
    return new Response(
      JSON.stringify({ error: err.message || '服务器出错了' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// 处理 OPTIONS 预检请求
export async function OPTIONS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
