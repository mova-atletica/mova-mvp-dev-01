const { PrismaClient } = require('@prisma/client');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create SQLite connection to your local database
const sqliteDb = new sqlite3.Database(path.join(__dirname, 'dev.db.backup'));

// Create PostgreSQL connection
const prisma = new PrismaClient();

async function migrateData() {
  try {
    console.log('🚀 Starting data migration from SQLite to PostgreSQL...');
    
    // Migrate Exercises
    console.log('📝 Migrating exercises...');
    const exercises = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM Exercise', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    console.log(`Found ${exercises.length} exercises to migrate`);
    
    for (const exercise of exercises) {
      try {
        await prisma.exercise.create({
          data: {
            id: exercise.id,
            title: exercise.title,
            description: exercise.description,
            image: exercise.image,
            referenceVideoUrl: exercise.referenceVideoUrl,
            referenceKeypointsUrl: exercise.referenceKeypointsUrl,
            tags: exercise.tags,
            equipment: exercise.equipment,
            level: exercise.level,
            muscleGroups: exercise.muscleGroups,
            jointsOfInterest: exercise.jointsOfInterest,
            createdBy: exercise.createdBy,
            dateAdded: new Date(exercise.dateAdded),
            instructions: exercise.instructions,
            authorName: exercise.authorName,
            authorProfileUrl: exercise.authorProfileUrl,
            relatedExercises: exercise.relatedExercises,
            exerciseType: exercise.exerciseType,
            exerciseSubtype: exercise.exerciseSubtype,
            classificationConfidence: exercise.classificationConfidence
          }
        });
        console.log(`✅ Migrated exercise: ${exercise.title}`);
      } catch (error) {
        console.log(`❌ Error migrating exercise ${exercise.title}:`, error.message);
      }
    }
    
    // Migrate RepAnalysis
    console.log('📊 Migrating rep analyses...');
    const repAnalyses = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM RepAnalysis', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    console.log(`Found ${repAnalyses.length} rep analyses to migrate`);
    
    for (const analysis of repAnalyses) {
      try {
        await prisma.repAnalysis.create({
          data: {
            id: analysis.id,
            exerciseId: analysis.exerciseId,
            goldStandardRep: analysis.goldStandardRep,
            repBoundaries: analysis.repBoundaries,
            adminNotes: analysis.adminNotes,
            jointAngleRules: analysis.jointAngleRules,
            validatedByAdmin: analysis.validatedByAdmin === 1,
            createdAt: new Date(analysis.createdAt),
            updatedAt: new Date(analysis.updatedAt)
          }
        });
        console.log(`✅ Migrated rep analysis for exercise: ${analysis.exerciseId}`);
      } catch (error) {
        console.log(`❌ Error migrating rep analysis ${analysis.id}:`, error.message);
      }
    }
    
    // Migrate PoseAnalysis
    console.log('🧘 Migrating pose analyses...');
    const poseAnalyses = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM PoseAnalysis', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    console.log(`Found ${poseAnalyses.length} pose analyses to migrate`);
    
    for (const analysis of poseAnalyses) {
      try {
        await prisma.poseAnalysis.create({
          data: {
            id: analysis.id,
            exerciseId: analysis.exerciseId,
            targetPoses: analysis.targetPoses,
            angleRanges: analysis.angleRanges,
            primaryJoints: analysis.primaryJoints,
            toleranceMultipliers: analysis.toleranceMultipliers,
            feedbackMessages: analysis.feedbackMessages,
            adminNotes: analysis.adminNotes,
            validatedByAdmin: analysis.validatedByAdmin === 1,
            createdAt: new Date(analysis.createdAt),
            updatedAt: new Date(analysis.updatedAt)
          }
        });
        console.log(`✅ Migrated pose analysis for exercise: ${analysis.exerciseId}`);
      } catch (error) {
        console.log(`❌ Error migrating pose analysis ${analysis.id}:`, error.message);
      }
    }
    
    // Migrate CuratedSection
    console.log('📚 Migrating curated sections...');
    const curatedSections = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM CuratedSection', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    console.log(`Found ${curatedSections.length} curated sections to migrate`);
    
    for (const section of curatedSections) {
      try {
        await prisma.curatedSection.create({
          data: {
            id: section.id,
            title: section.title,
            description: section.description,
            order: section.order,
            isActive: section.isActive === 1,
            createdAt: new Date(section.createdAt),
            updatedAt: new Date(section.updatedAt),
            exercises: section.exercises
          }
        });
        console.log(`✅ Migrated curated section: ${section.title}`);
      } catch (error) {
        console.log(`❌ Error migrating curated section ${section.id}:`, error.message);
      }
    }
    
    // Migrate FeaturedContent
    console.log('⭐ Migrating featured content...');
    const featuredContent = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM FeaturedContent', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    console.log(`Found ${featuredContent.length} featured content items to migrate`);
    
    for (const content of featuredContent) {
      try {
        await prisma.featuredContent.create({
          data: {
            id: content.id,
            title: content.title,
            description: content.description,
            heroImage: content.heroImage,
            exerciseId: content.exerciseId,
            ctaText: content.ctaText,
            ctaUrl: content.ctaUrl,
            badgeText: content.badgeText,
            isActive: content.isActive === 1,
            order: content.order,
            createdAt: new Date(content.createdAt),
            updatedAt: new Date(content.updatedAt)
          }
        });
        console.log(`✅ Migrated featured content: ${content.title}`);
      } catch (error) {
        console.log(`❌ Error migrating featured content ${content.id}:`, error.message);
      }
    }
    
    console.log('🎉 Data migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    sqliteDb.close();
    await prisma.$disconnect();
  }
}

migrateData();
