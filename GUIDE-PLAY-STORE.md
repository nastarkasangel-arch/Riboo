# الدليل الكامل: النشر → Google Play (TWA) → Uptodown

## 1. رفع الملفات على Vercel

بنية المجلد يجب أن تكون هكذا بالضبط:

```
/index.html                          (الملف الرئيسي المعدَّل)
/manifest.webmanifest
/sw.js
/privacy.html
/vercel.json
/icons/icon-72.png
/icons/icon-96.png
/icons/icon-128.png
/icons/icon-144.png
/icons/icon-152.png
/icons/icon-180.png
/icons/icon-192.png
/icons/icon-192-maskable.png
/icons/icon-512.png
/icons/icon-512-maskable.png
/api/generateTextOpenRouter.js
```

خطوات:
1. أنشئ مجلد `icons/` وضع فيه كل ملفات `icon-*.png` المرفقة.
2. تأكد أن `api/generateTextOpenRouter.js` موجود فعلاً بهذا المسار (Vercel يكتشف أي ملف داخل `api/` كـ Serverless Function تلقائياً).
3. فـ Vercel Project Settings → Environment Variables، أضف:
   - `OPENROUTER_API_KEY` = مفتاحك من https://openrouter.ai/keys
   - (اختياري) `PUBLIC_SITE_URL` = رابط موقعك بعد النشر (مثلاً `https://yourapp.vercel.app`)
4. اعمل Deploy / Redeploy.
5. افتح الموقع، تأكد أن الدردشة تشتغل، وأن `https://yourapp.vercel.app/manifest.webmanifest` يفتح كملف JSON صحيح (ماشي 404).
6. افتح `https://yourapp.vercel.app/privacy.html` وعدّل فيه بريد/قناة تواصل حقيقية قبل ما تكمّل.

**هام:** بدّل عنوان `privacy.html` من placeholder إلى معلومات تواصل حقيقية — Google Play يرفض التطبيق إذا كانت سياسة الخصوصية فارغة أو غير جدّية.

## 2. تحويل الموقع إلى تطبيق Android (TWA) عبر Bubblewrap

هذه الخطوات تُنفَّذ على الكمبيوتر ديالك (ماشي هنا فـ المحادثة)، وتحتاج Node.js مثبّت.

```bash
npm install -g @bubblewrap/cli
bubblewrap init --manifest https://yourapp.vercel.app/manifest.webmanifest
```

الأداة غادي تسولك:
- Application ID (مثلاً `com.abdelrezakbezzag.app`)
- اسم التطبيق، الألوان (غادي تجيب أغلبها تلقائياً من المانيفست)

بعدها:
```bash
bubblewrap build
```

هذا كيعطيك ملفين:
- `app-release-signed.apk` — للتجربة المباشرة أو Uptodown
- `app-release-bundle.aab` — هذا لي كيتقبل فـ Google Play

⚠️ Bubblewrap كيولّد مفتاح توقيع (`android.keystore`) — احتفظ بيه فمكان آمن، إلا ضاع ما تقدرش تحدّث التطبيق فـ Play Console مستقبلاً بنفس Application ID.

## 3. ربط التطبيق بالموقع (Digital Asset Links)

باش Android يفهم أن التطبيق هو "نفس" الموقع (ويخبي شريط عنوان المتصفح)، خاصك:

1. بعد `bubblewrap build`، الأداة كتولّد ملف `assetlinks.json`.
2. حطّو فـ الموقع على المسار بالضبط: `https://yourapp.vercel.app/.well-known/assetlinks.json`
3. تأكد أن `vercel.json` المرفق يحتوي على قاعدة الـ Content-Type ديال هذا المسار (موجودة أصلاً فالملف لي جهّزتلك).

## 4. حساب Google Play Developer

- سجّل فـ https://play.google.com/console (رسم 25$ لمرة وحدة، مدى الحياة).
- أنشئ تطبيقاً جديداً، عبّي:
  - Store listing (وصف، صور شاشة، أيقونة 512×512 — عندك `icon-512.png`)
  - Data Safety: اربط `privacy.html` كرابط سياسة الخصوصية
  - ارفع ملف `.aab`
- التطبيق كيدخل فمراجعة Google (يومين لأسبوع عادةً) قبل ما يبان للعموم.

## 5. Uptodown

Uptodown أبسط: كيقبلوا ملف `.apk` مباشرة بدون حساب مطوّر مدفوع.
1. سجّل حساب مطوّر مجاني فـ https://developer.uptodown.com
2. ارفع `app-release-signed.apk`
3. عبّي الوصف وصور الشاشة، وانتظر مراجعتهم (عادة أسرع من Google).

## 6. ملاحظة صادقة حول "حجم الملف"

حجم `index.html` كبر لأنه دابا كيحتوي فعلياً على: PWA حقيقية (manifest + service worker + أيقونات)، CSP، صفحة خصوصية منفصلة، ودالة خادم واحدة نظيفة لـ OpenRouter بدل ثلاثة. ماكاينش أي كود فارغ تزاد غير باش يكبر الحجم — هذا كيفما تفاهمنا.
