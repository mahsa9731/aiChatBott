'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

interface CodeBlockProps {
  language: string;
  value: string;
}

export function CodeBlock({ language, value }: CodeBlockProps) {
  const [isCopied, setIsCopied] = useState(false);

  const copyToClipboard = async () => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="relative my-4 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 font-mono text-sm" dir="ltr">
      {/* هدر بالای باکس کد */}
      <div className="flex items-center justify-between bg-zinc-950 px-4 py-1.5 text-xs text-zinc-400 border-b border-zinc-800">
        <span>{language || 'code'}</span>
        <button onClick={copyToClipboard} className="flex items-center gap-1 hover:text-zinc-200 transition-colors">
          {isCopied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-emerald-400">کپی شد!</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>کپی کد</span>
            </>
          )}
        </button>
      </div>
      {/* متن کد */}
      <div className="p-4 overflow-x-auto text-zinc-100">
        <pre><code>{value}</code></pre>
      </div>
    </div>
  );
}