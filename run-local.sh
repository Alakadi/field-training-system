#!/bin/bash

# نظام إدارة التدريب الميداني - سكريبت التشغيل المحلي
# لتشغيل النظام على المنفذ 8080 محلياً

echo "🚀 بدء تشغيل نظام إدارة التدريب الميداني محلياً..."

# التحقق من وجود Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js غير مثبت. يرجى تثبيت Node.js أولاً."
    exit 1
fi

# التحقق من وجود npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm غير مثبت. يرجى تثبيت npm أولاً."
    exit 1
fi

# التحقق من وجود PostgreSQL
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL غير مثبت. يرجى تثبيت PostgreSQL أولاً."
    exit 1
fi

# التحقق من ملف .env
if [ ! -f .env ]; then
    echo "⚠️  ملف .env غير موجود. إنشاء ملف .env من المثال..."
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "✅ تم إنشاء ملف .env. يرجى تحديث معلومات قاعدة البيانات."
    else
        echo "❌ ملف .env.example غير موجود. يرجى إنشاء ملف .env يدوياً."
        exit 1
    fi
fi

# تحميل متغيرات البيئة
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# تعيين المنفذ إلى 8080 إذا لم يكن محدداً
if [ -z "$PORT" ]; then
    export PORT=8080
fi

echo "🔍 التحقق من قاعدة البيانات..."

# التحقق من الاتصال بقاعدة البيانات
if [ ! -z "$DATABASE_URL" ]; then
    echo "✅ متغير DATABASE_URL موجود"
else
    echo "❌ متغير DATABASE_URL غير موجود في ملف .env"
    exit 1
fi

echo "📦 تثبيت التبعيات..."
npm install

echo "🗄️  إعداد قاعدة البيانات..."

# تشغيل سكريبت إعداد قاعدة البيانات
if [ -f "scripts/db-push.js" ]; then
    node scripts/db-push.js
    if [ $? -ne 0 ]; then
        echo "❌ فشل في إعداد قاعدة البيانات"
        exit 1
    fi
else
    echo "❌ ملف scripts/db-push.js غير موجود"
    exit 1
fi

echo "🌱 إضافة البيانات الأساسية..."

# تشغيل سكريبتات البيانات الأساسية
if [ -f "scripts/setup-local.js" ]; then
    npx tsx scripts/setup-local.js
    if [ $? -ne 0 ]; then
        echo "⚠️  تحذير: فشل في إضافة بعض البيانات الأساسية"
    fi
fi

echo ""
echo "🎉 تم إعداد النظام بنجاح!"
echo ""
echo "معلومات تسجيل الدخول:"
echo "المسؤول: admin / admin123"
echo ""
echo "🌐 سيعمل التطبيق على: http://localhost:$PORT"
echo ""
echo "🚀 بدء تشغيل الخادم..."

# تشغيل التطبيق
NODE_ENV=development tsx server/index.ts