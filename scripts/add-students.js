
import { db } from "../server/db.js";
import { users, students, faculties, majors, levels } from "../shared/schema.js";
import { eq } from "drizzle-orm";

async function addStudents() {
  try {
    console.log("Starting to add students...");

    // إضافة طلاب جدد
    const studentsData = [
      {
        name: "أحمد محمد السعيد",
        universityId: "2023001",
        email: "ahmed.mohammed@university.edu",
        phone: "+966501234567"
      },
      {
        name: "فاطمة عبدالله الزهراني",
        universityId: "2023002", 
        email: "fatima.alzahrani@university.edu",
        phone: "+966507654321"
      },
      {
        name: "محمد علي القحطاني",
        universityId: "2023003",
        email: "mohammed.alqahtani@university.edu", 
        phone: "+966509876543"
      },
      {
        name: "نورا حسن العتيبي",
        universityId: "2023004",
        email: "nora.alotaibi@university.edu",
        phone: "+966502468135"
      },
      {
        name: "خالد يوسف الدوسري",
        universityId: "2023005",
        email: "khalid.aldosari@university.edu",
        phone: "+966508642097"
      },
      {
        name: "مريم عبدالرحمن الشهري",
        universityId: "2023006",
        email: "mariam.alshahri@university.edu", 
        phone: "+966503691472"
      },
      {
        name: "سعد إبراهيم الخليفي",
        universityId: "2023007",
        email: "saad.alkhalifi@university.edu",
        phone: "+966505825314"
      },
      {
        name: "رنا فهد المطيري",
        universityId: "2023008",
        email: "rana.almutairi@university.edu",
        phone: "+966504173658"
      },
      {
        name: "عبدالعزيز سلمان الحربي",
        universityId: "2023009",
        email: "abdulaziz.alharbi@university.edu",
        phone: "+966506928471"
      },
      {
        name: "هند ناصر الغامدي",
        universityId: "2023010",
        email: "hind.alghamdi@university.edu",
        phone: "+966508147392"
      }
    ];

    for (const studentData of studentsData) {
      try {
        // إنشاء حساب المستخدم
        const [user] = await db.insert(users)
          .values({
            username: studentData.universityId,
            password: "$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi", // كلمة مرور افتراضية: password
            name: studentData.name,
            email: studentData.email,
            phone: studentData.phone,
            role: "student",
            active: true
          })
          .onConflictDoNothing()
          .returning();

        if (user) {
          // إنشاء ملف الطالب
          await db.insert(students)
            .values({
              userId: user.id,
              universityId: studentData.universityId,
              facultyId: 1, // كلية الهندسة وتقنية المعلومات
              majorId: 1, // هندسة البرمجيات
              levelId: 1  // السنة الرابعة
            })
            .onConflictDoNothing();

          console.log(`تم إضافة الطالب: ${studentData.name}`);
        }
      } catch (error) {
        console.error(`خطأ في إضافة الطالب ${studentData.name}:`, error);
      }
    }

    console.log("تم الانتهاء من إضافة الطلاب");
  } catch (error) {
    console.error("خطأ في إضافة الطلاب:", error);
  } finally {
    process.exit(0);
  }
}

addStudents();
