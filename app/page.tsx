'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Sparkles, AlertCircle, WifiOff, RefreshCw ,  Plus, Image, Palette , ChevronDown} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CodeBlock } from '@/components/CodeBlock';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  error?: boolean;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
}

type ErrorType = 'network' | 'server' | 'timeout' | null;

export default function ChatPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState('GPT-4o');
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const [localInput, setLocalInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<{ type: ErrorType; message: string } | null>(null);
  const [retryPayload, setRetryPayload] = useState<Message[] | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // استخراج پیام‌های مربوط به سشن فعال برای نمایش در صفحه
  const currentSession = sessions.find(s => s.id === activeSessionId);
  const messages = currentSession ? currentSession.messages : [];

  // ۱. لود کردن کل سشن‌ها از حافظه مرورگر در ابتدای کار
  useEffect(() => {
    setIsMounted(true);
    const savedSessions = localStorage.getItem('chat_sessions');
    if (savedSessions) {
      try {
        const parsed = JSON.parse(savedSessions);
        setSessions(parsed);
        if (parsed.length > 0) {
          setActiveSessionId(parsed[0].id); // فعال کردن اولین چت
        }
      } catch (e) {
        console.error("خطا در بارگذاری سشن‌ها", e);
      }
    }
  }, []);

  // ۲. ذخیره خودکار کل سشن‌ها به محض بروز هر تغییر در استیت سشن‌ها
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem('chat_sessions', JSON.stringify(sessions));
    }
  }, [sessions, isMounted]);

  // اسکرول خودکار به پایین چت
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ایجاد گفتگو (سشن) جدید
  const createNewSession = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'گفتگوی جدید',
      messages: []
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    setError(null);
    setRetryPayload(null);
  };

  // حذف یک چت خاص از لیست تاریخچه
  const deleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // جلوگیری از انتخاب شدن سشن هنگام کلیک روی دکمه حذف
    const updatedSessions = sessions.filter(s => s.id !== sessionId);
    setSessions(updatedSessions);
    
    if (activeSessionId === sessionId) {
      if (updatedSessions.length > 0) {
        setActiveSessionId(updatedSessions[0].id);
      } else {
        setActiveSessionId(null);
      }
    }
  };

  // حذف کل سشن‌ها و پاکسازی حافظه
  const clearChat = () => {
    localStorage.removeItem('chat_sessions');
    setSessions([]);
    setActiveSessionId(null);
    setError(null);
    setRetryPayload(null);
  };

  const sendMessages = async (updatedMessages: Message[], assistantId: string, activeId: string) => {
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
          message: status === 429
            ? 'محدودیت درخواست. لطفاً کمی صبر کنید.'
            : status === 401
            ? 'خطای احراز هویت API'
            : `خطای سرور (${status})`,
        });
      }

      const replyText = await response.text();

      if (replyText) {
  
  let cleanText = replyText;
  
  try {
    
    if (replyText.startsWith('{') || replyText.startsWith('[')) {
      const parsed = JSON.parse(replyText);
      cleanText = parsed.content || parsed.text || parsed.reply || cleanText;
    }
  } catch (e) {
    
  }

  setSessions((prev) =>
    prev.map((s) => s.id === activeId ? {
      ...s,
      messages: s.messages.map((m) => m.id === assistantId ? { ...m, content: cleanText } : m)
    } : s)
  );
} else {
  setSessions((prev) =>
    prev.map((s) => s.id === activeId ? {
      ...s,
      messages: s.messages.map((m) => m.id === assistantId ? { ...m, content: 'پاسخی دریافت نشد.', error: true } : m)
    } : s)
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

      setSessions((prev) =>
        prev.map((s) => s.id === activeId ? {
          ...s,
          messages: s.messages.map((m) => m.id === assistantId ? { ...m, content: errorMsg, error: true } : m)
        } : s)
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

    let currentId = activeSessionId;

    // اگر هیچ سشنی وجود نداشت، ابتدا یک سشن با متن پیام کاربر به عنوان تایتل بساز
    if (!currentId) {
      currentId = Date.now().toString();
      const newSession: ChatSession = {
        id: currentId,
        title: localInput.slice(0, 20) + (localInput.length > 20 ? '...' : ''),
        messages: []
      };
      setSessions([newSession]);
      setActiveSessionId(currentId);
    }

    const userMessageContent = localInput;
    setLocalInput('');

    const newUserMessage: Message = { id: Date.now().toString(), role: 'user', content: userMessageContent };
    
    // پیدا کردن سشن فعلی برای دریافت آرایه پیام‌های قبلی آن
    const targetSession = sessions.find(s => s.id === currentId);
    const updatedMessages = targetSession ? [...targetSession.messages, newUserMessage] : [newUserMessage];

    // به‌روزرسانی پیام کاربر و تغییر تایتل چت (در صورتی که اولین پیام سشن باشد)
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === currentId) {
          const isFirstMessage = s.messages.length === 0;
          return {
            ...s,
            title: isFirstMessage ? userMessageContent.slice(0, 20) + (userMessageContent.length > 20 ? '...' : '') : s.title,
            messages: updatedMessages,
          };
        }
        return s;
      })
    );

    const assistantId = (Date.now() + 1).toString();
    // اضافه کردن پیام خالی بات جهت فعال شدن انیمیشن وضعیت در حال نوشتن (تایپینگ لودینگ)
    setSessions((prev) =>
      prev.map((s) => s.id === currentId ? { ...s, messages: [...updatedMessages, { id: assistantId, role: 'assistant', content: '' }] } : s)
    );

    await sendMessages(updatedMessages, assistantId, currentId);
  };

  const handleRetry = () => {
    if (!retryPayload || !activeSessionId) return;
    setError(null);
    const assistantId = (Date.now() + 1).toString();
    
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === activeSessionId) {
          const withoutLastError = s.messages.filter((m) => !m.error);
          return {
            ...s,
            messages: [...withoutLastError, { id: assistantId, role: 'assistant', content: '' }]
          };
        }
        return s;
      })
    );
    
    sendMessages(retryPayload, assistantId, activeSessionId);
  };

  // جلوگیری از رندر اولیه ناقص در سرور برای حل کامل خطای Mismatch
  if (!isMounted) {
    return <div className="h-screen w-full bg-zinc-950" />;
  }

  return (
    <div className="flex h-screen w-full bg-zinc-950 text-zinc-50" dir="rtl">
      {/* سایدبار تاریخچه و ایجاد مکالمات */}
      <aside className="hidden md:flex flex-col w-64 bg-zinc-900 border-l border-zinc-800 p-4 justify-between">
        <div className="flex flex-col h-full overflow-hidden">
          <div className="flex items-center gap-2 px-2 py-3 border-b border-zinc-800 mb-4">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <h1 className="font-bold text-lg">مکالمات هوشمند</h1>
          </div>
          
          <button
            onClick={createNewSession}
            className="w-full py-2 px-4 mb-4 rounded-xl text-sm font-medium bg-purple-600 hover:bg-purple-500 transition-colors text-center shadow-lg shadow-purple-600/10 shrink-0"
          >
            + گفتگو جدید
          </button>

          {/* لیست تاریخچه چت‌ها با قابلیت جابه‌جایی و حذف */}
          <div className="flex-1 overflow-y-auto space-y-1 pr-1 pl-1">
            {sessions.map((sess) => (
              <div
                key={sess.id}
                onClick={() => setActiveSessionId(sess.id)}
                className={`flex items-center justify-between p-3 rounded-xl cursor-pointer text-sm group transition-all ${
                  sess.id === activeSessionId 
                    ? 'bg-zinc-800 text-zinc-100 font-medium' 
                    : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
                }`}
              >
                <span className="truncate max-w-[140px] text-right">{sess.title}</span>
                <button
                  onClick={(e) => deleteSession(sess.id, e)}
                  className="text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                >
                  حذف
                </button>
              </div>
            ))}
          </div>
        </div>
        
        {/* مدیریت و تنظیمات انتهای سایدبار */}
        <div className="pt-2 border-t border-zinc-800 flex flex-col gap-2 shrink-0">
          {sessions.length > 0 && (
            <button 
              onClick={clearChat}
              className="text-xs text-red-400 hover:text-red-300 transition-colors text-right px-2 py-1"
            >
              حذف کل تاریخچه
            </button>
          )}
          <div className="text-xs text-zinc-500 text-center">Next.js Chatbot v2.5</div>
        </div>
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
          {/* منوی انتخاب مدل هوش مصنوعی */}
<div className="relative">
  <button
    onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
    className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 px-3 py-1.5 rounded-xl text-xs md:text-sm transition-all active:scale-95"
  >
    <span>{selectedModel}</span>
    <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${isModelMenuOpen ? 'rotate-180' : ''}`} />
  </button>

  {isModelMenuOpen && (
    <div className="absolute left-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-xl p-1.5 w-40 shadow-2xl flex flex-col gap-0.5 z-20">
      {['GPT-4o', 'Claude 3.5', 'DeepSeek'].map((model) => (
        <button
          key={model}
          onClick={() => {
            setSelectedModel(model);
            setIsModelMenuOpen(false);
          }}
          className={`w-full px-3 py-2 rounded-lg text-xs md:text-sm text-right transition-colors ${
            selectedModel === model 
              ? 'bg-purple-600/20 text-purple-400 font-medium' 
              : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
          }`}
        >
          {model}
        </button>
      ))}
    </div>
  )}
</div>
        </header>

        {/* نوتیفیکیشن خطای سراسری */}
        {error && (
          <div className="mx-4 mt-3 flex items-center gap-3 bg-red-950/60 border border-red-800/60 text-red-300 rounded-xl px-4 py-3 text-sm">
            {error.type === 'network' ? <WifiOff className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span className="flex-1">{error.message}</span>
            {retryPayload && (
              <button onClick={handleRetry} className="flex items-center gap-1 text-xs bg-red-800/50 hover:bg-red-700/50 px-2.5 py-1.5 rounded-lg transition-colors">
                <RefreshCw className="w-3.5 h-3.5" />
                تلاش مجدد
              </button>
            )}
          </div>
        )}

        {/* لیست پیام‌ها */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 max-w-4xl w-full mx-auto no-scrollbar">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
              <div className="w-16 h-16 rounded-2xl bg-purple-900/30 border border-purple-700/30 flex items-center justify-center">
                <Bot className="w-8 h-8 text-purple-400" />
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-zinc-300">چطور می‌تونم کمکتون کنم دوست من؟</p>
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
                        /* انیمیشن لودینگ سه نقطه در حال تایپ */
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

        
        {/* فوتر ورودی متن پیام */}
        <footer className="p-4 md:p-6 bg-gradient-to-t from-zinc-950 via-zinc-950/95 to-transparent sticky bottom-0">
          <form onSubmit={handleSendMessage} className="max-w-4xl w-full mx-auto relative flex items-center">
            <div className="relative flex-1 flex items-center bg-zinc-900 border border-zinc-800 focus-within:border-purple-500 focus-within:ring-1 focus-within:ring-purple-500/50 rounded-2xl transition-all">
              
              {/* دکمه پلاس و منوی بازشونده (سمت راست داخل باکس) */}
              <div className="relative flex items-center pr-2 z-20">
                <button
                  type="button"
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-all active:scale-95"
                >
                  <Plus className={`w-5 h-5 transition-transform ${isMenuOpen ? 'rotate-45 text-purple-400' : ''}`} />
                </button>

                {/* منوی گزینه‌ها */}
                {isMenuOpen && (
                  <div className="absolute bottom-14 right-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-2 w-48 shadow-2xl flex flex-col gap-1 animate-in fade-in slide-in-from-bottom-2 duration-150">
                    <button
                      type="button"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm text-zinc-300 hover:bg-zinc-800/80 hover:text-white transition-colors text-right"
                    >
                      <Image className="w-4 h-4 text-blue-400" />
                      <span>آپلود تصویر</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm text-zinc-300 hover:bg-zinc-800/80 hover:text-white transition-colors text-right"
                    >
                      <Palette className="w-4 h-4 text-emerald-400" />
                      <span>تولید تصویر (DALL-E)</span>
                    </button>
                  </div>
                )}
              </div>

              {/* اینپوت چت */}
              <input
                value={localInput}
                onChange={(e) => setLocalInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e as any); } }}
                placeholder="پیام خود را بنویسید..."
                disabled={isLoading}
                className="w-full bg-transparent pl-14 pr-2 py-3.5 text-sm md:text-base outline-none text-zinc-100 placeholder-zinc-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />

              {/* دکمه ارسال (سمت چپ داخل باکس) */}
              <div className="absolute left-2 top-1/2 -translate-y-1/2 z-20">
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