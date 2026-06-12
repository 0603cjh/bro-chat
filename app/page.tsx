'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '卧槽兄弟 你终于来了！最近咋样 有啥想聊的 👊',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages
            .concat(userMsg)
            .map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No reader');

      const decoder = new TextDecoder();
      let fullContent = '';

      // 添加一个空的 assistant 消息占位
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
            } catch {
              // 忽略解析错误
            }
          }
        }
      }
    } catch (err) {
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
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-dvh max-w-2xl mx-auto">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-gray-800 bg-[#1a1a2e]/95 backdrop-blur sticky top-0 z-10">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-lg flex-shrink-0">
          😈
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-white text-base">坑爹</h1>
          <p className="text-xs text-gray-400 truncate">高中同学 · 穿一条裤子长大的兄弟</p>
        </div>
        <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
          在线
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
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-sm flex-shrink-0 mr-2 mt-1">
                😈
              </div>
            )}
            <div
              className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-md'
                  : 'bg-gray-800 text-gray-100 rounded-bl-md'
              }`}
            >
              {msg.content}
              {msg.role === 'assistant' && i === messages.length - 1 && loading && (
                <span className="inline-block w-1.5 h-4 bg-gray-400 ml-1 animate-pulse rounded-sm" />
              )}
            </div>
            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-sm flex-shrink-0 ml-2 mt-1">
                🧑
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </main>

      {/* Input */}
      <footer className="px-4 py-3 border-t border-gray-800 bg-[#1a1a2e]/95 backdrop-blur sticky bottom-0">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="说点啥..."
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors disabled:opacity-50"
            autoFocus
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl text-sm font-medium hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? '...' : '发送'}
          </button>
        </div>
      </footer>
    </div>
  );
}
