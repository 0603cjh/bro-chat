import { NextRequest } from 'next/server';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return Response.json({ error: '未收到音频文件' }, { status: 400 });
    }

    // 优先 OpenAI（国内更容易访问），其次 Groq（免费）
    if (OPENAI_API_KEY) {
      const text = await transcribeWithOpenAI(audioFile);
      return Response.json({ text });
    }

    if (GROQ_API_KEY) {
      const text = await transcribeWithGroq(audioFile);
      return Response.json({ text });
    }

    return Response.json({
      error: '未配置语音识别服务。请设置 OPENAI_API_KEY 或 GROQ_API_KEY 环境变量。',
    }, { status: 500 });
  } catch (err: any) {
    console.error('STT error:', err);
    return Response.json({ error: err.message || '语音识别失败' }, { status: 500 });
  }
}

async function transcribeWithOpenAI(file: File): Promise<string> {
  const body = new FormData();
  body.append('file', file, 'audio.webm');
  body.append('model', 'whisper-1');
  body.append('language', 'zh');

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
    body,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API 错误: ${res.status} ${err}`);
  }

  const data = await res.json();
  return data.text || '';
}

async function transcribeWithGroq(file: File): Promise<string> {
  const body = new FormData();
  body.append('file', file, 'audio.webm');
  body.append('model', 'whisper-large-v3');
  body.append('language', 'zh');
  body.append('response_format', 'json');

  const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
    body,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq API 错误: ${res.status} ${err}`);
  }

  const data = await res.json();
  return data.text || '';
}
