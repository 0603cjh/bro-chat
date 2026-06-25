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

// 表情包数据
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
  const [showStickers, setShowStickers] = useState(false);
  const [stickerTab, setStickerTab] = useState<'emoji' | 'meme' | 'cyber'>('emoji');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const stickerPanelRef = useRef<HTMLDivElement>(null);
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
              {/* 纯表情/sticker 消息放大显示 */}
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

      {/* Input */}
      <footer className="relative px-4 py-3 border-t border-[#00fff5]/20 bg-[#0c0c1a]/95 backdrop-blur sticky bottom-0">
        {/* 角落装饰 */}
        <div className="absolute bottom-0 left-0 w-3 h-[1px] bg-[#ffd600] shadow-[0_0_6px_#ffd600]" />
        <div className="absolute bottom-0 left-0 w-[1px] h-3 bg-[#ffd600] shadow-[0_0_6px_#ffd600]" />

        {/* 表情包面板 */}
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
            {/* 标签栏 */}
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

            {/* 表情网格 */}
            <div
              className="p-3 overflow-y-auto"
              style={{ maxHeight: '200px' }}
            >
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
          {/* 表情包按钮 */}
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
