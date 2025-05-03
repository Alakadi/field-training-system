
const { db } = require('../server/db');
const { faculties, majors } = require('../shared/schema');

async function seedFacultiesAndMajors() {
  try {
    // Insert faculties
    const [itFaculty] = await db.insert(faculties)
      .values({ name: "الهندسة و تقنية المعلومات" })
      .returning();

    const [medicalFaculty] = await db.insert(faculties)
      .values({ name: "العلوم الطبية" })
      .returning();

    // Insert majors for IT & Engineering
    await db.insert(majors).values([
      { name: "تقنية المعلومات", facultyId: itFaculty.id },
      { name: "هندسة مدني", facultyId: itFaculty.id }
    ]);

    // Insert majors for Medical Sciences
    await db.insert(majors).values([
      { name: "صيدلة", facultyId: medicalFaculty.id },
      { name: "تغذية", facultyId: medicalFaculty.id }
    ]);

    console.log('✅ Faculties and majors seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding faculties and majors:', error);
  }
  process.exit(0);
}

seedFacultiesAndMajors();
