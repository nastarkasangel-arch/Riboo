// api/generateImage.js
// ---------------------------------------------------------------------------
// Image generation endpoint for the abdelrezakbezzag AI Workspace.
//
// Uses Pollinations.ai — a free image-generation API that needs NO API key
// and NO account. Good default while you don't have a paid image provider
// (Imagen, DALL-E, etc.) wired up yet.
//
// Contract (matches what the client in index.html already expects):
//   Request body:  { modelId, instances: [ { prompt } ], parameters: { sampleCount } }
//   Success (200): { predictions: [ { bytesBase64Encoded: "<base64 png/jpg>" } ] }
//   Failure:       { error: { message } } with a matching HTTP status.
//
// Setup: none required. This file works as soon as it's deployed — no
// environment variable, no signup. If you later get a paid image API key
// (Imagen, Stability, etc.), you can add it as its own tier the same way
// generateTextFallback.js / generateTextOpenRouter.js were added for text.
// ---------------------------------------------------------------------------

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        res.status(405).json({ error: { message: 'الطريقة غير مسموحة، استخدم POST فقط.' } });
        return;
    }

    try {
        const { instances } = req.body || {};
        const prompt = instances && instances[0] && instances[0].prompt;
        if (!prompt || !prompt.trim()) {
            res.status(400).json({ error: { message: 'لا يوجد وصف (prompt) صالح لتوليد الصورة.' } });
            return;
        }

        // Pollinations takes the prompt straight in the URL path, plus a
        // random `seed` so repeated identical prompts don't just hit a
        // cached identical image every time.
        const seed = Math.floor(Math.random() * 1_000_000_000);
        const url = 'https://image.pollinations.ai/prompt/' + encodeURIComponent(prompt.trim())
            + '?width=1024&height=1024&nologo=true&seed=' + seed;

        const upstream = await fetch(url);
        if (!upstream.ok) {
            res.status(upstream.status >= 400 ? upstream.status : 502).json({
                error: { message: 'تعذّر توليد الصورة عبر Pollinations (رمز ' + upstream.status + ')' }
            });
            return;
        }

        const arrayBuffer = await upstream.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');

        // Re-shape into the same Imagen-like envelope the client already parses.
        res.status(200).json({
            predictions: [{ bytesBase64Encoded: base64 }]
        });
    } catch (error) {
        console.error('[api/generateImage] unexpected error:', error);
        res.status(500).json({ error: { message: 'خطأ غير متوقع أثناء توليد الصورة: ' + error.message } });
    }
};
