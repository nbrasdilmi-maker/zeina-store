# 🛍️ متجر زينة - دليل النشر
# Tarifa Store - Deployment Guide

---

## 📦 محتويات المشروع

| المجلد/الملف | الوصف |
|--------------|-------|
| `src/` | الكود المصدري للمشروع |
| `src/app/` | صفحات و API Routes |
| `src/components/` | مكونات React |
| `src/lib/` | المكتبات والأدوات |
| `prisma/` | قاعدة البيانات |
| `public/` | الملفات الثابتة (الشعار، الأيقونات) |
| `package.json` | التبعيات والمهام |

---

## ⚙️ متطلبات الاستضافة

### الحد الأدنى:
- Node.js 18+ أو Bun
- ذاكرة RAM: 512MB على الأقل
- مساحة التخزين: 1GB

### المستحسن:
- Node.js 20+ أو Bun
- ذاكرة RAM: 1GB أو أكثر
- مساحة التخزين: 2GB

---

## 🚀 خطوات النشر

### 1️⃣ رفع الملفات
قم برفع محتويات ملف `tarifa-store-clean.tar.gz` إلى الاستضافة

### 2️⃣ إنشاء ملف البيئة
```bash
cp .env.example .env
```

ثم قم بتعديل الملف `.env` بالقيم الصحيحة:
- `NEXTAUTH_SECRET`: مفتاح عشوائي طويل
- `NEXTAUTH_URL`: رابط موقعك
- `BREVO_API_KEY`: مفتاح خدمة البريد

### 3️⃣ تثبيت التبعيات
```bash
# باستخدام npm
npm install

# أو باستخدام bun (أسرع)
bun install
```

### 4️⃣ إنشاء قاعدة البيانات
```bash
npx prisma generate
npx prisma db push
npx prisma db seed
```

### 5️⃣ إنشاء حساب المدير
```bash
npx ts-node scripts/create-admin.ts
```

### 6️⃣ بناء المشروع
```bash
npm run build
# أو
bun run build
```

### 7️⃣ تشغيل الموقع
```bash
npm run start
# أو
bun run start
```

---

## 🌐 خيارات الاستضافة

### 1. Vercel (موصى به - مجاني)
```bash
# تثبيت Vercel CLI
npm i -g vercel

# النشر
vercel --prod
```

### 2. Railway
1. اربط مستودع GitHub
2. أضف متغيرات البيئة
3. سيتم النشر تلقائياً

### 3. استضافة VPS
```bash
# استخدام PM2
npm i -g pm2
pm2 start npm --name "tarifa" -- start
pm2 save
pm2 startup
```

### 4. Docker
```dockerfile
FROM oven/bun:1
WORKDIR /app
COPY . .
RUN bun install
RUN bun run build
EXPOSE 3000
CMD ["bun", "run", "start"]
```

---

## 📧 إعداد البريد الإلكتروني (Brevo)

1. سجل في [Brevo](https://www.brevo.com)
2. احصل على API Key
3. أضفه في `.env`:
```
BREVO_API_KEY=xkeysib-xxxxx
EMAIL_FROM=noreply@yourdomain.com
```

---

## 🖼️ إعداد رفع الصور (ImageKit)

الإعداد الحالي جاهز! إذا أردت تغييره:
1. سجل في [ImageKit](https://imagekit.io)
2. احصل على المفاتيح
3. أضفها في `.env`

---

## 🔐 الأمان

- ✅ تغيير `NEXTAUTH_SECRET` إلى قيمة عشوائية
- ✅ استخدام HTTPS في الإنتاج
- ✅ حماية ملف `.env` من الوصول العام
- ✅ نسخ احتياطي منتظم لقاعدة البيانات

---

## 📱 معلومات المتجر

| المعلومة | القيمة |
|----------|--------|
| **الاسم** | زينة |
| **العملة** | ريال يمني (ر.ي) |
| **الدولة** | الجمهورية اليمنية |
| **التوصيل** | جميع المحافظات (22 محافظة) |

---

## 👥 نظام المستخدمين

| الدور | الصلاحيات |
|-------|----------|
| **CUSTOMER** | تصفح، شراء، سلة، مفضلة |
| **AGENT** | إضافة وتعديل المنتجات |
| **ADMIN** | كامل الصلاحيات + إدارة المندوبين |

---

## 🛠️ أوامر مفيدة

```bash
# تشغيل في وضع التطوير
npm run dev

# فحص الكود
npm run lint

# إعادة قاعدة البيانات
npx prisma db push --force-reset

# إنشاء مدير جديد
npx ts-node scripts/create-admin.ts
```

---

## 📞 الدعم

للمساعدة أو الاستفسارات:
- البريد: tarifa.store.ye@gmail.com

---

بالتوفيق في متجرك! 🎉
