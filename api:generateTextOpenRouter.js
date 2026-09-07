// api/generateTextOpenRouter.js
// ---------------------------------------------------------------------------
// Fourth-tier text provider for the abdelrezakbezzag AI Workspace.
//
// Chain: Gemini (api/generateText.js) -> DeepSeek (api/generateTextFallback.js)
//        -> DeepAI (api/generateTextDeepAI.js) -> OpenRouter (this file).
//
// SECURITY: the OpenRouter key lives ONLY in this server-side function, read
// from the OPENROUTER_API_KEY environment variable in Vercel's Project
// Settings -> Environment Variables. It is never sent to, or embedded in,
// the browser.
//
// ⚠️ If a key was ever pasted directly into client-side JavaScript (as in
// "const apiKey = 'sk-or-v1-...'" inside a browser-run function), treat that
// key as compromised the moment it's written down anywhere outside a server
// environment variable — including in a chat message, a shared file, or a
// public repo. Revoke it at https://openrouter.ai/settings/keys and generate
// a new one, then set ONLY the new key below via Vercel's dashboard.
//
// Setup:
//   1. Get a key at https://openrouter.ai/settings/keys.
//   2. In Vercel: Project Settings -> Environment Variables -> add
//      OPENROUTER_API_KEY = <your key> -> redeploy.
//   3. (Optional) change OPENROUTER_MODEL below or via an
//      OPENROUTER_MODEL environment variable to use a different model.
//   4. That's it — the client already calls /api/generateTextOpenRouter
//      automatically as the last resort in the fallback chain.
//
// Contract (kept identical to the other tiers so the client's response
// parsing works unchanged):
//   Request body:  { contents, systemInstruction, generationConfig }
//                  (Gemini's chat-history shape — see ChatManager._buildTextContents)
//   Success (200): { candidates: [ { content: { parts: [ { text } ] } } ] }
//   Failure:       { error: { message, code } } with a matching HTTP status.
// ---------------------------------------------------------------------------

// NOTE (updated): OpenRouter discontinued the free tier for ALL DeepSeek
// models — 'deepseek/deepseek-chat:free' no longer exists; only the paid
// 'deepseek/deepseek-chat' does, which requires OpenRouter account credits.
// 'openrouter/free' is OpenRouter's own router that always picks a
// currently-free model for you, so this line doesn't go stale again when
// a specific free model gets discontinued.
const DEFAULT_MODEL = 'openrouter/free';

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        res.status(405).json({ error: { message: 'الطريقة غير مسموحة، استخدم POST فقط.' } });
        return;
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        res.status(500).json({
            error: { message: 'OPENROUTER_API_KEY غير مهيأ في متغيرات البيئة على Vercel. أضِفه في Project Settings ثم أعد النشر.' }
        });
        return;
    }

    try {
        const { contents, systemInstruction } = req.body || {};
        const messages = buildMessages(contents, systemInstruction);
        if (!messages.length) {
            res.status(400).json({ error: { message: 'لا توجد رسالة صالحة لإرسالها.' } });
            return;
        }

        const model = process.env.OPENROUTER_MODEL || DEFAULT_MODEL;

        const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + apiKey,
                'Content-Type': 'application/json',
                // OpenRouter asks for these two headers to attribute usage;
                // update the referer if you deploy this under a different domain.
                'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'https://your-app.vercel.app',
                'X-Title': process.env.OPENROUTER_SITE_NAME || 'abdelrezakbezzag AI Workspace'
            },
            body: JSON.stringify({ model, messages })
        });

        if (!upstream.ok) {
            const status = upstream.status;
            let message = 'تعذّر الاتصال بـ OpenRouter (رمز ' + status + ')';
            try {
                const errJson = await upstream.json();
                if (errJson && errJson.error && errJson.error.message) message = errJson.error.message;
            } catch (e) { /* body wasn't JSON */ }
            res.status(status >= 400 ? status : 502).json({ error: { message, code: status } });
            return;
        }

        const data = await upstream.json();
        const text = data && data.choices && data.choices[0] && data.choices[0].message
            ? data.choices[0].message.content
            : '';
        if (!text) {
            res.status(502).json({ error: { message: 'لم يُرجع OpenRouter أي نص صالح.' } });
            return;
        }

        // Re-shape into the same Gemini-like envelope the client already parses.
        res.status(200).json({
            candidates: [{ content: { parts: [{ text }] } }]
        });
    } catch (error) {
        console.error('[api/generateTextOpenRouter] unexpected error:', error);
        res.status(500).json({ error: { message: 'خطأ غير متوقع في خادم OpenRouter: ' + error.message } });
    }
};

// OpenRouter speaks the OpenAI chat-completions message shape ({role, content}
// strings), not Gemini's {role, parts:[{text}]} shape. Convert between them,
// folding the system instruction in as a leading "system" message.
function buildMessages(contents, systemInstruction) {
    const messages = [];
    const sys = systemInstruction && systemInstruction.parts
        ? systemInstruction.parts.map((p) => p.text || '').join(' ').trim()
        : '';
    if (sys) messages.push({ role: 'system', content: sys });

    if (Array.isArray(contents)) {
        contents.forEach((turn) => {
            const text = (turn.parts || [])
                .map((p) => (typeof p.text === 'string' ? p.text : ''))
                .filter(Boolean)
                .join(' ')
                .trim();
            if (!text) return; // images/files aren't supported by this text-only fallback
            messages.push({ role: turn.role === 'user' ? 'user' : 'assistant', content: text });
        });
    }
    return messages;
}
