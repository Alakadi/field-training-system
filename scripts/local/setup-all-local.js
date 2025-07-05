#!/usr/bin/env node

/**
 * سكريبت الإعداد الشامل للبيئة المحلية
 * يقوم بتشغيل جميع سكريبتات الإعداد بالترتيب الصحيح
 */

import dotenv from 'dotenv';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// تحديد مجلد المشروع
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../..');

// تحميل متغيرات البيئة
dotenv.config({ path: join(projectRoot, '.env') });

console.log('🚀 بدء إعداد نظام التدريب الميداني للبيئة المحلية...\n');

// فحص متغيرات البيئة المطلوبة
if (!process.env.DATABASE_URL) {
  console.error('❌ لم يتم العثور على متغير DATABASE_URL في ملف .env');
  console.error('📝 يرجى إنشاء ملف .env مع المتغيرات التالية:');
  console.error('   DATABASE_URL=postgresql://postgres:password@localhost:5432/training_system_local');
  console.error('   PORT=8080');
  console.error('   NODE_ENV=development');
  process.exit(1);
}

async function runCommand(command, description) {
  try {
    console.log(`⏳ ${description}...`);
    execSync(command, { 
      stdio: 'inherit', 
      cwd: projectRoot,
      env: { ...process.env, NODE_ENV: 'development' }
    });
    console.log(`✅ ${description} - تم بنجاح\n`);
  } catch (error) {
    console.error(`❌ فشل في: ${description}`);
    console.error(`خطأ: ${error.message}\n`);
    throw error;
  }
}

async function setupLocal() {
  try {
    // 1. تثبيت التبعيات
    await runCommand('npm install', 'تثبيت التبعيات');

    // 2. إنشاء جداول قاعدة البيانات
    await runCommand('npm run db:push', 'إنشاء جداول قاعدة البيانات');

    // 3. إضافة الكليات والتخصصات
    await runCommand('npx tsx scripts/local/seed-faculties-local.js', 'إضافة الكليات والتخصصات');

    // 4. إضافة المستويات الدراسية
    await runCommand('npx tsx scripts/local/seed-levels-local.js', 'إضافة المستويات الدراسية');

    // 5. إنشاء حساب المسؤول
    await runCommand('npx tsx scripts/local/create-admin-local.js', 'إنشاء حساب المسؤول');

    // 6. إضافة البيانات التجريبية
    await runCommand('npx tsx scripts/local/seed-sample-data-local.js', 'إضافة البيانات التجريبية');

    console.log('🎉 تم إعداد النظام بنجاح للبيئة المحلية!');
    console.log('\n📋 معلومات مهمة:');
    console.log('   🌐 الرابط: http://localhost:8080');
    console.log('   👤 المسؤول: admin / admin123');
    console.log('   👨‍🏫 مشرف: supervisor1 / password');
    console.log('   👨‍🎓 طالب: student1 / password');
    console.log('\n🚀 لتشغيل النظام:');
    console.log('   PORT=8080 npm run dev');
    console.log('\n📁 ملفات الإعداد:');
    console.log('   📄 LOCAL_SETUP_COMPLETE.md - دليل الإعداد الكامل');
    console.log('   📄 .env - متغيرات البيئة');
    console.log('   📂 scripts/local/ - سكريبتات الإعداد المحلية');

  } catch (error) {
    console.error('\n💥 فشل في إعداد النظام:', error.message);
    console.error('\n🛠️  للمساعدة في حل المشكلة:');
    console.error('   1. تأكد من تشغيل PostgreSQL');
    console.error('   2. تأكد من صحة معلومات قاعدة البيانات في .env');
    console.error('   3. تأكد من وجود قاعدة البيانات training_system_local');
    console.error('   4. راجع ملف LOCAL_SETUP_COMPLETE.md للتفاصيل');
    process.exit(1);
  }
}

// تشغيل الإعداد
setupLocal();