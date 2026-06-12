import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  if (!process.env.METIS_API_KEY) {
    return new Response('METIS_API_KEY is not configured', { status: 500 });
  }

  const { messages } = await req.json();

  const upstream = await fetch(
    'https://api.metisai.ir/deepseek/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.METIS_API_KEY}`,
      },
      body: JSON.stringify({ model: 'deepseek-chat', messages, stream: true }),
    },
  );

  if (!upstream.ok) {
    const err = await upstream.text();
    return new Response(err, { status: upstream.status });
  }

  return new Response(upstream.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
