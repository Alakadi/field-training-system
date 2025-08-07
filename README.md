
# نظام إدارة التدريب الميداني - Field Training Management System

نظام متكامل لإدارة التدريب الميداني للطلاب، مع دعم كامل للغة العربية، وواجهة سهلة الاستخدام، ودعم للمستخدمين المتعددين (مسؤول النظام، المشرفين، الطلاب).

## الميزات الرئيسية

- 🔒 نظام تسجيل دخول متعدد الأدوار (مسؤول، مشرف، طالب)
- 🏢 إدارة معلومات كليات، تخصصات، ومستويات الطلاب
- 👨‍🏫 إدارة معلومات المشرفين والطلاب
- 🏫 إدارة جهات التدريب والدورات التدريبية
- 📝 تعيين الطلاب للدورات التدريبية وتتبع حالتهم
- ⭐ تقييم أداء الطلاب في التدريب
- 📊 سجلات النشاط لتتبع جميع العمليات في النظام
- 📋 استيراد/تصدير بيانات الطلاب من/إلى ملفات Excel

## التقنيات المستخدمة

- **Frontend**: React.js + TypeScript + Vite
- **Backend**: Node.js + Express.js
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **UI Framework**: Tailwind CSS + shadcn/ui
- **Authentication**: Express Sessions

## متطلبات التشغيل

- Node.js (الإصدار 18 أو أحدث)
- PostgreSQL (الإصدار 14 أو أحدث)
- npm أو yarn

## التثبيت والإعداد

### 1. استنساخ المشروع

```bash
git clone https://github.com/your-username/field-training-system.git
cd field-training-system
```

### 2. تثبيت المكتبات

```bash
npm install
```

### 3. إعداد قاعدة البيانات

1. قم بإنشاء قاعدة بيانات جديدة في PostgreSQL:
```sql
CREATE DATABASE training_db;
```

2. انسخ ملف البيئة وقم بتعديله:
```bash
cp .env.example .env
```

3. عدّل ملف `.env` وأضف بيانات الاتصال:
```
DATABASE_URL=postgresql://username:password@localhost:5432/training_db
SESSION_SECRET=your_secure_session_secret_here
```

### 4. إعداد قاعدة البيانات الأولي

```bash
# إنشاء هيكل قاعدة البيانات
npm run db:push

# إضافة البيانات الأساسية (اختياري)
node scripts/setup-local.js
```

### 5. تشغيل النظام

```bash
npm run dev
```

سيعمل النظام على المنفذ 3000. يمكنك الوصول إليه من خلال:
http://localhost:3000

## حسابات الدخول الافتراضية

بعد تشغيل سكريبت الإعداد، يمكنك استخدام الحسابات التالية:

- **مسؤول النظام**:
  - اسم المستخدم: `admin`
  - كلمة المرور: `admin123`

## هيكل المشروع

```
├── client/                 # تطبيق React (Frontend)
├── server/                 # خادم Express (Backend)
├── shared/                 # الكود المشترك (Schema, Types)
├── scripts/               # سكريبتات إعداد قاعدة البيانات
└── docs/                  # التوثيق
```

