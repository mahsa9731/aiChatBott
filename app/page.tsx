'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Sparkles, AlertCircle, WifiOff, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CodeBlock } from '@/components/CodeBlock';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  error?: boolean;
}

type ErrorType = 'network' | 'server' | 'timeout' | null;

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [localInput, setLocalInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<{ type: ErrorType; message: string } | null>(null);
  const [retryPayload, setRetryPayload] = useState<Message[] | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessages = async (updatedMessages: Message[], assistantId: string) => {
    setError(null);
    setIsLoading(true);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const status = response.status;
        throw Object.assign(new Error('server'), {
          type: status >= 500 ? 'server' : 'server',
          message: status === 429
            ? 'محدودیت درخواست. لطفاً کمی صبر کنید.'
            : status === 401
            ? 'خطای احراز هویت API'
            : `خطای سرور (${status})`,
        });
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let hasContent = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter((l) => l.startsWith('data: '));

        for (const line of lines) {
          const data = line.slice(6);
          if (data === '[DONE]') break;
          try {
            const delta = JSON.parse(data).choices?.[0]?.delta?.content;
            if (delta) {
              hasContent = true;
              setMessages((prev) =>
                prev.map((m) => m.id === assistantId ? { ...m, content: m.content + delta } : m)
              );
            }
          } catch {}
        }
      }

      if (!hasContent) {
        setMessages((prev) =>
          prev.map((m) => m.id === assistantId ? { ...m, content: 'پاسخی دریافت نشد.', error: true } : m)
        );
      }

      setRetryPayload(null);
    } catch (err: any) {
      const isAbort = err.name === 'AbortError';
      const errorType: ErrorType = isAbort ? 'timeout' : !navigator.onLine ? 'network' : 'server';
      const errorMsg = isAbort
        ? 'زمان انتظار تمام شد. لطفاً دوباره تلاش کنید.'
        : !navigator.onLine
        ? 'اتصال اینترنت قطع است.'
        : err.message || 'خطا در اتصال به سرور.';

      setMessages((prev) =>
        prev.map((m) => m.id === assistantId ? { ...m, content: errorMsg, error: true } : m)
      );
      setError({ type: errorType, message: errorMsg });
      setRetryPayload(updatedMessages);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localInput.trim() || isLoading) return;

    const userMessageContent = localInput;
    setLocalInput('');

    const newUserMessage: Message = { id: Date.now().toString(), role: 'user', content: userMessageContent };
    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);

    const assistantId = (Date.now() + 1).toString();
    setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

    await sendMessages(updatedMessages, assistantId);
  };

  const handleRetry = () => {
    if (!retryPayload) return;
    setError(null);
    const assistantId = (Date.now() + 1).toString();
    setMessages((prev) => {
      const withoutLastError = prev.filter((m) => !m.error);
      return [...withoutLastError, { id: assistantId, role: 'assistant', content: '' }];
    });
    sendMessages(retryPayload, assistantId);
  };

  return (
    <div className="flex h-screen w-full bg-zinc-950 text-zinc-50" dir="rtl">
      {/* سایدبار */}
      <aside className="hidden md:flex flex-col w-64 bg-zinc-900 border-l border-zinc-800 p-4 justify-between">
        <div>
          <div className="flex items-center gap-2 px-2 py-3 border-b border-zinc-800 mb-4">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <h1 className="font-bold text-lg">مکالمات هوشمند</h1>
          </div>
          <button
            onClick={() => { setMessages([]); setError(null); setRetryPayload(null); }}
            className="w-full py-2 px-4 rounded-xl text-sm font-medium bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 transition-colors text-right"
          >
            + گفتگو جدید
          </button>
        </div>
        <div className="text-xs text-zinc-500 text-center">Next.js Chatbot v2.0</div>
      </aside>

      <main className="flex-1 flex flex-col h-full relative overflow-hidden">
        {/* هدر */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                <Bot className="w-5 h-5 text-white" />
              </div>
              {isLoading && (
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-amber-400 border-2 border-zinc-950 animate-pulse" />
              )}
              {!isLoading && !error && (
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-zinc-950" />
              )}
              {error && (
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-red-500 border-2 border-zinc-950" />
              )}
            </div>
            <div>
              <h2 className="font-semibold text-sm md:text-base">دستیار هوشمند AI</h2>
              <p className={`text-xs flex items-center gap-1.5 ${isLoading ? 'text-amber-400' : error ? 'text-red-400' : 'text-emerald-400'}`}>
                {isLoading ? 'در حال نوشتن...' : error ? 'خطا در اتصال' : 'آماده پاسخگویی'}
              </p>
            </div>
          </div>
        </header>

        {/* نوتیفیکیشن خطای سراسری */}
        {error && (
          <div className="mx-4 mt-3 flex items-center gap-3 bg-red-950/60 border border-red-800/60 text-red-300 rounded-xl px-4 py-3 text-sm">
            {error.type === 'network' ? <WifiOff className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span className="flex-1">{error.message}</span>{retryPayload && (
              <button onClick={handleRetry} className="flex items-center gap-1 text-xs bg-red-800/50 hover:bg-red-700/50 px-2.5 py-1.5 rounded-lg transition-colors">
                <RefreshCw className="w-3.5 h-3.5" />
                تلاش مجدد
              </button>
            )}
          </div>
        )}

        {/* لیست پیام‌ها */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 max-w-4xl w-full mx-auto">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
              <div className="w-16 h-16 rounded-2xl bg-purple-900/30 border border-purple-700/30 flex items-center justify-center">
                <Bot className="w-8 h-8 text-purple-400" />
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-zinc-300">چطور می‌تونم کمکتون کنم؟</p>
                <p className="text-sm text-zinc-500">سوالتون رو بپرسید...</p>
              </div>
            </div>
          ) : (
            messages.map((message) => {
              const isUser = message.role === 'user';
              const isEmpty = !message.content && !isUser;

              return (
                <div key={message.id} className={`flex gap-3 w-full ${isUser ? 'justify-start flex-row-reverse' : 'justify-start'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 ${
                    isUser ? 'bg-zinc-800 text-zinc-300' : message.error ? 'bg-red-900/50 text-red-400 border border-red-700/50' : 'bg-purple-900/50 text-purple-300 border border-purple-700/50'
                  }`}>
                    {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>

                  <div className="flex flex-col max-w-[80%] md:max-w-[75%] space-y-1">
                    <div className={`text-xs text-zinc-500 ${isUser ? 'text-left' : 'text-right'}`}>
                      {isUser ? 'شما' : 'هوش مصنوعی'}
                    </div>

                    <div className={`px-4 py-3 rounded-2xl text-sm md:text-base leading-relaxed break-words shadow-sm ${
                      isUser
                        ? 'bg-purple-600 text-white rounded-tl-none'
                        : message.error
                        ? 'bg-red-950/50 text-red-300 border border-red-800/50 rounded-tr-none'
                        : 'bg-zinc-900 text-zinc-100 border border-zinc-800 rounded-tr-none'
                    }`}>
                      {isEmpty ? (
                        /* لودینگ تایپینگ */
                        <div className="flex items-center gap-1.5 py-1">
                          <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce [animation-delay:0ms]" />
                          <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce [animation-delay:150ms]" />
                          <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce [animation-delay:300ms]" />
                        </div>
                      ) : isUser ? (
                        message.content
                      ) : (
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            code({ className, children, ...props }: any) {
                              const match = /language-(\w+)/.exec(className || '');
                              return !className?.includes('language-') ? (
                                <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-purple-300 font-mono text-sm" {...props}>
                                  {children}
                                </code>
                              ) : (
                                <CodeBlock language={match?.[1] || 'text'} value={String(children).replace(/\n$/, '')} />
                              );
                            },
                            p: ({ children }) => <p className="mb-2 last:mb-0 text-zinc-100 leading-7">{children}</p>,
                            ul: ({ children }) => <ul className="list-disc list-inside space-y-1 my-2 pr-4">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 my-2 pr-4">{children}</ol>,
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* فوتر ورودی */}
        <footer className="p-4 md:p-6 bg-gradient-to-t from-zinc-950 via-zinc-950/95 to-transparent sticky bottom-0">
          <form onSubmit={handleSendMessage} className="max-w-4xl w-full mx-auto relative flex items-center gap-2">
            <div className="relative flex-1">
              <input
                value={localInput}
                onChange={(e) => setLocalInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e as any); } }}
                placeholder="پیام خود را بنویسید..."
                disabled={isLoading}
                className="w-full bg-zinc-900 border border-zinc-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 rounded-2xl pl-14 pr-4 py-3.5 text-sm md:text-base outline-none transition-all text-zinc-100 placeholder-zinc-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <div className="absolute left-2 top-1/2 -translate-y-1/2">
                <button
                  type="submit"
                  disabled={isLoading || !localInput.trim()}
                  className="bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-700 text-white rounded-xl w-9 h-9 md:w-10 md:h-10 transition-all flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                >
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 transform rotate-180" />
                  )}
                </button>
              </div>
            </div>
          </form>
          <p className="text-center text-xs text-zinc-600 mt-2">
            {isLoading ? 'در حال پردازش...' : 'Enter برای ارسال'}
          </p>
        </footer>
      </main>
    </div>
  );
}
