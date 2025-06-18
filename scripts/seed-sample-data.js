import { db } from '../server/db.js';
import { users, supervisors, students, levels, trainingSites, trainingCourses, trainingCourseGroups, trainingAssignments, evaluations } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

async function seedSampleData() {
  try {
    console.log('Creating sample data...');

    // Create levels first
    let level1;
    try {
      [level1] = await db.insert(levels)
        .values({
          name: 'السنة الرابعة',
          description: 'المستوى الرابع - سنة التخرج'
        })
        .returning();
    } catch (error) {
      // Level might already exist, get it
      const existingLevels = await db.select().from(levels).limit(1);
      level1 = existingLevels[0];
    }

    if (!level1) {
      throw new Error('Could not create or find level');
    }

    // Create supervisor user
    let supervisorUser;
    try {
      [supervisorUser] = await db.insert(users)
        .values({
          username: 'supervisor1',
          password: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
          name: 'د. أحمد محمد',
          email: 'supervisor1@university.edu',
          role: 'supervisor',
          active: true
        })
        .returning();
    } catch (error) {
      // User might already exist, get it
      const existingUsers = await db.select().from(users).where(eq(users.username, 'supervisor1'));
      supervisorUser = existingUsers[0];
    }

    if (!supervisorUser) {
      throw new Error('Could not create or find supervisor user');
    }

    // Create supervisor profile
    let supervisor;
    try {
      [supervisor] = await db.insert(supervisors)
        .values({
          userId: supervisorUser.id,
          facultyId: 1,
          department: 'قسم هندسة البرمجيات'
        })
        .returning();
    } catch (error) {
      // Supervisor might already exist, get it
      const existingSupervisors = await db.select().from(supervisors).where(eq(supervisors.userId, supervisorUser.id));
      supervisor = existingSupervisors[0];
    }

    if (!supervisor) {
      throw new Error('Could not create or find supervisor');
    }

    // Create student users
    const studentUsers = [];
    for (let i = 1; i <= 5; i++) {
      const [studentUser] = await db.insert(users)
        .values({
          username: `student${i}`,
          password: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
          name: `طالب ${i}`,
          email: `student${i}@university.edu`,
          role: 'student',
          active: true
        })
        .onConflictDoNothing()
        .returning();
      
      if (studentUser) {
        studentUsers.push(studentUser);
      }
    }

    // Create student profiles
    for (let i = 0; i < studentUsers.length; i++) {
      const studentUser = studentUsers[i];
      await db.insert(students)
        .values({
          userId: studentUser.id,
          universityId: `202300${i + 1}`,
          facultyId: 1,
          majorId: 1,
          levelId: 1,
          supervisorId: supervisor.id
        })
        .onConflictDoNothing();
    }

    // Create training sites
    const [site1] = await db.insert(trainingSites)
      .values({
        name: 'شركة التقنيات المتقدمة',
        address: 'شارع الملك عبدالعزيز، الرياض',
        contactPerson: 'م. سعد الأحمد',
        phone: '+966501234567',
        email: 'contact@advtech.sa'
      })
      .onConflictDoNothing()
      .returning();

    const [site2] = await db.insert(trainingSites)
      .values({
        name: 'مركز الابتكار التقني',
        address: 'حي النخيل، جدة',
        contactPerson: 'د. فاطمة الزهراني',
        phone: '+966507654321',
        email: 'info@techcenter.sa'
      })
      .onConflictDoNothing()
      .returning();

    // Create training courses
    const [course1] = await db.insert(trainingCourses)
      .values({
        name: 'تطوير تطبيقات الويب',
        description: 'دورة تدريبية في تطوير تطبيقات الويب باستخدام React و Node.js',
        facultyId: 1,
        majorId: 1,
        location: 'مقر الشركة',
        status: 'active'
      })
      .onConflictDoNothing()
      .returning();

    const [course2] = await db.insert(trainingCourses)
      .values({
        name: 'أمن المعلومات والشبكات',
        description: 'دورة تدريبية في أساسيات أمن المعلومات وحماية الشبكات',
        facultyId: 1,
        majorId: 1,
        location: 'مركز التدريب',
        status: 'upcoming'
      })
      .onConflictDoNothing()
      .returning();

    // Create training course groups
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 10); // Started 10 days ago
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 20); // Ends in 20 days

    const [group1] = await db.insert(trainingCourseGroups)
      .values({
        courseId: course1.id,
        groupName: 'المجموعة الأولى',
        siteId: site1.id,
        supervisorId: supervisor.id,
        capacity: 10,
        currentEnrollment: 3,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      })
      .onConflictDoNothing()
      .returning();

    const futureStartDate = new Date();
    futureStartDate.setDate(futureStartDate.getDate() + 30);
    const futureEndDate = new Date();
    futureEndDate.setDate(futureEndDate.getDate() + 60);

    const [group2] = await db.insert(trainingCourseGroups)
      .values({
        courseId: course2.id,
        groupName: 'المجموعة الثانية',
        siteId: site2.id,
        supervisorId: supervisor.id,
        capacity: 8,
        currentEnrollment: 2,
        startDate: futureStartDate.toISOString(),
        endDate: futureEndDate.toISOString()
      })
      .onConflictDoNothing()
      .returning();

    // Get students for assignments
    const allStudents = await db.select().from(students).limit(5);

    // Create training assignments
    for (let i = 0; i < 3 && i < allStudents.length; i++) {
      const [assignment] = await db.insert(trainingAssignments)
        .values({
          studentId: allStudents[i].id,
          groupId: group1.id,
          status: 'confirmed',
          registeredAt: new Date().toISOString()
        })
        .onConflictDoNothing()
        .returning();

      // Create sample evaluations
      if (i < 2) { // Only for first 2 students
        await db.insert(evaluations)
          .values({
            assignmentId: assignment.id,
            supervisorId: supervisor.id,
            grade: 85 + (i * 5), // 85, 90
            feedback: `أداء ممتاز في التدريب. الطالب أظهر فهماً عميقاً للمواضيع المطروحة.`,
            evaluatedAt: new Date().toISOString()
          })
          .onConflictDoNothing();
      }
    }

    // Assign remaining students to second group
    for (let i = 3; i < 5 && i < allStudents.length; i++) {
      await db.insert(trainingAssignments)
        .values({
          studentId: allStudents[i].id,
          groupId: group2.id,
          status: 'pending',
          registeredAt: new Date().toISOString()
        })
        .onConflictDoNothing();
    }

    console.log('✅ Sample data created successfully!');
    console.log('Supervisor login: supervisor1 / password');
    console.log('Student logins: student1-student5 / password');
  } catch (error) {
    console.error('❌ Error creating sample data:', error);
  }
  process.exit(0);
}

seedSampleData();