# إعداد النظام للتشغيل المحلي

## المتطلبات الأساسية

1. **Node.js** (الإصدار 18 أو أحدث)
2. **PostgreSQL** (الإصدار 12 أو أحدث)
3. **npm** أو **yarn**

## خطوات الإعداد

### 1. إعداد قاعدة البيانات

```bash
# إنشاء قاعدة بيانات جديدة
createdb training_system

# أو باستخدام psql
psql -c "CREATE DATABASE training_system;"
```

### 2. إعداد متغيرات البيئة

انسخ ملف `.env.example` إلى `.env` وعدل القيم:

```bash
cp .env.example .env
```

عدل ملف `.env`:
```env
DATABASE_URL=postgresql://username:password@localhost:5432/training_system
PORT=8080
NODE_ENV=development
SESSION_SECRET=your_secret_key_here
```

### 3. تثبيت التبعيات

```bash
npm install
```

### 4. إعداد قاعدة البيانات

```bash
# إنشاء الجداول
node scripts/db-push.js

# إضافة الكليات والتخصصات
npx tsx scripts/seed-faculties.js

# إضافة المستويات
npx tsx scripts/seed-levels.js

# إضافة البيانات التجريبية
npx tsx scripts/seed-sample-data.js
```

### 5. تشغيل التطبيق

```bash
npm run dev
```

سيعمل التطبيق على المنفذ 8080: http://localhost:8080

## معلومات تسجيل الدخول

### المسؤول
- **اسم المستخدم:** admin
- **كلمة المرور:** admin123

### المشرف
- **اسم المستخدم:** supervisor1
- **كلمة المرور:** password

### الطلاب
- **أسماء المستخدمين:** student1, student2, student3, student4, student5
- **كلمة المرور:** password

## حل المشاكل الشائعة

### مشكلة الاتصال بقاعدة البيانات
- تأكد من تشغيل PostgreSQL
- تحقق من صحة DATABASE_URL في ملف .env

### مشكلة المنفذ مستخدم
```bash
# إيقاف العمليات التي تستخدم المنفذ
lsof -ti:8080 | xargs kill -9
```

### إعادة تعيين قاعدة البيانات
```bash
# حذف وإعادة إنشاء قاعدة البيانات
dropdb training_system
createdb training_system

# إعادة تشغيل سكريبت الإعداد
node scripts/db-push.js
npx tsx scripts/seed-faculties.js
npx tsx scripts/seed-levels.js
```

## الميزات المتوفرة

- ✅ نظام إدارة المستخدمين (مسؤول، مشرف، طالب)
- ✅ إدارة الكليات والتخصصات
- ✅ إدارة السنوات الدراسية
- ✅ إدارة مواقع التدريب
- ✅ إدارة الدورات التدريبية والمجموعات
- ✅ نظام التعيينات والتسجيل
- ✅ نظام التقييم والدرجات
- ✅ نظام الإشعارات
- ✅ التقارير والإحصائيات
- ✅ سجل النشاطات
- ✅ تصدير البيانات (Excel, PDF)