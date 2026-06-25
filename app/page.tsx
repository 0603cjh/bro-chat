'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

type CallState = 'idle' | 'listening' | 'thinking' | 'speaking';

const HACKER_PHRASES = [
  '> 信号接入中...',
  '> 协议握手完成_',
  '> 神经网络已激活_',
  '> 量子加密通道已建立_',
  '> 赛博空间连接稳定_',
  '> 数据流同步中...',
];

const EMOJI_STICKERS = [
  '😂', '🤣', '😭', '🥰', '😍', '🤪', '😎', '🤯',
  '💀', '👻', '🤡', '👀', '🙏', '💪', '🤝', '🫡',
  '🔥', '💯', '🎉', '💩', '😈', '🍺', '🚬', '💊',
  '🐶', '🐱', '🐸', '🦀', '🤖', '👾', '🎮', '💻',
];

const MEME_STICKERS: { label: string; content: string }[] = [
  { label: '嘻嘻好爽', content: '嘻嘻，好爽啊 😈' },
  { label: '没办法', content: '没办法 🤷' },
  { label: '玉玉了', content: '不要喷我了，玉玉了 🥺' },
  { label: '下把c', content: '我的问题，下把c 💪' },
  { label: '玩原玩的', content: '玩原神玩的 🤣' },
  { label: '本质黄铜', content: '本质黄铜罢了 🐸' },
  { label: '砖石操作', content: '你们理解不来砖石的操作的 🔥' },
  { label: '好爽啊', content: '好爽啊～～～ 🎉' },
  { label: '溜了溜了', content: '🏃‍♂️💨 溜了溜了' },
  { label: '别急', content: '别急 🧘' },
  { label: '开摆', content: '开摆！🎮💤' },
  { label: '6', content: '6' },
];

const CYBER_STICKERS: { label: string; content: string }[] = [
  { label: '黑客', content: '⚡ ACCESS_GRANTED ⚡' },
  { label: '数据流', content: '01001010110 🌐' },
  { label: '电路', content: '▓▓▒▒░░ NEURAL_LINK ░░▒▒▓▓' },
  { label: '赛博', content: '🤖 CYBER_PUNK_2077 🤖' },
  { label: '系统', content: '> SYSTEM_OVERRIDE\n> DONE ✓' },
  { label: '故障', content: '⚠️ GLITCH_DETECTED ⚠️' },
];

const CALL_STATUS_TEXT: Record<CallState, string> = {
  idle: '待机',
  listening: '正在听...',
  thinking: '思考中...',
  speaking: '说话中...',
};

// Voicebox 本地服务地址
const VOICEBOX_URL = 'http://127.0.0.1:17493';

