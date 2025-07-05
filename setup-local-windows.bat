@echo off
chcp 65001 >nul
echo 🚀 إعداد نظام التدريب الميداني للبيئة المحلية...
echo.

REM التحقق من وجود Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js غير مثبت. يرجى تثبيت Node.js أولاً
    echo 📥 تحميل من: https://nodejs.org/
    pause
    exit /b 1
)

REM التحقق من وجود ملف .env
if not exist ".env" (
    echo ⚠️  ملف .env غير موجود
    echo 📝 يرجى إنشاء ملف .env مع المحتوى التالي:
    echo.
    echo DATABASE_URL=postgresql://postgres:password@localhost:5432/training_system_local
    echo PORT=8080
    echo NODE_ENV=development
    echo SESSION_SECRET=local_development_secret
    echo.
    echo 📄 راجع ملف LOCAL_SETUP_COMPLETE.md للتفاصيل
    pause
    exit /b 1
)

echo ⏳ تشغيل سكريپت الإعداد الشامل...
echo.

npx tsx scripts/local/setup-all-local.js

if %ERRORLEVEL% EQU 0 (
    echo.
    echo 🎉 تم إعداد النظام بنجاح!
    echo.
    echo 🚀 لتشغيل النظام الآن:
    echo    set PORT=8080 ^&^& npm run dev
    echo.
    echo 📋 أو استخدم سكريپت التشغيل السريع:
    echo    run-local-quick.bat
    echo.
) else (
    echo.
    echo ❌ فشل في الإعداد
    echo 📋 راجع الأخطاء أعلاه وملف LOCAL_SETUP_COMPLETE.md
)

pause