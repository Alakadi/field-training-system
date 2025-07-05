@echo off
REM نظام إدارة التدريب الميداني - سكريبت التشغيل المحلي لـ Windows
REM لتشغيل النظام على المنفذ 8080 محلياً

echo 🚀 بدء تشغيل نظام إدارة التدريب الميداني محلياً...

REM التحقق من وجود Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js غير مثبت. يرجى تثبيت Node.js أولاً.
    pause
    exit /b 1
)

REM التحقق من وجود npm
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ npm غير مثبت. يرجى تثبيت npm أولاً.
    pause
    exit /b 1
)

REM التحقق من ملف .env
if not exist .env (
    echo ⚠️ ملف .env غير موجود. إنشاء ملف .env من المثال...
    if exist .env.example (
        copy .env.example .env
        echo ✅ تم إنشاء ملف .env. يرجى تحديث معلومات قاعدة البيانات.
    ) else (
        echo ❌ ملف .env.example غير موجود. يرجى إنشاء ملف .env يدوياً.
        pause
        exit /b 1
    )
)

REM تعيين المنفذ إلى 8080
set PORT=8080
set NODE_ENV=development

echo 📦 تثبيت التبعيات...
call npm install
if %errorlevel% neq 0 (
    echo ❌ فشل في تثبيت التبعيات
    pause
    exit /b 1
)

echo 🗄️ إعداد قاعدة البيانات...

REM تشغيل سكريبت إعداد قاعدة البيانات
if exist "scripts\db-push.js" (
    node scripts\db-push.js
    if %errorlevel% neq 0 (
        echo ❌ فشل في إعداد قاعدة البيانات
        pause
        exit /b 1
    )
) else (
    echo ❌ ملف scripts\db-push.js غير موجود
    pause
    exit /b 1
)

echo 🌱 إضافة البيانات الأساسية...

REM تشغيل سكريبتات البيانات الأساسية
if exist "scripts\setup-local.js" (
    npx tsx scripts\setup-local.js
    if %errorlevel% neq 0 (
        echo ⚠️ تحذير: فشل في إضافة بعض البيانات الأساسية
    )
)

echo.
echo 🎉 تم إعداد النظام بنجاح!
echo.
echo معلومات تسجيل الدخول:
echo المسؤول: admin / admin123
echo.
echo 🌐 سيعمل التطبيق على: http://localhost:%PORT%
echo.
echo 🚀 بدء تشغيل الخادم...

REM تشغيل التطبيق
npx tsx server\index.ts