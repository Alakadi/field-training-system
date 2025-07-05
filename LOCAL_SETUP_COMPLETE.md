# إعداد نظام التدريب الميداني - البيئة المحلية

## الخطوات الكاملة للتشغيل المحلي على VS Code

### 1. متطلبات النظام
- Node.js (v18 أو أحدث)
- PostgreSQL
- Git

### 2. إعداد قاعدة البيانات
```bash
# إنشاء قاعدة بيانات جديدة
createdb training_system_local

# أو مع مستخدم محدد
createdb -U postgres training_system_local
```

### 3. إعداد متغيرات البيئة
إنشاء ملف `.env` في جذر المشروع:

```env
# قاعدة البيانات المحلية
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/training_system_local
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=YOUR_PASSWORD
PGDATABASE=training_system_local

# إعدادات الخادم
PORT=8080
NODE_ENV=development

# أمان الجلسات
SESSION_SECRET=local_development_secret_key_change_in_production

# تحديد البيئة المحلية
LOCAL_ENV=true
```

### 4. تثبيت التبعيات
```bash
npm install
```

### 5. تشغيل سكريبتات الإعداد بالترتيب الصحيح
```bash
# 1. إنشاء جداول قاعدة البيانات
npm run db:push

# 2. إضافة البيانات الأساسية
npx tsx scripts/local/seed-faculties-local.js
npx tsx scripts/local/seed-levels-local.js
npx tsx scripts/local/create-admin-local.js
npx tsx scripts/local/seed-sample-data-local.js

# 3. تشغيل التطبيق
PORT=8080 npm run dev
```

### 6. الوصول للنظام
- الرابط: http://localhost:8080
- المسؤول: admin / admin123
- مشرف: supervisor1 / password
- طالب: student1 / password

### 7. استكشاف الأخطاء

#### مشكلة المنفذ مشغول:
```bash
# Windows
netstat -ano | findstr :8080
taskkill /PID [PID_NUMBER] /F

# Linux/Mac
lsof -ti:8080 | xargs kill -9
```

#### مشكلة قاعدة البيانات:
```bash
# إعادة إنشاء قاعدة البيانات
dropdb training_system_local
createdb training_system_local
npm run db:push
```

#### مشكلة TypeScript:
```bash
# تنظيف وإعادة بناء
npm run build
rm -rf node_modules package-lock.json
npm install
```

### 8. الاختلافات عن بيئة Replit
- المنفذ: 8080 بدلاً من 5000
- قاعدة البيانات: PostgreSQL محلية بدلاً من NeonDB
- الجلسات: MemoryStore بدلاً من PostgreSQL store
- متغيرات البيئة: ملف .env بدلاً من متغيرات Replit

### 9. ملفات مهمة للبيئة المحلية
- `.env` - متغيرات البيئة
- `scripts/local/` - سكريبتات الإعداد المحلية
- `run-local.bat/sh` - سكريبتات التشغيل السريع