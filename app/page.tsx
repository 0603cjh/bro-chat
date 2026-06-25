'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionError extends Event {
  error: string;
  message: string;
}

// 黑客骚话
const HACKER_PHRASES = [
  '> 信号接入中...',
  '> 协议握手完成_',
  '> 神经网络已激活_',
  '> 量子加密通道已建立_',
  '> 赛博空间连接稳定_',
  '> 数据流同步中...',
];

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '嘻嘻，来啦？没办法，最近又在重温龙族，没看过龙族的人人生是不完整的，真的。',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(true);
  const [bootText, setBootText] = useState(HACKER_PHRASES[0]);
  const [glitchTrigger, setGlitchTrigger] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const messagesRef = useRef(messages);
  const loadingRef = useRef(loading);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 启动动画：轮换黑客短语
  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      i = (i + 1) % HACKER_PHRASES.length;
      setBootText(HACKER_PHRASES[i]);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  // 随机毛刺效果
  useEffect(() => {
    const trigger = () => {
      setGlitchTrigger(true);
      setTimeout(() => setGlitchTrigger(false), 200);
    };
    const timer = setInterval(trigger, 8000 + Math.random() * 12000);
    return () => clearInterval(timer);
  }, []);

  // 初始化语音识别
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceSupported(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'zh-CN';
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }
      const text = final || interim;
      setInput(text);
      if (final.trim()) {
        doSend(final.trim());
      }
    };

    recognition.onerror = (event: SpeechRecognitionError) => {
      console.error('语音识别错误:', event.error);
      if (event.error === 'not-allowed') {
        alert('麦克风权限被拒绝了，请在浏览器设置中允许访问麦克风');
      }
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
  }, []);

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
          messages: currentMessages
            .concat(userMsg)
            .map((m) => ({ role: m.role, content: m.content })),
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
                  updated[updated.length - 1] = {
                    role: 'assistant',
                    content: fullContent,
                  };
                  return updated;
                });
              }
            } catch {}
          }
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: '淦 信号不太好 你再说一遍',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

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
          messages: currentMessages
            .concat(userMsg)
            .map((m) => ({ role: m.role, content: m.content })),
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
                  updated[updated.length - 1] = {
                    role: 'assistant',
                    content: fullContent,
                  };
                  return updated;
                });
              }
            } catch {}
          }
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: '>[ERROR] 信号丢失... 你再说一遍',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const toggleListening = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    if (listening) {
      recognition.stop();
      setListening(false);
    } else {
      try {
        recognition.start();
        setListening(true);
      } catch {}
    }
  }, [listening]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-dvh max-w-2xl mx-auto relative">
      {/* 扫描线悬停效果 - hover任何消息时触发 */}
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
        .cyber-card {
          background: var(--bg-elevated);
          border: 1px solid rgba(0, 255, 245, 0.15);
          box-shadow: 0 0 10px rgba(0, 255, 245, 0.05), inset 0 0 20px rgba(0, 255, 245, 0.02);
        }
        .neon-border-cyan {
          border-color: var(--neon-cyan);
          box-shadow: 0 0 6px var(--neon-cyan), 0 0 12px rgba(0, 255, 245, 0.2);
        }
        .neon-border-magenta {
          border-color: var(--neon-magenta);
          box-shadow: 0 0 6px var(--neon-magenta), 0 0 12px rgba(255, 0, 255, 0.2);
        }
      `}</style>

      {/* Header */}
      <header className="relative flex items-center gap-3 px-4 py-3 border-b border-[#00fff5]/20 bg-[#0c0c1a]/95 backdrop-blur sticky top-0 z-10">
        {/* 角落装饰 */}
        <div className="absolute top-0 left-0 w-3 h-[1px] bg-[#00fff5] shadow-[0_0_6px_#00fff5]" />
        <div className="absolute top-0 left-0 w-[1px] h-3 bg-[#00fff5] shadow-[0_0_6px_#00fff5]" />
        <div className="absolute top-0 right-0 w-3 h-[1px] bg-[#ff00ff] shadow-[0_0_6px_#ff00ff]" />
        <div className="absolute top-0 right-0 w-[1px] h-3 bg-[#ff00ff] shadow-[0_0_6px_#ff00ff]" />

        <div
          className={`relative w-10 h-10 rounded-lg bg-black border border-[#00fff5]/50 flex items-center justify-center text-lg flex-shrink-0 overflow-hidden`}
          style={{
            boxShadow: '0 0 10px rgba(0,255,245,0.4), 0 0 20px rgba(0,255,245,0.15), inset 0 0 10px rgba(0,255,245,0.1)',
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
            坑爹_///synth
          </h1>
          <p className="text-xs truncate" style={{ color: '#6b7a8d', fontFamily: "'Courier New', monospace" }}>
            {bootText}
          </p>
        </div>

        <span
          className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border text-[#39ff14] border-[#39ff14]/40 bg-[#39ff14]/5"
          style={{ animation: 'statusPulse 2s ease-in-out infinite' }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#39ff14] shadow-[0_0_6px_#39ff14]" />
          ONLINE
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
                msg.role === 'user'
                  ? 'rounded-tr-none'
                  : 'rounded-tl-none'
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
              {msg.content}
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

      {/* Input */}
      <footer className="px-4 py-3 border-t border-[#00fff5]/20 bg-[#0c0c1a]/95 backdrop-blur sticky bottom-0">
        {/* 角落装饰 */}
        <div className="absolute bottom-0 left-0 w-3 h-[1px] bg-[#ffd600] shadow-[0_0_6px_#ffd600]" />
        <div className="absolute bottom-0 left-0 w-[1px] h-3 bg-[#ffd600] shadow-[0_0_6px_#ffd600]" />

        <div className="flex gap-2 items-center">
          {/* 麦克风按钮 */}
          {voiceSupported && (
            <button
              onClick={toggleListening}
              disabled={loading}
              className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-lg transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed border bg-black"
              style={
                listening
                  ? {
                      borderColor: '#ff00ff',
                      boxShadow: '0 0 16px rgba(255,0,255,0.6), 0 0 32px rgba(255,0,255,0.2)',
                      animation: 'neonFlicker 1.8s ease-in-out infinite',
                    }
                  : {
                      borderColor: 'rgba(0,255,245,0.3)',
                      color: '#6b7a8d',
                    }
              }
              title={listening ? '点击停止' : '语音输入'}
            >
              {listening ? '🎙️' : '🎤'}
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
              placeholder={listening ? '正在监听...' : voiceSupported ? '输入指令 或点击🎤...' : '输入指令...'}
              disabled={loading}
              className="w-full pl-8 pr-4 py-2.5 rounded-lg text-sm placeholder-[#6b7a8d]/50 focus:outline-none transition-all disabled:opacity-40 font-mono bg-black border text-[#00fff5]"
              style={{
                borderColor: listening ? '#ff00ff' : 'rgba(0,255,245,0.3)',
                boxShadow: listening
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
        {listening && (
          <div className="flex items-center gap-2 mt-2 px-1">
            <span className="flex gap-0.5">
              <span className="w-1 h-4 rounded-full bg-[#ff00ff] shadow-[0_0_6px_#ff00ff] animate-[wave_0.8s_ease-in-out_infinite]" />
              <span className="w-1 h-4 rounded-full bg-[#ff00ff] shadow-[0_0_6px_#ff00ff] animate-[wave_0.8s_ease-in-out_0.15s_infinite]" />
              <span className="w-1 h-4 rounded-full bg-[#ff00ff] shadow-[0_0_6px_#ff00ff] animate-[wave_0.8s_ease-in-out_0.3s_infinite]" />
              <span className="w-1 h-4 rounded-full bg-[#ff00ff] shadow-[0_0_6px_#ff00ff] animate-[wave_0.8s_ease-in-out_0.45s_infinite]" />
            </span>
            <span className="text-xs font-mono tracking-wider" style={{ color: '#ff00ff', textShadow: '0 0 6px #ff00ff' }}>
              [RECORDING...]
            </span>
          </div>
        )}
      </footer>
    </div>
  );
}
