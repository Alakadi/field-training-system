import { db } from '../server/db.ts';
import { levels } from '../shared/schema.ts';

async function seedLevels() {
  try {
    console.log('⏳ Creating levels...');
    
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

    console.log('✅ Levels seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding levels:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

seedLevels();