export default function Home() {
  // === Voicebox 检测 ===
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '嘻嘻，来啦？没办法，最近又在重温龙族，没看过龙族的人人生是不完整的，真的。',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(true);
  const [bootText, setBootText] = useState(HACKER_PHRASES[0]);
  const [glitchTrigger, setGlitchTrigger] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const [stickerTab, setStickerTab] = useState<'emoji' | 'meme' | 'cyber'>('emoji');
  const [callMode, setCallMode] = useState(false);
  const [callState, setCallState] = useState<CallState>('idle');
  const [voiceboxAvailable, setVoiceboxAvailable] = useState(false);
  const [sttMode, setSttMode] = useState<'voicebox' | 'server' | 'browser'>('browser');
  const [ttsSupported, setTtsSupported] = useState(true);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const stickerPanelRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef(messages);
  const loadingRef = useRef(loading);
  const callModeRef = useRef(callMode);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const sttBackendRef = useRef<'server' | 'browser'>('server');
  const browserRecognitionRef = useRef<any>(null);

  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { loadingRef.current = loading; }, [loading]);
  useEffect(() => { callModeRef.current = callMode; }, [callMode]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 初始化 TTS
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      setTtsSupported(false);
      return;
    }
    synthRef.current = window.speechSynthesis;

    const loadVoices = () => {
      const voices = synthRef.current!.getVoices();
      let voice = voices.find(v => v.lang === 'zh-CN' && v.name.includes('Xiaoxiao'));
      if (!voice) voice = voices.find(v => v.lang === 'zh-CN' && v.name.includes('Yaoyao'));
      if (!voice) voice = voices.find(v => v.lang === 'zh-CN' && v.name.includes('Huihui'));
      if (!voice) voice = voices.find(v => v.lang === 'zh-CN');
      if (!voice) voice = voices.find(v => v.lang.startsWith('zh'));
      if (voice) voiceRef.current = voice;
    };

    loadVoices();
    synthRef.current.onvoiceschanged = loadVoices;
  }, []);

  // 检查浏览器是否支持录音
  useEffect(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setVoiceSupported(false);
    }
  }, []);

  // 检测本地 Voicebox 服务
  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch(`${VOICEBOX_URL}/health`, { signal: AbortSignal.timeout(2000) });
        if (res.ok) {
          setVoiceboxAvailable(true);
          setSttMode('voicebox');
          console.log('✅ Voicebox 已连接');
        }
      } catch {
        console.log('⚠️ Voicebox 未运行，使用浏览器回退');
      }
    };
    check();
  }, []);

  // 启动动画
  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      i = (i + 1) % HACKER_PHRASES.length;
      setBootText(HACKER_PHRASES[i]);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  // 随机毛刺
  useEffect(() => {
    const trigger = () => {
      setGlitchTrigger(true);
      setTimeout(() => setGlitchTrigger(false), 200);
    };
    const timer = setInterval(trigger, 8000 + Math.random() * 12000);
    return () => clearInterval(timer);
  }, []);

  // 点击面板外关闭
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (stickerPanelRef.current && !stickerPanelRef.current.contains(e.target as Node)) {
        setShowStickers(false);
      }
    };
    if (showStickers) {
      document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    }
  }, [showStickers]);

  // === MediaRecorder 录音 ===
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // 检测支持的 mimeType
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        // 停止所有轨道
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;

        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        audioChunksRef.current = [];

        if (blob.size < 500) {
          // 录音太短，忽略
          if (callModeRef.current) {
            setCallState('idle');
            setTimeout(() => startCallRecording(), 500);
          }
          return;
        }

        // 发送到 STT
        const text = await transcribeAudio(blob);
        if (text && callModeRef.current) {
          doSendCall(text);
        } else if (text) {
          doSend(text);
        } else if (callModeRef.current) {
          setCallState('idle');
          setTimeout(() => startCallRecording(), 500);
        }
      };

      recorder.start();
      setRecording(true);
    } catch (err) {
      console.error('麦克风访问失败:', err);
      alert('无法访问麦克风，请检查浏览器权限设置');
      setVoiceSupported(false);
    }
  }, []);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === 'recording') {
      recorder.stop();
    }
    setRecording(false);

    // 清理 stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  // === STT: Voicebox → 服务端 → 浏览器回退 ===
  const transcribeAudio = async (blob: Blob): Promise<string> => {
    // 1) Voicebox 本地 Whisper（最优先）
    if (voiceboxAvailable) {
      try {
        const formData = new FormData();
        formData.append('audio', blob, 'audio.webm');
        formData.append('model', 'whisper-turbo');
        const res = await fetch(`${VOICEBOX_URL}/transcribe`, {
          method: 'POST',
          body: formData,
          signal: AbortSignal.timeout(15000),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.text) return data.text;
        }
      } catch { /* Voicebox 挂了，继续回退 */ }
    }

    // 2) 服务端 STT
    if (sttMode === 'server') {
      try {
        const formData = new FormData();
        formData.append('audio', blob, 'audio.webm');
        const res = await fetch('/api/stt', { method: 'POST', body: formData });
        if (res.ok) {
          const data = await res.json();
          if (data.text) return data.text;
        }
        const err = await res.json().catch(() => ({}));
        if (err.error?.includes('未配置')) {
          setSttMode('browser');
        }
      } catch {
        setSttMode('browser');
      }
    }

    // 3) 浏览器回退
    if (sttMode === 'browser') {
      return await transcribeWithBrowser();
    }

    return '';
  };

  // === 浏览器内置语音识别回退 ===
  const transcribeWithBrowser = (): Promise<string> => {
    return new Promise((resolve) => {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert('语音识别需要配置 API key，且当前浏览器不支持内置语音识别。\n\n请设置 OPENAI_API_KEY 环境变量，或使用 Chrome 浏览器。\n\n获取 OpenAI key: https://platform.openai.com/api-keys');
        resolve('');
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.lang = 'zh-CN';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onresult = (e: any) => {
        resolve(e.results[0][0].transcript || '');
      };
      recognition.onerror = () => resolve('');
      recognition.onnomatch = () => resolve('');

      recognition.start();
      // 超时 5 秒
      setTimeout(() => {
        try { recognition.stop(); } catch {}
        resolve('');
      }, 5000);
    });
  };

  // === TTS 朗读: Voicebox → 浏览器回退 ===
  const speakText = useCallback((text: string) => {
    const clean = text
      .replace(/[*_~`#>|]/g, '')
      .replace(/\[.*?\]\(.*?\)/g, '')
      .replace(/\n+/g, '，')
      .trim();
    if (!clean) return;

    const onDone = () => {
      if (callModeRef.current) {
        setTimeout(() => startCallRecording(), 400);
      } else {
        setCallState('idle');
      }
    };

    // 1) Voicebox TTS
    if (voiceboxAvailable) {
      fetch(`${VOICEBOX_URL}/speak`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Voicebox-Client-Id': 'sai-bo-keng-die',
        },
        body: JSON.stringify({ text: clean }),
        signal: AbortSignal.timeout(30000),
      })
        .then(() => {
          if (callModeRef.current) setCallState('speaking');
          // Voicebox speak 是异步的，大约按文本长度估算时长
          const estimatedMs = Math.max(2000, clean.length * 200);
          setTimeout(onDone, estimatedMs);
        })
        .catch(onDone);
      return;
    }

    // 2) 浏览器 SpeechSynthesis 回退
    const synth = synthRef.current;
    if (!synth) { onDone(); return; }
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = 'zh-CN';
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    if (voiceRef.current) utterance.voice = voiceRef.current;

    utterance.onstart = () => {
      if (callModeRef.current) setCallState('speaking');
    };
    utterance.onend = onDone;
    utterance.onerror = onDone;

    synth.speak(utterance);
  }, [voiceboxAvailable]);

  // === 通话模式录音 ===
  const startCallRecording = useCallback(() => {
    if (!callModeRef.current) return;
    setCallState('listening');
    startRecording();
  }, [startRecording]);

  // === 发送（文字模式）===
  const doSend = useCallback(async (text: string) => {
    if (!text || loadingRef.current) return;
    setInput('');

    const currentMessages = messagesRef.current;
    const userMsg: Message = { role: 'user', content: text };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: currentMessages.concat(userMsg).map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No reader');

      const decoder = new TextDecoder();
      let fullContent = '';

      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.type === 'text') {
                fullContent += parsed.text;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { role: 'assistant', content: fullContent };
                  return updated;
                });
              }
            } catch {}
          }
        }
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: '淦 信号不太好 你再说一遍' }]);
    } finally {
      setLoading(false);
    }
  }, []);

  // === 发送（通话模式）===
  const doSendCall = useCallback(async (text: string) => {
    if (!text || loadingRef.current) return;

    const currentMessages = messagesRef.current;
    const userMsg: Message = { role: 'user', content: text };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    setCallState('thinking');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: currentMessages.concat(userMsg).map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No reader');

      const decoder = new TextDecoder();
      let fullContent = '';

      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.type === 'text') {
                fullContent += parsed.text;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { role: 'assistant', content: fullContent };
                  return updated;
                });
              }
            } catch {}
          }
        }
      }
      // AI 回复完，朗读
      if (callModeRef.current && fullContent) {
        speakText(fullContent);
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: '淦 信号不太好 你再说一遍' }]);
      if (callModeRef.current) {
        setCallState('idle');
        setTimeout(() => startCallRecording(), 1000);
      }
    } finally {
      setLoading(false);
    }
  }, [speakText, startCallRecording]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;
    doSend(text);
  };

  // === 录音按钮 ===
  const toggleRecording = useCallback(() => {
    if (recording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [recording, startRecording, stopRecording]);

  // === 进入/退出通话模式 ===
  const enterCallMode = useCallback(() => {
    if (!voiceSupported) {
      alert('当前浏览器不支持录音功能，请使用 Chrome、Edge 或 Firefox');
      return;
    }
    setCallMode(true);
    callModeRef.current = true;
    synthRef.current?.cancel();
    setCallState('idle');
    setTimeout(() => startCallRecording(), 500);
  }, [voiceSupported, startCallRecording]);

  const exitCallMode = useCallback(() => {
    setCallMode(false);
    callModeRef.current = false;
    setCallState('idle');
    stopRecording();
    synthRef.current?.cancel();
  }, [stopRecording]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-dvh max-w-2xl mx-auto relative">
      <style>{`
        .msg-bubble:hover::before {
          content: '';
          position: absolute;
          left: 0;
          width: 100%;
          height: 2px;
          background: var(--neon-cyan);
          box-shadow: 0 0 8px var(--neon-cyan);
          animation: scanSweep 0.6s linear;
          pointer-events: none;
        }
        @keyframes scanSweep {
          0% { top: -2px; }
          100% { top: 100%; }
        }
        @keyframes callPulse {
          0%, 100% { box-shadow: 0 0 10px rgba(0,255,245,0.3), 0 0 30px rgba(0,255,245,0.1); }
          50% { box-shadow: 0 0 20px rgba(0,255,245,0.6), 0 0 50px rgba(0,255,245,0.25); }
        }
        @keyframes equalizer {
          0%, 100% { height: 4px; }
          25% { height: 16px; }
          50% { height: 8px; }
          75% { height: 20px; }
        }
      `}</style>

      {/* Header */}
      <header className="relative flex items-center gap-3 px-4 py-3 border-b border-[#00fff5]/20 bg-[#0c0c1a]/95 backdrop-blur sticky top-0 z-10">
        <div className="absolute top-0 left-0 w-3 h-[1px] bg-[#00fff5] shadow-[0_0_6px_#00fff5]" />
        <div className="absolute top-0 left-0 w-[1px] h-3 bg-[#00fff5] shadow-[0_0_6px_#00fff5]" />
        <div className="absolute top-0 right-0 w-3 h-[1px] bg-[#ff00ff] shadow-[0_0_6px_#ff00ff]" />
        <div className="absolute top-0 right-0 w-[1px] h-3 bg-[#ff00ff] shadow-[0_0_6px_#ff00ff]" />

        <div
          className="relative w-10 h-10 rounded-lg bg-black border border-[#00fff5]/50 flex items-center justify-center text-lg flex-shrink-0 overflow-hidden"
          style={{
            boxShadow: callMode
              ? '0 0 16px rgba(0,255,245,0.6), 0 0 30px rgba(0,255,245,0.2), inset 0 0 10px rgba(0,255,245,0.1)'
              : '0 0 10px rgba(0,255,245,0.4), 0 0 20px rgba(0,255,245,0.15), inset 0 0 10px rgba(0,255,245,0.1)',
            animation: callMode ? 'callPulse 2s ease-in-out infinite' : 'none',
          }}
        >
          <span style={glitchTrigger ? { animation: 'glitch 0.2s ease' } : {}}>😈</span>
        </div>

        <div className="flex-1 min-w-0">
          <h1
            className="font-bold text-base tracking-wider uppercase"
            style={{
              color: '#00fff5',
              textShadow: '0 0 10px #00fff5, 0 0 20px #00fff5, 0 0 40px #00fff5',
              animation: glitchTrigger ? 'glitchText 0.3s ease' : 'none',
            }}
          >
            {callMode ? '坑爹_CALL///' : '坑爹_///synth'}
          </h1>
          <p className="text-xs truncate" style={{ color: '#6b7a8d', fontFamily: "'Courier New', monospace" }}>
            {callMode ? `📞 ${CALL_STATUS_TEXT[callState]}` : voiceboxAvailable ? '⚡ Voicebox 已连接 - 语音就绪' : bootText}
          </p>
        </div>

        {!callMode ? (
          <button
            onClick={enterCallMode}
            disabled={!voiceSupported || loading}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border font-mono tracking-wider transition-all hover:scale-105 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              borderColor: 'rgba(0,255,245,0.5)',
              color: '#00fff5',
              background: 'rgba(0,255,245,0.08)',
              boxShadow: '0 0 8px rgba(0,255,245,0.2)',
            }}
            title="语音通话"
          >
            📞 通话
          </button>
        ) : (
          <button
            onClick={exitCallMode}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border font-mono tracking-wider transition-all hover:scale-105 active:scale-95"
            style={{
              borderColor: 'rgba(255,0,0,0.5)',
              color: '#ff4444',
              background: 'rgba(255,0,0,0.08)',
              boxShadow: '0 0 8px rgba(255,0,0,0.2)',
            }}
          >
            ❌ 挂断
          </button>
        )}

        <span
          className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border bg-[#39ff14]/5"
          style={{
            animation: 'statusPulse 2s ease-in-out infinite',
            borderColor: voiceboxAvailable ? 'rgba(255,214,0,0.5)' : 'rgba(57,255,20,0.4)',
            color: voiceboxAvailable ? '#ffd600' : '#39ff14',
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: voiceboxAvailable ? '#ffd600' : '#39ff14',
              boxShadow: voiceboxAvailable ? '0 0 6px #ffd600' : '0 0 6px #39ff14',
            }}
          />
          {callMode ? 'CALL' : voiceboxAvailable ? 'VOICEBOX' : 'ONLINE'}
        </span>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`message-enter flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div
                className="w-8 h-8 rounded-lg border flex items-center justify-center text-sm flex-shrink-0 mr-2 mt-1 bg-black"
                style={{
                  borderColor: 'rgba(255,0,255,0.5)',
                  boxShadow: '0 0 8px rgba(255,0,255,0.3), inset 0 0 8px rgba(255,0,255,0.1)',
                }}
              >
                😈
              </div>
            )}
            <div
              className={`msg-bubble relative max-w-[80%] px-4 py-2.5 rounded text-sm leading-relaxed whitespace-pre-wrap break-words ${
                msg.role === 'user' ? 'rounded-tr-none' : 'rounded-tl-none'
              }`}
              style={
                msg.role === 'user'
                  ? {
                      background: 'rgba(0,255,245,0.08)',
                      border: '1px solid rgba(0,255,245,0.3)',
                      color: '#00fff5',
                      boxShadow: '0 0 8px rgba(0,255,245,0.1), inset 0 0 12px rgba(0,255,245,0.03)',
                    }
                  : {
                      background: 'rgba(255,0,255,0.05)',
                      border: '1px solid rgba(255,0,255,0.15)',
                      color: '#e0e8f0',
                      boxShadow: '0 0 8px rgba(255,0,255,0.05), inset 0 0 12px rgba(255,0,255,0.02)',
                    }
              }
            >
              {/^[\u{1F600}-\u{1F9FF}\u{2600}-\u{27BF}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{200D}\u{FE0F}\s⚡▓▒░✓⚠️️🌐]+$/u.test(msg.content.trim()) || /^(>|\|).+/.test(msg.content.trim()) ? (
                <span className="text-3xl leading-normal">{msg.content}</span>
              ) : (
                msg.content
              )}
              {msg.role === 'assistant' && i === messages.length - 1 && loading && (
                <span
                  className="inline-block w-1.5 h-4 ml-1 rounded-sm align-middle"
                  style={{
                    background: '#00fff5',
                    boxShadow: '0 0 6px #00fff5',
                    animation: 'cursorBlink 0.8s step-end infinite',
                  }}
                />
              )}
            </div>
            {msg.role === 'user' && (
              <div
                className="w-8 h-8 rounded-lg border flex items-center justify-center text-sm flex-shrink-0 ml-2 mt-1 bg-black"
                style={{
                  borderColor: 'rgba(0,255,245,0.5)',
                  boxShadow: '0 0 8px rgba(0,255,245,0.3), inset 0 0 8px rgba(0,255,245,0.1)',
                }}
              >
                🧑
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </main>

      {/* 通话模式 UI */}
      {callMode && (
        <div
          className="flex items-center justify-center gap-4 px-4 py-4 border-t border-[#00fff5]/20 bg-[#0c0c1a]/95"
          style={{ animation: 'callPulse 2s ease-in-out infinite' }}
        >
          <div className="flex items-end gap-0.5 h-8">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((n) => (
              <span
                key={n}
                className="w-1 rounded-full bg-[#00fff5]"
                style={{
                  animation: `equalizer ${0.4 + n * 0.12}s ease-in-out infinite`,
                  animationDelay: `${n * 0.1}s`,
                }}
              />
            ))}
          </div>

          <div className="text-center">
            <div
              className="text-sm font-mono tracking-widest uppercase"
              style={{ color: '#00fff5', textShadow: '0 0 10px #00fff5' }}
            >
              {callState === 'listening' && '🎙️ 我在听...'}
              {callState === 'thinking' && '🤔 思考中...'}
              {callState === 'speaking' && '🔊 说话中...'}
              {callState === 'idle' && '📞 通话中'}
            </div>
            <div className="text-xs mt-1" style={{ color: '#6b7a8d' }}>
              {callState === 'listening' && '请说话'}
              {callState === 'thinking' && '稍等'}
              {callState === 'speaking' && '坑爹在回复'}
              {callState === 'idle' && '准备中...'}
            </div>
          </div>

          <button
            onClick={exitCallMode}
            className="w-12 h-12 rounded-full flex items-center justify-center text-xl border transition-all active:scale-90"
            style={{
              background: 'rgba(255,0,0,0.1)',
              borderColor: 'rgba(255,0,0,0.4)',
              boxShadow: '0 0 12px rgba(255,0,0,0.2)',
            }}
          >
            📞
          </button>
        </div>
      )}

      {/* Input — 通话模式隐藏 */}
      {!callMode && (
        <footer className="relative px-4 py-3 border-t border-[#00fff5]/20 bg-[#0c0c1a]/95 backdrop-blur sticky bottom-0">
          <div className="absolute bottom-0 left-0 w-3 h-[1px] bg-[#ffd600] shadow-[0_0_6px_#ffd600]" />
          <div className="absolute bottom-0 left-0 w-[1px] h-3 bg-[#ffd600] shadow-[0_0_6px_#ffd600]" />

          {showStickers && (
            <div
              ref={stickerPanelRef}
              className="absolute bottom-full left-0 right-0 mb-2 mx-4 rounded-lg overflow-hidden border"
              style={{
                background: '#0c0c1a',
                borderColor: 'rgba(0,255,245,0.3)',
                boxShadow: '0 0 20px rgba(0,255,245,0.15), 0 -4px 20px rgba(0,0,0,0.8)',
              }}
            >
              <div className="flex border-b" style={{ borderColor: 'rgba(0,255,245,0.2)' }}>
                {(['emoji', 'meme', 'cyber'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setStickerTab(tab)}
                    className="flex-1 py-2 text-xs font-mono tracking-wider transition-all uppercase"
                    style={{
                      color: stickerTab === tab ? '#00fff5' : '#6b7a8d',
                      background: stickerTab === tab ? 'rgba(0,255,245,0.08)' : 'transparent',
                      borderBottom: stickerTab === tab ? '1px solid #00fff5' : '1px solid transparent',
                      textShadow: stickerTab === tab ? '0 0 6px #00fff5' : 'none',
                    }}
                  >
                    {tab === 'emoji' ? '😎 Emoji' : tab === 'meme' ? '📢 梗图' : '⚡ 赛博'}
                  </button>
                ))}
              </div>
              <div className="p-3 overflow-y-auto" style={{ maxHeight: '200px' }}>
                {stickerTab === 'emoji' && (
                  <div className="grid grid-cols-8 gap-2">
                    {EMOJI_STICKERS.map((emoji, i) => (
                      <button
                        key={i}
                        onClick={() => { doSend(emoji); setShowStickers(false); }}
                        className="text-2xl p-1.5 rounded hover:scale-125 transition-transform active:scale-90"
                        style={{ background: 'rgba(0,255,245,0.05)' }}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
                {stickerTab === 'meme' && (
                  <div className="grid grid-cols-3 gap-2">
                    {MEME_STICKERS.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => { doSend(s.content); setShowStickers(false); }}
                        className="p-2 rounded text-xs font-mono text-center border transition-all hover:scale-105 active:scale-95 truncate"
                        style={{
                          borderColor: 'rgba(255,0,255,0.3)',
                          color: '#ff00ff',
                          background: 'rgba(255,0,255,0.05)',
                          textShadow: '0 0 4px rgba(255,0,255,0.5)',
                        }}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}
                {stickerTab === 'cyber' && (
                  <div className="grid grid-cols-2 gap-2">
                    {CYBER_STICKERS.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => { doSend(s.content); setShowStickers(false); }}
                        className="p-2 rounded text-xs font-mono text-center border transition-all hover:scale-105 active:scale-95"
                        style={{
                          borderColor: 'rgba(0,255,245,0.3)',
                          color: '#00fff5',
                          background: 'rgba(0,255,245,0.05)',
                          textShadow: '0 0 4px rgba(0,255,245,0.5)',
                        }}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-2 items-center">
            <button
              onClick={() => setShowStickers(!showStickers)}
              disabled={loading}
              className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-lg transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed border bg-black"
              style={{
                borderColor: showStickers ? '#ffd600' : 'rgba(0,255,245,0.3)',
                boxShadow: showStickers ? '0 0 12px rgba(255,214,0,0.4)' : 'none',
                color: showStickers ? '#ffd600' : '#6b7a8d',
              }}
              title="表情包"
            >
              😎
            </button>
            {voiceSupported && (
              <button
                onClick={toggleRecording}
                disabled={loading}
                className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-lg transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed border bg-black"
                style={
                  recording
                    ? {
                        borderColor: '#ff00ff',
                        boxShadow: '0 0 16px rgba(255,0,255,0.6)',
                        animation: 'neonFlicker 1.8s ease-in-out infinite',
                      }
                    : { borderColor: 'rgba(0,255,245,0.3)', color: '#6b7a8d' }
                }
                title={recording ? '点击停止' : '语音输入'}
              >
                {recording ? '🔴' : '🎤'}
              </button>
            )}
            <div className="flex-1 relative">
              <span
                className="absolute left-4 top-1/2 -translate-y-1/2 text-sm select-none pointer-events-none z-10"
                style={{ color: '#00fff5', opacity: 0.6 }}
              >
                &gt;
              </span>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={recording ? '录音中...' : voiceSupported ? '输入指令 或点🎤录音...' : '输入指令...'}
                disabled={loading}
                className="w-full pl-8 pr-4 py-2.5 rounded-lg text-sm placeholder-[#6b7a8d]/50 focus:outline-none transition-all disabled:opacity-40 font-mono bg-black border text-[#00fff5]"
                style={{
                  borderColor: recording ? '#ff00ff' : 'rgba(0,255,245,0.3)',
                  boxShadow: recording
                    ? '0 0 10px rgba(255,0,255,0.3), inset 0 0 10px rgba(255,0,255,0.05)'
                    : 'inset 0 0 10px rgba(0,255,245,0.03)',
                }}
                autoFocus
              />
            </div>
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="flex-shrink-0 px-5 py-2.5 rounded-lg text-sm font-bold tracking-wider transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed border uppercase"
              style={{
                background: 'rgba(255,0,255,0.1)',
                borderColor: 'rgba(255,0,255,0.4)',
                color: '#ff00ff',
                boxShadow: input.trim() ? '0 0 10px rgba(255,0,255,0.3)' : 'none',
              }}
            >
              {loading ? '...' : 'SEND'}
            </button>
          </div>
          {recording && (
            <div className="flex items-center gap-2 mt-2 px-1">
              <span className="flex gap-0.5">
                {[0, 1, 2, 3].map((n) => (
                  <span
                    key={n}
                    className="w-1 h-4 rounded-full bg-[#ff00ff] shadow-[0_0_6px_#ff00ff]"
                    style={{ animation: `wave 0.8s ease-in-out ${n * 0.15}s infinite` }}
                  />
                ))}
              </span>
              <span className="text-xs font-mono tracking-wider" style={{ color: '#ff00ff', textShadow: '0 0 6px #ff00ff' }}>
                [RECORDING...]
              </span>
            </div>
          )}
        </footer>
      )}
    </div>
  );
}
