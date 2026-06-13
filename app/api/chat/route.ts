import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    // اتصال مستقیم به اولاما روی سیستم خودت
    const response = await fetch("http://localhost:11434/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "qwen2.5:1.5b",
        messages: messages,
        stream: true, 
      }),
    });

    // بررسی اینکه آیا اولاما با موفقیت پاسخ داده یا خیر
    if (!response.ok) {
      return new NextResponse(`Ollama error: ${response.statusText}`, { status: response.status });
    }

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) return;

        const decoder = new TextDecoder();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (!line.trim()) continue;
              
              // پارس کردن خطوط JSON اولاما
              const json = JSON.parse(line);
              if (json.message?.content) {
                // ارسال تک تک کلمات به فرانت‌اند
                controller.enqueue(new TextEncoder().encode(json.message.content));
              }
            }
          }
        } catch (e) {
          console.error("Streaming error:", e);
        } finally {
          controller.close(); 
        }
      },
    });

   
    return new Response(stream, {
      headers: { 
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
      },
    });

  } catch (error) {
    console.error("Fetch error:", error);
    return new NextResponse("خطا در اتصال به اولاما. مطمئن شوید Ollama اجرا شده است.", { status: 500 });
  }
}