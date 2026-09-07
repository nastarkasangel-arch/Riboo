// api/generateTextOpenRouter.js
// The ONLY AI backend function this app calls. Deploy as a Vercel
// serverless function at this exact path. Reads OPENROUTER_API_KEY from
// Vercel's Environment Variables — never hardcode a key here or anywhere
// else in this file; a key committed to a repo (public or private) must be
// treated as already leaked and revoked.
//
// Handles three shapes of the same underlying call, all sent by the client
// as a JSON POST body:
//   - { model, messages, stream: false }                 -> plain chat reply
//   - { model, messages, stream: true }                  -> streamed (SSE) reply
//   - { model, messages, modalities: ['image','text'] }  -> image generation
//
// This one function is intentionally kept thin: it forwards the body almost
// as-is to OpenRouter's OpenAI-compatible endpoint and streams the response
// straight back, so the client's expectations (OpenAI-style `choices[0]`
// shape) match what OpenRouter actually returns.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: { message: 'Method not allowed' } });
    return;
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: { message: 'OPENROUTER_API_KEY غير مضبوط على الخادم (Vercel → Project Settings → Environment Variables).' } });
    return;
  }

  const { model, messages, stream, modalities, temperature, top_p, max_tokens } = req.body || {};
  if (!model || !Array.isArray(messages)) {
    res.status(400).json({ error: { message: 'الطلب ناقص: model و messages مطلوبان.' } });
    return;
  }

  const upstreamBody = {
    model,
    messages,
    stream: !!stream,
    ...(modalities ? { modalities } : {}),
    ...(temperature !== undefined ? { temperature } : {}),
    ...(top_p !== undefined ? { top_p } : {}),
    ...(max_tokens !== undefined ? { max_tokens } : {})
  };

  let upstream;
  try {
    upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        // Optional but recommended by OpenRouter for analytics/rate-limit
        // attribution — replace with your real deployed domain and app name.
        'HTTP-Referer': process.env.PUBLIC_SITE_URL || 'https://example.com',
        'X-Title': 'abdelrezakbezzag'
      },
      body: JSON.stringify(upstreamBody)
    });
  } catch (err) {
    res.status(502).json({ error: { message: 'تعذّر الوصول إلى OpenRouter: ' + err.message } });
    return;
  }

  if (!upstream.ok) {
    let message = `خطأ من OpenRouter (رمز ${upstream.status})`;
    try {
      const errBody = await upstream.json();
      if (errBody && errBody.error && errBody.error.message) message = errBody.error.message;
    } catch (e) { /* not JSON */ }
    res.status(upstream.status).json({ error: { message } });
    return;
  }

  if (stream) {
    // Pipe the SSE stream straight through, unmodified — the client already
    // parses OpenAI-style "data: {...}" lines.
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    const reader = upstream.body.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
    } finally {
      res.end();
    }
    return;
  }

  const data = await upstream.json();
  res.status(200).json(data);
}

export const config = {
  api: { bodyParser: { sizeLimit: '15mb' } } // room for base64 image/PDF attachments
};
