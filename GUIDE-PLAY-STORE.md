# دليل النشر والتغليف — abdelrezakbezzag

## 1) نشر الموقع على Vercel

1. ارفع كل محتوى هذا المجلد (بما فيه المجلدين `api/` و `icons/`) إلى مستودع GitHub.
2. على [vercel.com](https://vercel.com) → **Add New Project** → اختر المستودع → **Deploy**
   (لا حاجة لأي إعداد بناء خاص، الملفات ثابتة + دالة واحدة في `api/`).
3. بعد أول نشر: **Project → Settings → Environment Variables**
   - Name: `OPENROUTER_API_KEY`
   - Value: مفتاحك من [openrouter.ai/keys](https://openrouter.ai/keys)
   - طبّقه على Production (وPreview إن رغبت)
4. **Deployments → أعد النشر (Redeploy)** حتى يقرأ المتغيّر الجديد.
5. افتح الرابط النهائي وجرّب إرسال رسالة — يجب أن يصلك رد فعلي بدون أي خطأ.

⚠️ لا تكتب المفتاح أبداً داخل `index.html` أو أي ملف يُرفع لـ Git — فقط في Environment Variables.

## 2) التأكد أن التطبيق PWA حقيقي

بعد النشر، افتح الموقع بـ Chrome على الهاتف → قائمة المتصفح ⋮ → **"إضافة إلى الشاشة الرئيسية" / Install app**.
إن ظهر الخيار ولم يظهر أي تحذير في Lighthouse (DevTools → Lighthouse → PWA)، فالتطبيق جاهز للتغليف.

الملفات المطلوبة لذلك موجودة كلها في هذا التسليم:
`manifest.webmanifest`, `sw.js`, `icons/icon-192.png`, `icons/icon-512.png`, `icons/icon-512-maskable.png`.

## 3) تغليف التطبيق لمتجر Google Play (TWA)

أسهل طريقة بدون Android Studio: [PWABuilder.com](https://www.pwabuilder.com)

1. أدخل رابط موقعك المنشور على Vercel.
2. اضغط **Start** ثم من تبويب **Android** اختر **Generate Package**.
3. حمّل ملف `.aab` الناتج (Android App Bundle).
4. على [Google Play Console](https://play.google.com/console) (يتطلب حساب مطوّر برسوم لمرة واحدة):
   - أنشئ تطبيقاً جديداً
   - ارفع ملف `.aab`
   - أضف رابط سياسة الخصوصية: `https://YOUR-DOMAIN.vercel.app/privacy.html`
   - أضف أيقونة 512×512 (موجودة في `icons/icon-512.png`) ولقطات شاشة، ثم أرسل للمراجعة.

بديل أكثر تحكماً: أداة [Bubblewrap CLI](https://github.com/GoogleChromeLabs/bubblewrap) الرسمية من Google (تحتاج Node.js وJDK).

## 4) رفع على Uptodown

Uptodown يقبل ملفات APK مباشرة (وليس AAB). من نفس مشروع PWABuilder اختر تصدير **APK** بدل AAB
(أو حوّل الـ AAB لـ APK عبر `bundletool`)، ثم ارفعه من حساب مطوّر على Uptodown مع نفس رابط سياسة الخصوصية.

## 5) قائمة تحقق سريعة قبل الإرسال لأي متجر

- [ ] `OPENROUTER_API_KEY` مضبوط على Vercel والدردشة تعمل فعلياً على الرابط المنشور
- [ ] `/manifest.webmanifest` و `/sw.js` و `/privacy.html` كلها تفتح بدون 404
- [ ] Lighthouse → PWA لا يُظهر أخطاء حرجة
- [ ] رابط سياسة الخصوصية صحيح ومحدَّث باسم نطاقك الفعلي
