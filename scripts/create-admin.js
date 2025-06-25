
import { db } from "../server/db.ts";
import { users } from "../shared/schema.ts";

async function createAdmin() {
  try {
    // إنشاء مسؤول جديد
    const admin = await db.insert(users).values({
      username: "admin",
      password: "admin123", // يُنصح بتغيير كلمة المرور بعد تسجيل الدخول
      role: "admin",
      name: "مسؤول النظام",
      email: "admin@example.com",
      phone: null,
      active: true
    }).returning();

    console.log("تم إنشاء المسؤول بنجاح:");
    console.log("اسم المستخدم: admin");
    console.log("كلمة المرور: admin123");
    console.log("الاسم:", admin[0].name);
    console.log("البريد الإلكتروني:", admin[0].email);
    console.log("معرف المسؤول:", admin[0].id);
    
    process.exit(0);
  } catch (error) {
    if (error.code === '23505') { // Unique constraint violation
      console.log("المسؤول موجود بالفعل!");
      console.log("يمكنك تسجيل الدخول باستخدام:");
      console.log("اسم المستخدم: admin");
      console.log("كلمة المرور: admin123");
    } else {
      console.error("خطأ في إنشاء المسؤول:", error);
    }
    process.exit(1);
  }
}

createAdmin();
