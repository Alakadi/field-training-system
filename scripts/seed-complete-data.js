import { db } from '../server/db.js';
import { 
  users, 
  students, 
  supervisors, 
  trainingSites, 
  trainingCourses, 
  trainingCourseGroups,
  levels,
  faculties,
  majors
} from '../shared/schema.js';
// Note: Using simple password for demo - in production use proper hashing

async function seedCompleteData() {
  try {
    console.log('⏳ Starting complete data seeding...');

    // Seed levels
    console.log('Creating levels...');
    const levelsData = [
      { name: 'المستوى الأول' },
      { name: 'المستوى الثاني' },
      { name: 'المستوى الثالث' },
      { name: 'المستوى الرابع' },
      { name: 'المستوى الخامس' }
    ];

    for (const levelData of levelsData) {
      await db.insert(levels).values(levelData).onConflictDoNothing();
    }

    // Get existing data
    const existingFaculties = await db.select().from(faculties);
    const existingMajors = await db.select().from(majors);
    const existingLevels = await db.select().from(levels);
    const existingSites = await db.select().from(trainingSites);

    // Create training sites if not exist
    console.log('Creating training sites...');
    if (existingSites.length === 0) {
      const sitesData = [
        {
          name: 'مستشفى الملك فهد الجامعي',
          address: 'الخبر، المملكة العربية السعودية',
          contactName: 'د. أحمد محمد',
          contactEmail: 'ahmed@kfhu.edu.sa',
          contactPhone: '+966133333333'
        },
        {
          name: 'شركة أرامكو السعودية',
          address: 'الظهران، المملكة العربية السعودية',
          contactName: 'م. سارة علي',
          contactEmail: 'sara@aramco.com',
          contactPhone: '+966138888888'
        },
        {
          name: 'مجموعة سابك',
          address: 'الرياض، المملكة العربية السعودية',
          contactName: 'م. خالد عبدالله',
          contactEmail: 'khaled@sabic.com',
          contactPhone: '+966115555555'
        },
        {
          name: 'شركة الاتصالات السعودية STC',
          address: 'الرياض، المملكة العربية السعودية',
          contactName: 'أ. فاطمة محمد',
          contactEmail: 'fatima@stc.com.sa',
          contactPhone: '+966112222222'
        },
        {
          name: 'بنك الراجحي',
          address: 'الرياض، المملكة العربية السعودية',
          contactName: 'أ. عبدالرحمن الراجحي',
          contactEmail: 'abdul@alrajhi-bank.com.sa',
          contactPhone: '+966114444444'
        }
      ];

      for (const siteData of sitesData) {
        await db.insert(trainingSites).values(siteData);
      }
    }

    // Create supervisor users
    console.log('Creating supervisors...');
    const supervisorUsers = [];
    for (let i = 1; i <= 5; i++) {
      // Simple password for demo
      const userData = {
        username: `supervisor${i}`,
        password: 'supervisor123', // In production, this should be hashed
        role: 'supervisor',
        name: `المشرف ${i}`,
        email: `supervisor${i}@university.edu.sa`,
        phone: `+96650000000${i}`
      };

      const [user] = await db.insert(users).values(userData).returning();
      supervisorUsers.push(user);

      // Create supervisor profile
      await db.insert(supervisors).values({
        userId: user.id,
        facultyId: existingFaculties[i % existingFaculties.length]?.id || 1,
        department: `قسم الإشراف ${i}`
      });
    }

    // Create student users
    console.log('Creating students...');
    const studentUsers = [];
    for (let i = 1; i <= 25; i++) {
      // Simple password for demo
      const userData = {
        username: `student${i}`,
        password: 'student123', // In production, this should be hashed
        role: 'student',
        name: `الطالب ${i}`,
        email: `student${i}@student.university.edu.sa`,
        phone: `+96655000000${i}`
      };

      const [user] = await db.insert(users).values(userData).returning();
      studentUsers.push(user);

      // Create student profile
      await db.insert(students).values({
        userId: user.id,
        universityId: `20240000${i.toString().padStart(2, '0')}`,
        facultyId: existingFaculties[i % existingFaculties.length]?.id || 1,
        majorId: existingMajors[i % existingMajors.length]?.id || 1,
        levelId: existingLevels[i % existingLevels.length]?.id || 1
      });
    }

    // Create training courses
    console.log('Creating training courses...');
    const allSites = await db.select().from(trainingSites);
    const allSupervisors = await db.select().from(supervisors);

    const coursesData = [
      {
        name: 'دورة التدريب السريري',
        facultyId: existingFaculties[0]?.id || 1,
        majorId: existingMajors[0]?.id || 1,
        levelId: existingLevels[2]?.id || 3,
        description: 'دورة تدريبية في البيئة السريرية للطلاب',
        status: 'active',
        createdBy: 1
      },
      {
        name: 'دورة تطوير البرمجيات',
        facultyId: existingFaculties[0]?.id || 1,
        majorId: existingMajors[0]?.id || 1,
        levelId: existingLevels[3]?.id || 4,
        description: 'دورة تدريبية في تطوير وبرمجة التطبيقات',
        status: 'active',
        createdBy: 1
      },
      {
        name: 'دورة إدارة الأعمال',
        facultyId: existingFaculties[0]?.id || 1,
        majorId: existingMajors[0]?.id || 1,
        levelId: existingLevels[4]?.id || 5,
        description: 'دورة تدريبية في إدارة الأعمال والمشاريع',
        status: 'active',
        createdBy: 1
      },
      {
        name: 'دورة الشبكات والأمان',
        facultyId: existingFaculties[0]?.id || 1,
        majorId: existingMajors[0]?.id || 1,
        levelId: existingLevels[2]?.id || 3,
        description: 'دورة تدريبية في أمن الشبكات والمعلومات',
        status: 'active',
        createdBy: 1
      },
      {
        name: 'دورة التسويق الرقمي',
        facultyId: existingFaculties[0]?.id || 1,
        majorId: existingMajors[0]?.id || 1,
        levelId: existingLevels[1]?.id || 2,
        description: 'دورة تدريبية في التسويق الرقمي ووسائل التواصل',
        status: 'active',
        createdBy: 1
      }
    ];

    for (let i = 0; i < coursesData.length; i++) {
      const courseData = coursesData[i];
      const [course] = await db.insert(trainingCourses).values(courseData).returning();

      // Create 2 groups per course
      for (let j = 1; j <= 2; j++) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() + (i * 30) + (j * 7));
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 60);

        await db.insert(trainingCourseGroups).values({
          courseId: course.id,
          groupName: `المجموعة ${j}`,
          siteId: allSites[i % allSites.length].id,
          supervisorId: allSupervisors[i % allSupervisors.length].id,
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          capacity: 10,
          currentEnrollment: 0,
          location: `قاعة التدريب ${j}`,
          status: 'active',
          createdBy: 1
        });
      }
    }

    console.log('✅ Complete data seeding finished successfully!');
    console.log('📊 Created:');
    console.log('   - 5 Levels');
    console.log('   - 5 Training Sites');
    console.log('   - 5 Supervisors');
    console.log('   - 25 Students');
    console.log('   - 5 Training Courses');
    console.log('   - 10 Course Groups');

  } catch (error) {
    console.error('❌ Error in complete data seeding:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

seedCompleteData();