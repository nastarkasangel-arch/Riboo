// ============================================================================
// api/generateTextOpenRouter.js
// The ONLY server-side function this app calls. Deploy it to Vercel next to
// index.html (in an /api folder at the project root — Vercel auto-detects
// this as a Serverless/Edge Function, no extra config needed).
//
// It receives the exact OpenAI/OpenRouter-style body the front-end builds
// (model, messages[], stream, temperature, top_p, max_tokens, modalities),
// attaches the real API key from Vercel's Environment Variables, and pipes
// the OpenRouter response straight back — including token-by-token SSE
// streaming when `stream: true`.
//
// Setup on Vercel (do this once per project):
//   1. Project → Settings → Environment Variables
//   2. Add OPENROUTER_API_KEY = <your key from https://openrouter.ai/keys>
//   3. Apply it to Production (and Preview/Development if you use them)
//   4. Redeploy
//
// The browser NEVER sees this key — only this function reads it, and only
// on the server. That's what keeps it safe from dev-tools inspection.
// ============================================================================

export const config = { runtime: 'edge' };

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

function jsonError(message, status) {
  return new Response(
    JSON.stringify({ error: { message, code: status } }),
    { status, headers: { 'Content-Type': 'application/json' } }
  );
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    // Same-origin only in normal use, but this keeps preflight harmless.
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  if (req.method !== 'POST') {
    return jsonError('Method not allowed — use POST.', 405);
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    // This is the #1 cause of a broken deploy: the key was never added to
    // Vercel's Environment Variables (or the project wasn't redeployed
    // after adding it).
    return jsonError(
      'OPENROUTER_API_KEY غير مضبوط على الخادم. أضِفه في Vercel → Settings → Environment Variables ثم أعِد النشر (Redeploy).',
      500
    );
  }

  let body;
  try {
    body = await req.json();
  } catch (e) {
    return jsonError('طلب غير صالح: الجسم ليس JSON سليماً.', 400);
  }

  if (!body || typeof body.model !== 'string' || !Array.isArray(body.messages)) {
    return jsonError('الطلب يجب أن يحتوي على model (نص) و messages (مصفوفة).', 400);
  }

  // Only forward the fields OpenRouter's chat/completions endpoint expects.
  // Keeps the upstream call predictable regardless of what the client sends.
  const payload = {
    model: body.model,
    messages: body.messages,
    stream: !!body.stream
  };
  if (typeof body.temperature === 'number') payload.temperature = body.temperature;
  if (typeof body.top_p === 'number') payload.top_p = body.top_p;
  if (typeof body.max_tokens === 'number') payload.max_tokens = body.max_tokens;
  if (Array.isArray(body.modalities)) payload.modalities = body.modalities;

  let upstream;
  try {
    upstream = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey,
        // Optional but recommended by OpenRouter for analytics/rate-limit context.
        'HTTP-Referer': req.headers.get('origin') || 'https://vercel.app',
        'X-Title': 'abdelrezakbezzag AI Workspace'
      },
      body: JSON.stringify(payload)
    });
  } catch (e) {
    return jsonError('تعذّر الوصول إلى OpenRouter (مشكلة شبكة على الخادم). حاول مجدداً.', 502);
  }

  // Non-streaming error responses: relay OpenRouter's own JSON error as-is
  // so the front-end's existing error-parsing logic keeps working unchanged.
  if (!upstream.ok && !payload.stream) {
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { 'Content-Type': upstream.headers.get('Content-Type') || 'application/json' }
    });
  }

  // Success (streaming or not) and streaming errors: pipe the body straight
  // through. For `stream: true` this forwards OpenRouter's SSE chunks live,
  // which is what lets the front-end render the reply token-by-token.
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      'Content-Type': upstream.headers.get('Content-Type') || 'application/json',
      'Cache-Control': 'no-cache'
    }
  });
}
