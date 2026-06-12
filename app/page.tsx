'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CodeBlock } from '@/components/CodeBlock';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [localInput, setLocalInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // اسکرول خودکار به انتهای صفحه با اضافه شدن پیام جدید
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // تابع ارسال مستقیم درخواست به بک‌آند و دریافت پاسخ یکجا
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localInput.trim() || isLoading) return;

    const userMessageContent = localInput;
    setLocalInput('');
    setIsLoading(true);

    // ۱. اضافه کردن پیام کاربر به استیت صفحه
    const newUserMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessageContent,
    };
    
    setMessages(prev => [...prev, newUserMessage]);

    try {
      // ۲. ارسال درخواست POST به روت API بک‌آند
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: [...messages, newUserMessage].map(m => ({ role: m.role, content: m.content })) 
        }),
      });

      if (!response.ok) throw new Error('خطا در دریافت پاسخ از سرور');

      // ۳. دریافت پاسخ متنی تمیز و مستقیم از بک‌آند
      const cleanText = await response.text();

      // ۴. اضافه کردن پاسخ هوش مصنوعی به لیست چت
      setMessages(prev => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: 'assistant', content: cleanText }
      ]);

    } catch (error) {
      console.error('Chat Error:', error);
      setMessages(prev => [
        ...prev,
        { id: Date.now().toString(), role: 'assistant', content: '❌ متأسفانه خطایی در اتصال به سرور یا دریافت پاسخ رخ داد.' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-zinc-950 text-zinc-50" dir="rtl">
      
      {/* سایدبار دسکتاپ */}
      <aside className="hidden md:flex flex-col w-64 bg-zinc-900 border-l border-zinc-800 p-4 justify-between">
        <div>
          <div className="flex items-center gap-2 px-2 py-3 border-b border-zinc-800 mb-4">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <h1 className="font-bold text-lg">مکالمات هوشمند</h1>
          </div>
          <button 
            onClick={() => setMessages([])} 
            title="شروع گفتگو جدید"
            className="w-full py-2 px-4 rounded-xl text-sm font-medium bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 transition-colors text-right"
          >
            + گفتگو جدید
          </button>
        </div>
        <div className="text-xs text-zinc-500 text-center">Next.js Chatbot v2.0</div>
      </aside>

      {/* بخش اصلی باکس چت */}
      <main className="flex-1 flex flex-col h-full relative">
        
        <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-sm md:text-base">دستیار هوشمند AI (Gemini)</h2>
              <p className="text-xs text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                {isLoading ? 'در حال نوشتن...' : 'آماده پاسخگویی'}
              </p>
            </div>
          </div>
        </header>

        {/* لیست نمایش پیام‌ها */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 max-w-4xl w-full mx-auto">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-60">
              <Bot className="w-12 h-12 text-zinc-600 animate-bounce" />
              <p className="text-sm md:text-base font-medium">چطور می‌تونم کمکتون کنم؟ سوالتون رو بپرسید...</p>
            </div>
          ) : (
            messages.map((message) => {
              const isUser = message.role === 'user';
              return (
                <div key={message.id} className={`flex gap-4 w-full ${isUser ? 'justify-start flex-row-reverse' : 'justify-start'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    isUser ? 'bg-zinc-800 text-zinc-300' : 'bg-purple-900/50 text-purple-300 border border-purple-700/50'
                  }`}>
                    {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>

                  <div className="flex flex-col max-w-[80%] md:max-w-[75%] space-y-1">
                    <div className={`text-xs text-zinc-500 ${isUser ? 'text-left' : 'text-right'}`}>
                      {isUser ? 'شما' : 'هوش مصنوعی'}
                    </div>
                    <div className={`px-4 py-3 rounded-2xl text-sm md:text-base leading-relaxed break-words shadow-sm ${
                      isUser ? 'bg-purple-600 text-white rounded-tl-none' : 'bg-zinc-900 text-zinc-100 border border-zinc-800 rounded-tr-none'
                    }`}>
                      {isUser ? (
                        message.content
                      ) : (
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            code({ className, children, ...props }: any) {
                              const match = /language-(\w+)/.exec(className || '');
                              const isInline = !className;
                              
                              return !isInline && match ? (
                                <CodeBlock language={match[1]} value={String(children).replace(/\n$/, '')} />
                              ) : (
                                <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-purple-300 font-mono text-sm" {...props}>
                                  {children}
                                </code>
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

        {/* باکس ورودی متن فرم */}
        <footer className="p-4 md:p-6 bg-gradient-to-t from-zinc-950 via-zinc-950 to-transparent sticky bottom-0">
          <form onSubmit={handleSendMessage} className="max-w-4xl w-full mx-auto relative flex items-center">
            <input
              value={localInput}
              onChange={(e) => setLocalInput(e.target.value)}
              placeholder="پیام خود را بنویسید..."
              disabled={isLoading}
              className="w-full bg-zinc-900 border border-zinc-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-2xl pl-14 pr-4 py-3.5 md:py-4 text-sm md:text-base outline-none transition-all text-zinc-100 placeholder-zinc-500 disabled:opacity-50"
            />
            <div className="absolute left-2.5">
              <button 
                type="submit"
                disabled={isLoading || !localInput.trim()}
                title="ارسال پیام"
                aria-label="ارسال پیام"
                className="bg-purple-600 hover:bg-purple-500 text-white rounded-xl w-9 h-9 md:w-10 md:h-10 transition-colors flex items-center justify-center disabled:opacity-50"
              >
                <Send className="w-4 h-4 transform rotate-180" />
              </button>
            </div>
          </form>
        </footer>

      </main>
    </div>
  );
}